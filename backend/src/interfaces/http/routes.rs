use axum::{
    routing::{get, post},
    Router,
};

use super::handlers;
use crate::infrastructure::postgres_filtros_repository::PgFiltrosRepository;
use crate::infrastructure::postgres_stats_repository::PgStatsRepository;

#[derive(Clone)]
pub struct AppState {
    pub filtros_repo: PgFiltrosRepository,
    pub stats_repo: PgStatsRepository,
}

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(handlers::health))
        .route(
            "/api/v1/metadata/filtros",
            get(handlers::get_filtros_metadata),
        )
        .route("/api/v1/stats/kpi", post(handlers::get_kpi_stats))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::db;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    /// Estado para tests que no dependen de la base de datos: ambos pools
    /// son "lazy" (no abren conexión), así que construirlo nunca falla ni
    /// requiere Postgres corriendo.
    fn state_without_db() -> AppState {
        let pool = db::build_pool_lazy("postgres://user:pass@localhost/db").unwrap();
        AppState {
            filtros_repo: PgFiltrosRepository::new(pool.clone()),
            stats_repo: PgStatsRepository::new(pool),
        }
    }

    /// Estado con conexión real — para los tests de integración de rutas
    /// que sí necesitan datos reales de Postgres.
    async fn state_with_real_db() -> AppState {
        let config = crate::infrastructure::config::AppConfig::from_env();
        let pool = db::build_pool(&config.database_url)
            .await
            .expect("requiere PostgreSQL corriendo con las credenciales de .env");
        AppState {
            filtros_repo: PgFiltrosRepository::new(pool.clone()),
            stats_repo: PgStatsRepository::new(pool),
        }
    }

    #[tokio::test]
    async fn health_endpoint_returns_200_with_ok_status() {
        let app = build_router(state_without_db());

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/health")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["status"], "ok");
    }

    /// Test de integración (requiere Postgres real vía `.env`): confirma que
    /// la ruta completa — router, handler, caso de uso y repositorio SQLx —
    /// produce el JSON exacto del contrato (`02-api-contracts.md` §4.1),
    /// con las claves en snake_case y datos reales homologados.
    #[tokio::test]
    async fn filtros_metadata_endpoint_returns_contract_shaped_json() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/v1/metadata/filtros")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert!(json["delitos"].is_array());
        assert!(json["armas_medios"].is_array());
        assert!(json["generos"]
            .as_array()
            .unwrap()
            .contains(&serde_json::json!("NO_REPORTADO")));
        assert!(json["grupos_edad"].is_array());
    }

    /// Test de integración: `POST /api/v1/stats/kpi` con un body de filtros
    /// real, confirmando forma del contrato (`02-api-contracts.md` §2.1) y
    /// que `mes_mayor_impacto` tiene el shape "YYYY-MM" esperado por HU-3.01.
    #[tokio::test]
    async fn kpi_endpoint_returns_contract_shaped_json() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/api/v1/stats/kpi")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(
                        serde_json::json!({ "anio_inicio": 2023, "anio_fin": 2023 }).to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert!(json["total_delitos"].as_i64().unwrap() > 0);
        assert!(json["variacion_porcentual"].is_number());
        assert!(json["delito_mas_comun"].is_string());
        assert_eq!(json["mes_mayor_impacto"].as_str().unwrap().len(), 7);
        assert!(json["distribucion_genero"]["NO_REPORTADO"].is_number());
    }

    #[tokio::test]
    async fn kpi_endpoint_accepts_empty_body_meaning_no_filters() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/api/v1/stats/kpi")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from("{}"))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);
    }
}
