use std::sync::Arc;

use sqlx::PgPool;
use tokio::sync::OnceCell;

use crate::application::ports::{GeometryRepository, RepositoryError};
use crate::domain::granularidad::Granularidad;

/// Tolerancia de `ST_SimplifyPreserveTopology` en grados (EPSG:4326,
/// ~111m por 0.001°) — RN-09 exige geometría "simplificada y cuantizada"
/// para el mapa, y en la práctica es obligatorio: sin simplificar, el
/// `jsonb_agg` de los 1,122 municipios a resolución de levantamiento
/// original supera el límite de Postgres de 256MB por valor jsonb (ver
/// `docs/architecture/01-arquitectura.md`). El valor se eligió por prueba y
/// error — visualmente indistinguible a escala nacional/departamental,
/// suficiente para bajar el payload por debajo del límite.
const TOLERANCIA_SIMPLIFICACION: f64 = 0.001;

#[derive(Clone)]
pub struct PgGeometryRepository {
    pool: PgPool,
    /// Caché en memoria (Hito 5.2): `municipios_geo` no cambia en runtime,
    /// pero recomputar `ST_Union`+`ST_SimplifyPreserveTopology` sobre 1,122
    /// polígonos en cada request cuesta ~6.3s medido contra datos reales
    /// (aparte del `Cache-Control` HTTP, que solo ahorra este costo al
    /// *cliente*, no al servidor en cada cache-miss/primer visitante). Una
    /// celda por granularidad en vez de un `HashMap<Granularidad, _>` —
    /// solo hay 2 valores posibles, no vale la pena el bound `Hash + Eq`.
    municipio_cache: Arc<OnceCell<serde_json::Value>>,
    departamento_cache: Arc<OnceCell<serde_json::Value>>,
}

impl PgGeometryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            municipio_cache: Arc::new(OnceCell::new()),
            departamento_cache: Arc::new(OnceCell::new()),
        }
    }

    async fn fetch_from_db(
        &self,
        granularidad: Granularidad,
    ) -> Result<serde_json::Value, RepositoryError> {
        // PostGIS arma el FeatureCollection completo (jsonb_build_object +
        // jsonb_agg) — Rust solo recibe el JSON ya ensamblado y lo pasa tal
        // cual (Hito 4.1: "minimizando el procesamiento en Rust"). Por eso
        // no hay un struct `Feature`/`FeatureCollection` tipado: reserializar
        // algo que Postgres ya construyó sería trabajo puro sin beneficio.
        let query = match granularidad {
            Granularidad::Municipio => format!(
                r#"
                SELECT jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', jsonb_agg(
                        jsonb_build_object(
                            'type', 'Feature',
                            'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, {TOLERANCIA_SIMPLIFICACION}))::jsonb,
                            'properties', jsonb_build_object(
                                'codigo_dane', codigo_dane,
                                'nombre_region', municipio
                            )
                        )
                    )
                ) AS feature_collection
                FROM municipios_geo
                "#
            ),
            Granularidad::Departamento => format!(
                r#"
                WITH por_departamento AS (
                    SELECT
                        dpto_codigo AS codigo_dane,
                        departamento AS nombre_region,
                        ST_Union(geom) AS geom
                    FROM municipios_geo
                    GROUP BY dpto_codigo, departamento
                )
                SELECT jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', jsonb_agg(
                        jsonb_build_object(
                            'type', 'Feature',
                            'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, {TOLERANCIA_SIMPLIFICACION}))::jsonb,
                            'properties', jsonb_build_object(
                                'codigo_dane', codigo_dane,
                                'nombre_region', nombre_region
                            )
                        )
                    )
                ) AS feature_collection
                FROM por_departamento
                "#
            ),
        };

        sqlx::query_scalar::<_, serde_json::Value>(&query)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| RepositoryError(e.to_string()))
    }
}

impl GeometryRepository for PgGeometryRepository {
    async fn get_geometry(
        &self,
        granularidad: Granularidad,
    ) -> Result<serde_json::Value, RepositoryError> {
        let cache = match granularidad {
            Granularidad::Municipio => &self.municipio_cache,
            Granularidad::Departamento => &self.departamento_cache,
        };

        cache
            .get_or_try_init(|| self.fetch_from_db(granularidad))
            .await
            .cloned()
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use crate::infrastructure::{config::AppConfig, db};

    async fn real_repo() -> PgGeometryRepository {
        let config = AppConfig::from_env();
        let pool = db::build_pool(&config.database_url)
            .await
            .expect("requiere PostgreSQL corriendo con las credenciales de .env");
        PgGeometryRepository::new(pool)
    }

    #[tokio::test]
    async fn municipio_geometry_has_one_feature_per_municipio() {
        let repo = real_repo().await;

        let geojson = repo.get_geometry(Granularidad::Municipio).await.unwrap();

        assert_eq!(geojson["type"], "FeatureCollection");
        let features = geojson["features"].as_array().unwrap();
        assert_eq!(features.len(), 1122);
        assert_eq!(features[0]["type"], "Feature");
        assert!(features[0]["geometry"]["type"].is_string());
        assert!(features[0]["properties"]["codigo_dane"].is_number());
        assert!(features[0]["properties"]["nombre_region"].is_string());
    }

    #[tokio::test]
    async fn departamento_geometry_dissolves_into_33_regions() {
        let repo = real_repo().await;

        let geojson = repo
            .get_geometry(Granularidad::Departamento)
            .await
            .unwrap();

        let features = geojson["features"].as_array().unwrap();
        assert_eq!(features.len(), 33);
    }

    #[tokio::test]
    async fn bogota_feature_has_expected_codigo_and_nombre() {
        let repo = real_repo().await;

        let geojson = repo.get_geometry(Granularidad::Municipio).await.unwrap();
        let features = geojson["features"].as_array().unwrap();

        let bogota = features
            .iter()
            .find(|f| f["properties"]["codigo_dane"] == 11001)
            .expect("Bogotá debe estar en la geometría municipal");

        assert_eq!(bogota["properties"]["nombre_region"], "BOGOTÁ, D.C.");
    }

    #[tokio::test]
    async fn second_call_is_served_from_cache_shared_across_clones() {
        let repo = real_repo().await;

        let first = repo.get_geometry(Granularidad::Municipio).await.unwrap();

        let clone = repo.clone();
        let start = std::time::Instant::now();
        let second = clone.get_geometry(Granularidad::Municipio).await.unwrap();
        let elapsed = start.elapsed();

        assert_eq!(first, second);
        // La consulta real mide ~6.3s (ST_Union + ST_SimplifyPreserveTopology
        // sobre 1,122 polígonos); un cache hit debe ser casi instantáneo.
        assert!(
            elapsed.as_millis() < 100,
            "se esperaba un cache hit (<100ms), tardó {elapsed:?} — ¿se está recalculando?"
        );
    }

    #[tokio::test]
    async fn municipio_and_departamento_caches_are_independent() {
        let repo = real_repo().await;

        let municipio = repo.get_geometry(Granularidad::Municipio).await.unwrap();
        let departamento = repo
            .get_geometry(Granularidad::Departamento)
            .await
            .unwrap();

        assert_ne!(
            municipio["features"].as_array().unwrap().len(),
            departamento["features"].as_array().unwrap().len()
        );
    }
}
