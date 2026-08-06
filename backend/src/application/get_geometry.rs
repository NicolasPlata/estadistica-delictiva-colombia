use crate::application::ports::{GeometryRepository, RepositoryError};
use crate::domain::granularidad::Granularidad;

/// Caso de uso de `GET /api/v1/map/geometry/{granularidad}`. Passthrough
/// deliberado — igual que `get_filtros`, el punto es mantener
/// `interfaces/http` desacoplado de `infrastructure`, no transformar datos.
pub async fn execute<R: GeometryRepository>(
    repo: &R,
    granularidad: Granularidad,
) -> Result<serde_json::Value, RepositoryError> {
    repo.get_geometry(granularidad).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::{GeometryRepository, RepositoryError};
    use crate::domain::granularidad::Granularidad;

    struct FakeGeometryRepository {
        response: Result<serde_json::Value, String>,
    }

    impl GeometryRepository for FakeGeometryRepository {
        async fn get_geometry(
            &self,
            _granularidad: Granularidad,
        ) -> Result<serde_json::Value, RepositoryError> {
            self.response
                .clone()
                .map_err(RepositoryError)
        }
    }

    #[tokio::test]
    async fn returns_geojson_from_repository_unchanged() {
        let geojson = serde_json::json!({ "type": "FeatureCollection", "features": [] });
        let repo = FakeGeometryRepository {
            response: Ok(geojson.clone()),
        };

        let result = execute(&repo, Granularidad::Municipio).await.unwrap();

        assert_eq!(result, geojson);
    }

    #[tokio::test]
    async fn propagates_repository_errors() {
        let repo = FakeGeometryRepository {
            response: Err("conexión perdida".to_string()),
        };

        let result = execute(&repo, Granularidad::Departamento).await;

        assert!(result.is_err());
    }
}
