use axum::{routing::get, Router};

use super::handlers;
use crate::infrastructure::postgres_filtros_repository::PgFiltrosRepository;

#[derive(Clone)]
pub struct AppState {
    pub filtros_repo: PgFiltrosRepository,
}

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(handlers::health))
        .route(
            "/api/v1/metadata/filtros",
            get(handlers::get_filtros_metadata),
        )
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::db;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    /// Estado para tests que no dependen de la base de datos: el pool es
    /// "lazy" (no abre conexión), así que construirlo nunca falla ni
    /// requiere Postgres corriendo.
    fn state_without_db() -> AppState {
        let pool = db::build_pool_lazy("postgres://user:pass@localhost/db").unwrap();
        AppState {
            filtros_repo: PgFiltrosRepository::new(pool),
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
        let config = crate::infrastructure::config::AppConfig::from_env();
        let pool = db::build_pool(&config.database_url)
            .await
            .expect("requiere PostgreSQL corriendo con las credenciales de .env");
        let app = build_router(AppState {
            filtros_repo: PgFiltrosRepository::new(pool),
        });

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
}
