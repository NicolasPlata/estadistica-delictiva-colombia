use crate::application::ports::{RepositoryError, StatsRepository};
use crate::domain::filters::{GlobalFilters, ANIO_MAX, ANIO_MIN};
use crate::domain::granularidad::Granularidad;
use crate::domain::map_stats::MapStats;
use crate::domain::metrica::Metrica;

/// Caso de uso de `POST /api/v1/map/stats` (HU-1.02/1.03/1.04, y Fase 6
/// para `Metrica::Tasa`). Para `Absoluta` es un passthrough que solo
/// empaqueta el resultado del repositorio (la decisión de qué columna
/// agrupar vive en `infrastructure`, documentada en
/// `StatsRepository::map_stats`). Para `Tasa`, la fórmula de RN-12
/// (`reglas-negocio.md`) vive aquí — a propósito, no en SQL — para que sea
/// código Rust explícito y testeable sin una base de datos real (ver los
/// tests de este módulo).
pub async fn execute<R: StatsRepository>(
    repo: &R,
    filters: &GlobalFilters,
    granularidad: Granularidad,
    metrica: Metrica,
) -> Result<MapStats, RepositoryError> {
    let cantidades = repo.map_stats(filters, granularidad).await?;

    let data = match metrica {
        Metrica::Absoluta => cantidades.into_iter().map(|(k, v)| (k, v as f64)).collect(),
        Metrica::Tasa => {
            let anio_inicio = filters.anio_inicio.unwrap_or(ANIO_MIN);
            let anio_fin = filters.anio_fin.unwrap_or(ANIO_MAX);
            let poblacion = repo
                .poblacion_promedio(anio_inicio, anio_fin, granularidad)
                .await?;

            cantidades
                .into_iter()
                .filter_map(|(codigo, cantidad)| {
                    // RN-12: sin población conocida (o población = 0, ej.
                    // un codigo_dane sin fila en poblacion_municipal) es
                    // "sin dato" — se omite la región, nunca se divide por
                    // cero ni se emite Infinity/NaN.
                    let habitantes = poblacion.get(&codigo).copied().unwrap_or(0.0);
                    if habitantes <= 0.0 {
                        None
                    } else {
                        Some((codigo, cantidad as f64 / habitantes * 100_000.0))
                    }
                })
                .collect()
        }
    };

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
            // "5" tiene cantidad pero deliberadamente NO tiene entrada en
            // poblacion_promedio (abajo) — simula una región con delitos
            // pero sin población conocida (RN-12), para probar que se
            // excluye del resultado en modo Tasa sin reventar la división.
            Ok(HashMap::from([
                ("11".to_string(), 240832),
                ("5".to_string(), 100),
            ]))
        }
        async fn poblacion_promedio(
            &self,
            _anio_inicio: i32,
            _anio_fin: i32,
            _granularidad: Granularidad,
        ) -> Result<HashMap<String, f64>, RepositoryError> {
            Ok(HashMap::from([("11".to_string(), 8_000_000.0)]))
        }
    }

    #[tokio::test]
    async fn wraps_repository_data_with_the_requested_granularidad() {
        let repo = FakeStatsRepository;

        let result = execute(
            &repo,
            &GlobalFilters::default(),
            Granularidad::Departamento,
            Metrica::Absoluta,
        )
        .await
        .unwrap();

        assert_eq!(result.granularidad, Granularidad::Departamento);
        assert_eq!(result.data.get("11"), Some(&240832.0));
    }

    #[tokio::test]
    async fn absoluta_returns_every_region_with_data_regardless_of_poblacion() {
        let repo = FakeStatsRepository;

        let result = execute(
            &repo,
            &GlobalFilters::default(),
            Granularidad::Departamento,
            Metrica::Absoluta,
        )
        .await
        .unwrap();

        // "5" no tiene población conocida, pero en modo Absoluta eso es
        // irrelevante — nunca se llama a poblacion_promedio.
        assert_eq!(result.data.get("5"), Some(&100.0));
    }

    #[tokio::test]
    async fn tasa_divides_cantidad_by_average_poblacion_times_100k() {
        let repo = FakeStatsRepository;

        let result = execute(
            &repo,
            &GlobalFilters::default(),
            Granularidad::Departamento,
            Metrica::Tasa,
        )
        .await
        .unwrap();

        // 240.832 / 8.000.000 × 100.000 = 3.010,4
        assert_eq!(result.data.get("11"), Some(&3010.4));
    }

    #[tokio::test]
    async fn tasa_omits_regions_without_known_poblacion() {
        let repo = FakeStatsRepository;

        let result = execute(
            &repo,
            &GlobalFilters::default(),
            Granularidad::Departamento,
            Metrica::Tasa,
        )
        .await
        .unwrap();

        // "5" tiene cantidad pero ninguna fila de población (RN-12): no
        // aparece en el resultado, nunca se divide por cero.
        assert_eq!(result.data.get("5"), None);
    }

    #[tokio::test]
    async fn tasa_defaults_the_year_range_to_anio_min_max_when_filters_are_unbounded() {
        // Prueba de contrato del use case, no de la query real: confirma
        // que un GlobalFilters sin anio_inicio/anio_fin no revienta y sigue
        // calculando la tasa (el fake ignora los años recibidos, pero esto
        // documenta y fija el comportamiento esperado — el test de
        // integración de infrastructure confirma el valor real contra
        // Postgres).
        let repo = FakeStatsRepository;

        let result = execute(
            &repo,
            &GlobalFilters::default(),
            Granularidad::Departamento,
            Metrica::Tasa,
        )
        .await
        .unwrap();

        assert!(result.data.contains_key("11"));
    }
}
