use crate::application::ports::{RepositoryError, StatsRepository};
use crate::domain::filters::GlobalFilters;
use crate::domain::granularidad::Granularidad;
use crate::domain::map_stats::MapStats;

/// Caso de uso de `POST /api/v1/map/stats` (HU-1.02/1.03/1.04). Passthrough
/// que solo empaqueta el resultado del repositorio junto a la granularidad
/// solicitada — la decisión de negocio real (qué columna agrupar) vive en
/// `infrastructure`, documentada en `StatsRepository::map_stats`.
pub async fn execute<R: StatsRepository>(
    repo: &R,
    filters: &GlobalFilters,
    granularidad: Granularidad,
) -> Result<MapStats, RepositoryError> {
    let data = repo.map_stats(filters, granularidad).await?;
    Ok(MapStats { granularidad, data })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::{RepositoryError, StatsRepository};
    use crate::domain::evolution::{Agrupacion, EvolutionPoint};
    use crate::domain::filters::GlobalFilters;
    use crate::domain::granularidad::Granularidad;
    use std::collections::HashMap;

    struct FakeStatsRepository;

    impl StatsRepository for FakeStatsRepository {
        async fn total_delitos(&self, _filters: &GlobalFilters) -> Result<i64, RepositoryError> {
            unimplemented!("no usado por los tests de get_map_stats")
        }
        async fn delito_mas_comun(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<Option<String>, RepositoryError> {
            unimplemented!("no usado por los tests de get_map_stats")
        }
        async fn mes_mayor_impacto(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<Option<String>, RepositoryError> {
            unimplemented!("no usado por los tests de get_map_stats")
        }
        async fn distribucion_genero(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            unimplemented!("no usado por los tests de get_map_stats")
        }
        async fn municipio_nombre(
            &self,
            _codigo_dane: i32,
        ) -> Result<Option<String>, RepositoryError> {
            unimplemented!("no usado por los tests de get_map_stats")
        }
        async fn departamento_nombre(
            &self,
            _dpto_codigo: i32,
        ) -> Result<Option<String>, RepositoryError> {
            unimplemented!("no usado por los tests de get_map_stats")
        }
        async fn evolution_series(
            &self,
            _filters: &GlobalFilters,
            _agrupacion: Agrupacion,
        ) -> Result<Vec<EvolutionPoint>, RepositoryError> {
            unimplemented!("no usado por los tests de get_map_stats")
        }
        async fn map_stats(
            &self,
            _filters: &GlobalFilters,
            _granularidad: Granularidad,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            Ok(HashMap::from([("11".to_string(), 240832)]))
        }
    }

    #[tokio::test]
    async fn wraps_repository_data_with_the_requested_granularidad() {
        let repo = FakeStatsRepository;

        let result = execute(&repo, &GlobalFilters::default(), Granularidad::Departamento)
            .await
            .unwrap();

        assert_eq!(result.granularidad, Granularidad::Departamento);
        assert_eq!(result.data.get("11"), Some(&240832));
    }
}
