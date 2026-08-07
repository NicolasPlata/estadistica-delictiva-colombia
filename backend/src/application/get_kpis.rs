use crate::application::ports::{RepositoryError, StatsRepository};
use crate::domain::filters::{GlobalFilters, ANIO_MAX, ANIO_MIN};
use crate::domain::kpis::Kpis;

/// Caso de uso de `POST /api/v1/stats/kpi` (HU-3.01). A diferencia de
/// `get_filtros` (un passthrough puro), aquí SÍ hay lógica de negocio real:
/// combinar el total del periodo actual con el del periodo inmediatamente
/// anterior para calcular `variacion_porcentual` — por eso `StatsRepository`
/// expone primitivas (`total_delitos`, etc.) en vez de un único método que
/// ya devuelva el KPI armado.
pub async fn execute<R: StatsRepository>(
    repo: &R,
    filters: &GlobalFilters,
) -> Result<Kpis, RepositoryError> {
    let anterior = periodo_anterior(filters);

    let total_delitos = repo.total_delitos(filters).await?;
    // Si el periodo anterior cae fuera del rango real del dataset (RN-06)
    // no hay nada que consultar ni comparar — pedirlo igual devolvería 0
    // por ausencia de filas, indistinguible de "hubo un periodo real con
    // cero delitos", que es exactamente la ambigüedad que se quiere evitar
    // (reportado por el usuario, 2026-08-07: "todos los años" o solo el
    // primer año mostraban +100% sin sentido).
    let variacion_porcentual = if periodo_anterior_existe_en_dataset(&anterior) {
        let total_anterior = repo.total_delitos(&anterior).await?;
        Some(calcular_variacion_porcentual(total_delitos, total_anterior))
    } else {
        None
    };

    let delito_mas_comun = repo.delito_mas_comun(filters).await?;
    let mes_mayor_impacto = repo.mes_mayor_impacto(filters).await?;
    let distribucion_genero = repo.distribucion_genero(filters).await?;

    Ok(Kpis {
        total_delitos,
        variacion_porcentual,
        delito_mas_comun,
        mes_mayor_impacto,
        distribucion_genero,
    })
}

/// % de cambio entre el total actual y el del periodo anterior.
/// Convención cuando `anterior == 0` (sin división por cero posible):
/// sin cambio si `actual` también es 0, +100% si aparece algo desde cero
/// (documentado explícitamente porque no hay una única respuesta "correcta"
/// matemáticamente — es una decisión de producto, no un cálculo).
fn calcular_variacion_porcentual(actual: i64, anterior: i64) -> f64 {
    if anterior == 0 {
        return if actual == 0 { 0.0 } else { 100.0 };
    }
    ((actual - anterior) as f64 / anterior as f64) * 100.0
}

/// Desplaza el rango de años hacia atrás la misma longitud, para comparar
/// "manzanas con manzanas". Si el usuario no acotó años, usa el rango
/// completo del dataset (RN-06) como periodo "actual" implícito.
fn periodo_anterior(filters: &GlobalFilters) -> GlobalFilters {
    let anio_inicio = filters.anio_inicio.unwrap_or(ANIO_MIN);
    let anio_fin = filters.anio_fin.unwrap_or(ANIO_MAX);
    let longitud = anio_fin - anio_inicio + 1;

    GlobalFilters {
        anio_inicio: Some(anio_inicio - longitud),
        anio_fin: Some(anio_inicio - 1),
        ..filters.clone()
    }
}

/// `false` cuando el "periodo anterior" calculado termina antes del primer
/// año con datos reales (`ANIO_MIN`, RN-06) — el dataset simplemente no
/// llega tan atrás, así que no existe ningún periodo real que comparar
/// (distinto de "existe el periodo, pero tuvo cero delitos").
fn periodo_anterior_existe_en_dataset(anterior: &GlobalFilters) -> bool {
    anterior.anio_fin.is_some_and(|fin| fin >= ANIO_MIN)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::{RepositoryError, StatsRepository};
    use crate::domain::filters::GlobalFilters;
    use std::collections::HashMap;

    // ── calcular_variacion_porcentual ───────────────────────────────────

    #[test]
    fn variacion_porcentual_increase() {
        assert_eq!(calcular_variacion_porcentual(150, 100), 50.0);
    }

    #[test]
    fn variacion_porcentual_decrease() {
        assert_eq!(calcular_variacion_porcentual(50, 100), -50.0);
    }

    #[test]
    fn variacion_porcentual_no_change() {
        assert_eq!(calcular_variacion_porcentual(100, 100), 0.0);
    }

    #[test]
    fn variacion_porcentual_zero_baseline_and_zero_actual_is_no_change() {
        assert_eq!(calcular_variacion_porcentual(0, 0), 0.0);
    }

    #[test]
    fn variacion_porcentual_zero_baseline_with_actual_is_100_percent() {
        // Sin datos en el periodo anterior no hay una base matemática real
        // para "% de cambio" (sería división por cero) — se documenta la
        // convención: aparecer desde cero se reporta como +100%.
        assert_eq!(calcular_variacion_porcentual(50, 0), 100.0);
    }

    // ── periodo_anterior ─────────────────────────────────────────────────

    #[test]
    fn periodo_anterior_shifts_same_length_range_backwards() {
        let filters = GlobalFilters {
            anio_inicio: Some(2023),
            anio_fin: Some(2025),
            ..Default::default()
        };

        let anterior = periodo_anterior(&filters);

        assert_eq!(anterior.anio_inicio, Some(2020));
        assert_eq!(anterior.anio_fin, Some(2022));
    }

    #[test]
    fn periodo_anterior_defaults_missing_bounds_to_dataset_range() {
        let filters = GlobalFilters::default();

        let anterior = periodo_anterior(&filters);

        // Rango completo (2020-2025, 6 años) recorrido hacia atrás.
        assert_eq!(anterior.anio_inicio, Some(2014));
        assert_eq!(anterior.anio_fin, Some(2019));
    }

    #[test]
    fn periodo_anterior_preserves_other_filters() {
        let filters = GlobalFilters {
            anio_inicio: Some(2023),
            anio_fin: Some(2024),
            genero: Some("FEMENINO".to_string()),
            ..Default::default()
        };

        let anterior = periodo_anterior(&filters);

        assert_eq!(anterior.genero, Some("FEMENINO".to_string()));
    }

    // ── periodo_anterior_existe_en_dataset ──────────────────────────────

    #[test]
    fn periodo_anterior_no_existe_cuando_termina_antes_de_anio_min() {
        // "Todos los años" (sin acotar) o solo el primer año del dataset
        // (2020) desplazan el periodo anterior a 2019 o antes — el dataset
        // no llega tan atrás (RN-06).
        let filters = GlobalFilters::default();
        let anterior = periodo_anterior(&filters);

        assert!(!periodo_anterior_existe_en_dataset(&anterior));
    }

    #[test]
    fn periodo_anterior_existe_cuando_el_rango_previo_esta_dentro_del_dataset() {
        let filters = GlobalFilters { anio_inicio: Some(2023), anio_fin: Some(2025), ..Default::default() };
        let anterior = periodo_anterior(&filters);

        assert!(periodo_anterior_existe_en_dataset(&anterior));
    }

    // ── execute (con repositorio falso) ─────────────────────────────────

    struct FakeStatsRepository {
        total_por_rango: fn(Option<i32>, Option<i32>) -> i64,
    }

    impl StatsRepository for FakeStatsRepository {
        async fn total_delitos(&self, filters: &GlobalFilters) -> Result<i64, RepositoryError> {
            Ok((self.total_por_rango)(filters.anio_inicio, filters.anio_fin))
        }

        async fn delito_mas_comun(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<Option<String>, RepositoryError> {
            Ok(Some("HURTO A PERSONAS".to_string()))
        }

        async fn mes_mayor_impacto(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<Option<String>, RepositoryError> {
            Ok(Some("2023-07".to_string()))
        }

        async fn distribucion_genero(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            Ok(HashMap::from([("MASCULINO".to_string(), 100)]))
        }

        // No relevantes para los tests de KPI (llegaron con el Hito 3.2).
        async fn municipio_nombre(
            &self,
            _codigo_dane: i32,
        ) -> Result<Option<String>, RepositoryError> {
            unimplemented!("no usado por los tests de get_kpis")
        }
        async fn departamento_nombre(
            &self,
            _dpto_codigo: i32,
        ) -> Result<Option<String>, RepositoryError> {
            unimplemented!("no usado por los tests de get_kpis")
        }
        async fn evolution_series(
            &self,
            _filters: &GlobalFilters,
            _agrupacion: crate::domain::evolution::Agrupacion,
        ) -> Result<Vec<crate::domain::evolution::EvolutionPoint>, RepositoryError> {
            unimplemented!("no usado por los tests de get_kpis")
        }
        async fn map_stats(
            &self,
            _filters: &GlobalFilters,
            _granularidad: crate::domain::granularidad::Granularidad,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            unimplemented!("no usado por los tests de get_kpis")
        }
        async fn poblacion_promedio(
            &self,
            _anio_inicio: i32,
            _anio_fin: i32,
            _granularidad: crate::domain::granularidad::Granularidad,
        ) -> Result<HashMap<String, f64>, RepositoryError> {
            unimplemented!("no usado por los tests de get_kpis")
        }
        async fn desglose_por_delito(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            unimplemented!("no usado por los tests de get_kpis")
        }
    }

    #[tokio::test]
    async fn execute_combines_current_and_previous_period_into_variacion() {
        let repo = FakeStatsRepository {
            total_por_rango: |inicio, _fin| match inicio {
                Some(2023) => 150, // periodo actual
                Some(2020) => 100, // periodo anterior (2020-2022)
                _ => panic!("rango inesperado: {inicio:?}"),
            },
        };
        let filters = GlobalFilters {
            anio_inicio: Some(2023),
            anio_fin: Some(2025),
            ..Default::default()
        };

        let kpis = execute(&repo, &filters).await.unwrap();

        assert_eq!(kpis.total_delitos, 150);
        assert_eq!(kpis.variacion_porcentual, Some(50.0));
        assert_eq!(kpis.delito_mas_comun, Some("HURTO A PERSONAS".to_string()));
        assert_eq!(kpis.mes_mayor_impacto, Some("2023-07".to_string()));
        assert_eq!(kpis.distribucion_genero.get("MASCULINO"), Some(&100));
    }

    #[tokio::test]
    async fn execute_returns_none_variacion_when_filtering_all_years() {
        // Reportado por el usuario (2026-08-07): filtrar "todos los años"
        // (sin acotar) mostraba "+100.0% vs. periodo anterior", engañoso —
        // el periodo anterior calculado (2014-2019) no existe en el
        // dataset (RN-06, empieza en 2020), así que no hay nada real que
        // comparar.
        let repo = FakeStatsRepository {
            total_por_rango: |inicio, _fin| match inicio {
                None => 4_836_275, // periodo actual: todo el dataset, sin acotar
                Some(2014) => panic!("no debería consultarse un periodo fuera del dataset"),
                _ => panic!("rango inesperado: {inicio:?}"),
            },
        };

        let kpis = execute(&repo, &GlobalFilters::default()).await.unwrap();

        assert_eq!(kpis.variacion_porcentual, None);
    }

    #[tokio::test]
    async fn execute_returns_none_variacion_when_filtering_only_the_first_year() {
        let repo = FakeStatsRepository {
            total_por_rango: |inicio, _fin| match inicio {
                Some(2020) => 800_000, // periodo actual: solo 2020
                Some(2019) => panic!("no debería consultarse un periodo fuera del dataset"),
                _ => panic!("rango inesperado: {inicio:?}"),
            },
        };
        let filters = GlobalFilters { anio_inicio: Some(2020), anio_fin: Some(2020), ..Default::default() };

        let kpis = execute(&repo, &filters).await.unwrap();

        assert_eq!(kpis.variacion_porcentual, None);
    }
}
