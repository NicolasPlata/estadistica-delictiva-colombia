use axum::{
    routing::{get, post},
    Router,
};

use super::handlers;
use crate::infrastructure::postgres_filtros_repository::PgFiltrosRepository;
use crate::infrastructure::postgres_geometry_repository::PgGeometryRepository;
use crate::infrastructure::postgres_stats_repository::PgStatsRepository;

#[derive(Clone)]
pub struct AppState {
    pub filtros_repo: PgFiltrosRepository,
    pub stats_repo: PgStatsRepository,
    pub geometry_repo: PgGeometryRepository,
}

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(handlers::health))
        .route(
            "/api/v1/metadata/filtros",
            get(handlers::get_filtros_metadata),
        )
        .route("/api/v1/stats/kpi", post(handlers::get_kpi_stats))
        .route(
            "/api/v1/stats/evolution",
            post(handlers::get_evolution_stats),
        )
        .route(
            "/api/v1/map/geometry/{granularidad}",
            get(handlers::get_map_geometry),
        )
        .route("/api/v1/map/stats", post(handlers::get_map_stats))
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
            stats_repo: PgStatsRepository::new(pool.clone()),
            geometry_repo: PgGeometryRepository::new(pool),
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
            stats_repo: PgStatsRepository::new(pool.clone()),
            geometry_repo: PgGeometryRepository::new(pool),
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

    /// Test de integración: `POST /api/v1/stats/evolution` con agrupación
    /// ANUAL sobre Bogotá, confirmando la forma exacta del contrato
    /// (`02-api-contracts.md` §2.2) — `region_label` resuelto por nombre,
    /// no por código, y una serie con `periodo`/`cantidad`.
    #[tokio::test]
    async fn evolution_endpoint_returns_contract_shaped_json_for_a_municipio() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/api/v1/stats/evolution")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(
                        serde_json::json!({
                            "filters": { "municipio_id": 11001, "anio_inicio": 2020, "anio_fin": 2022 },
                            "agrupacion": "ANUAL"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["region_label"], "BOGOTÁ, D.C.");
        let series = json["series"].as_array().unwrap();
        assert_eq!(series.len(), 3);
        assert!(series[0]["periodo"].is_string());
        assert!(series[0]["cantidad"].is_number());
    }

    #[tokio::test]
    async fn evolution_endpoint_defaults_to_nacional_without_geographic_filter() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/api/v1/stats/evolution")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(
                        serde_json::json!({ "filters": {}, "agrupacion": "MENSUAL" }).to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["region_label"], "Nacional");
    }

    /// Test de integración: confirma la forma del GeoJSON (`02-api-contracts.md`
    /// §3.1) y que las cabeceras de cacheo (Hito 4.1, RNF-08) están presentes.
    #[tokio::test]
    async fn map_geometry_endpoint_returns_geojson_with_cache_headers() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/v1/map/geometry/MUNICIPIO")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);
        assert_eq!(
            response.headers().get("cache-control").unwrap(),
            "public, max-age=86400"
        );
        assert!(response.headers().get("etag").is_some());

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["type"], "FeatureCollection");
        assert_eq!(json["features"].as_array().unwrap().len(), 1122);
    }

    #[tokio::test]
    async fn map_geometry_endpoint_departamento_has_33_features() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/v1/map/geometry/DEPARTAMENTO")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["features"].as_array().unwrap().len(), 33);
    }

    /// Test de integración: `POST /api/v1/map/stats` — confirma la forma
    /// del contrato (`02-api-contracts.md` §3.2) y que las claves del `data`
    /// coinciden en formato con la propiedad `codigo_dane` de la geometría
    /// departamental (ambas sin ceros a la izquierda).
    #[tokio::test]
    async fn map_stats_endpoint_returns_contract_shaped_json() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/api/v1/map/stats")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(
                        serde_json::json!({
                            "filters": { "anio_inicio": 2023, "anio_fin": 2023 },
                            "granularidad": "DEPARTAMENTO"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["granularidad"], "DEPARTAMENTO");
        // Bogotá, D.C.: dpto_codigo=11, sin ceros a la izquierda. f64 (no
        // as_i64): MapStats.data es f64 desde la Fase 6 para poder
        // representar tasas decimales — ver domain/map_stats.rs.
        assert!(json["data"]["11"].as_f64().unwrap() > 0.0);
    }

    /// Test de integración: `POST /api/v1/map/stats` con `metrica: "TASA"`
    /// (Fase 6, RN-12) — confirma que el valor es la tasa por 100.000
    /// habitantes, no el conteo absoluto, para una región real.
    #[tokio::test]
    async fn map_stats_endpoint_with_metrica_tasa_returns_a_rate_not_a_raw_count() {
        let app = build_router(state_with_real_db().await);

        let absoluta_response = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/api/v1/map/stats")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(
                        serde_json::json!({
                            "filters": { "anio_inicio": 2023, "anio_fin": 2023 },
                            "granularidad": "DEPARTAMENTO",
                            "metrica": "ABSOLUTA"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        let absoluta_body = absoluta_response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes();
        let absoluta_json: serde_json::Value = serde_json::from_slice(&absoluta_body).unwrap();
        let cantidad_bogota = absoluta_json["data"]["11"].as_f64().unwrap();

        let tasa_response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/api/v1/map/stats")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(
                        serde_json::json!({
                            "filters": { "anio_inicio": 2023, "anio_fin": 2023 },
                            "granularidad": "DEPARTAMENTO",
                            "metrica": "TASA"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(tasa_response.status(), axum::http::StatusCode::OK);
        let tasa_body = tasa_response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes();
        let tasa_json: serde_json::Value = serde_json::from_slice(&tasa_body).unwrap();
        let tasa_bogota = tasa_json["data"]["11"].as_f64().unwrap();

        // La tasa (delitos por 100.000 hab.) es un número muy distinto del
        // conteo absoluto (Bogotá tiene millones de habitantes) — esta
        // aserción falla si `metrica` no tuvo ningún efecto real.
        assert!(tasa_bogota > 0.0);
        assert!(tasa_bogota < cantidad_bogota);
    }

    #[tokio::test]
    async fn map_stats_endpoint_defaults_metrica_to_absoluta_when_omitted() {
        let app = build_router(state_with_real_db().await);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/api/v1/map/stats")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(
                        serde_json::json!({
                            "filters": { "anio_inicio": 2023, "anio_fin": 2023 },
                            "granularidad": "DEPARTAMENTO"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        // Sin metrica en el body, debe comportarse como ABSOLUTA (conteos
        // en el orden de cientos de miles, no una tasa de 3 dígitos).
        assert!(json["data"]["11"].as_f64().unwrap() > 1000.0);
    }
}
