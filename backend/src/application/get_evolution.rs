use crate::application::ports::{RepositoryError, StatsRepository};
use crate::domain::evolution::{Agrupacion, Evolution};
use crate::domain::filters::GlobalFilters;

/// Caso de uso de `POST /api/v1/stats/evolution` (HU-3.02/HU-3.03).
pub async fn execute<R: StatsRepository>(
    repo: &R,
    filters: &GlobalFilters,
    agrupacion: Agrupacion,
) -> Result<Evolution, RepositoryError> {
    let region_label = resolve_region_label(repo, filters).await?;
    let series = repo.evolution_series(filters, agrupacion).await?;

    Ok(Evolution {
        region_label,
        series,
    })
}

/// Precedencia explícita (HU-3.03): municipio > departamento > "Nacional".
/// Si el filtro apunta a un código que no existe en la geometría, se usa un
/// placeholder en vez de fallar — la evolución sigue siendo válida aunque
/// el nombre de la región no se haya podido resolver.
async fn resolve_region_label<R: StatsRepository>(
    repo: &R,
    filters: &GlobalFilters,
) -> Result<String, RepositoryError> {
    if let Some(municipio_id) = filters.municipio_id {
        return Ok(repo
            .municipio_nombre(municipio_id)
            .await?
            .unwrap_or_else(|| "Región desconocida".to_string()));
    }

    if let Some(departamento_id) = filters.departamento_id {
        return Ok(repo
            .departamento_nombre(departamento_id)
            .await?
            .unwrap_or_else(|| "Región desconocida".to_string()));
    }

    Ok("Nacional".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::{RepositoryError, StatsRepository};
    use crate::domain::evolution::{Agrupacion, EvolutionPoint};
    use crate::domain::filters::GlobalFilters;
    use std::collections::HashMap;

    struct FakeStatsRepository {
        municipio_nombre: Option<&'static str>,
        departamento_nombre: Option<&'static str>,
    }

    impl StatsRepository for FakeStatsRepository {
        async fn total_delitos(&self, _filters: &GlobalFilters) -> Result<i64, RepositoryError> {
            Ok(0)
        }
        async fn delito_mas_comun(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<Option<String>, RepositoryError> {
            Ok(None)
        }
        async fn mes_mayor_impacto(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<Option<String>, RepositoryError> {
            Ok(None)
        }
        async fn distribucion_genero(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            Ok(HashMap::new())
        }
        async fn municipio_nombre(
            &self,
            _codigo_dane: i32,
        ) -> Result<Option<String>, RepositoryError> {
            Ok(self.municipio_nombre.map(|s| s.to_string()))
        }
        async fn departamento_nombre(
            &self,
            _dpto_codigo: i32,
        ) -> Result<Option<String>, RepositoryError> {
            Ok(self.departamento_nombre.map(|s| s.to_string()))
        }
        async fn evolution_series(
            &self,
            _filters: &GlobalFilters,
            _agrupacion: Agrupacion,
        ) -> Result<Vec<EvolutionPoint>, RepositoryError> {
            Ok(vec![EvolutionPoint {
                periodo: "2020".to_string(),
                cantidad: 100,
            }])
        }
        async fn map_stats(
            &self,
            _filters: &GlobalFilters,
            _granularidad: crate::domain::granularidad::Granularidad,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            unimplemented!("no usado por los tests de get_evolution")
        }
    }

    #[tokio::test]
    async fn labels_region_by_municipio_when_municipio_id_is_set() {
        let repo = FakeStatsRepository {
            municipio_nombre: Some("BOGOTÁ, D.C."),
            departamento_nombre: Some("CUNDINAMARCA"),
        };
        let filters = GlobalFilters {
            municipio_id: Some(11001),
            departamento_id: Some(11), // presente también — municipio debe ganar
            ..Default::default()
        };

        let evolution = execute(&repo, &filters, Agrupacion::Anual).await.unwrap();

        assert_eq!(evolution.region_label, "BOGOTÁ, D.C.");
    }

    #[tokio::test]
    async fn labels_region_by_departamento_when_only_departamento_id_is_set() {
        let repo = FakeStatsRepository {
            municipio_nombre: None,
            departamento_nombre: Some("ANTIOQUIA"),
        };
        let filters = GlobalFilters {
            departamento_id: Some(5),
            ..Default::default()
        };

        let evolution = execute(&repo, &filters, Agrupacion::Anual).await.unwrap();

        assert_eq!(evolution.region_label, "ANTIOQUIA");
    }

    #[tokio::test]
    async fn labels_region_as_nacional_when_no_geographic_filter() {
        let repo = FakeStatsRepository {
            municipio_nombre: None,
            departamento_nombre: None,
        };

        let evolution = execute(&repo, &GlobalFilters::default(), Agrupacion::Anual)
            .await
            .unwrap();

        assert_eq!(evolution.region_label, "Nacional");
    }

    #[tokio::test]
    async fn falls_back_to_placeholder_when_municipio_id_matches_nothing() {
        let repo = FakeStatsRepository {
            municipio_nombre: None,
            departamento_nombre: None,
        };
        let filters = GlobalFilters {
            municipio_id: Some(99999),
            ..Default::default()
        };

        let evolution = execute(&repo, &filters, Agrupacion::Anual).await.unwrap();

        assert_eq!(evolution.region_label, "Región desconocida");
    }

    #[tokio::test]
    async fn returns_series_from_repository() {
        let repo = FakeStatsRepository {
            municipio_nombre: None,
            departamento_nombre: None,
        };

        let evolution = execute(&repo, &GlobalFilters::default(), Agrupacion::Mensual)
            .await
            .unwrap();

        assert_eq!(evolution.series.len(), 1);
        assert_eq!(evolution.series[0].cantidad, 100);
    }
}
