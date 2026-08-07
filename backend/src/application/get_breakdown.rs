use std::collections::HashMap;

use crate::application::ports::{RepositoryError, StatsRepository};
use crate::domain::breakdown::{Breakdown, CategoriaCantidad, DelitoCantidad};
use crate::domain::delito_categoria::categoria_de;
use crate::domain::filters::GlobalFilters;

/// Caso de uso de `POST /api/v1/stats/breakdown` (Fase 7): desglose de
/// delitos por región, para la tabla + gráfica de pastel al hacer clic en
/// un territorio. `por_categoria` se agrega en Rust a partir de
/// `por_delito` (RN-04) — no hace falta una segunda consulta SQL, es una
/// reducción sobre datos que el repositorio ya trajo.
pub async fn execute<R: StatsRepository>(
    repo: &R,
    filters: &GlobalFilters,
) -> Result<Breakdown, RepositoryError> {
    let region_label = resolve_region_label(repo, filters).await?;
    let cantidades = repo.desglose_por_delito(filters).await?;

    let mut por_categoria: HashMap<String, i64> = HashMap::new();
    let mut por_delito: Vec<DelitoCantidad> = Vec::with_capacity(cantidades.len());

    for (delito, cantidad) in cantidades {
        let categoria = categoria_de(&delito).to_string();
        *por_categoria.entry(categoria.clone()).or_insert(0) += cantidad;
        por_delito.push(DelitoCantidad { delito, categoria, cantidad });
    }

    // Determinístico: sin esto, el orden de un HashMap varía entre
    // ejecuciones y una tabla "reordenándose sola" en el cliente sería un
    // bug de UX real, no solo un detalle interno.
    por_delito.sort_by(|a, b| b.cantidad.cmp(&a.cantidad).then_with(|| a.delito.cmp(&b.delito)));
    let mut por_categoria: Vec<CategoriaCantidad> = por_categoria
        .into_iter()
        .map(|(categoria, cantidad)| CategoriaCantidad { categoria, cantidad })
        .collect();
    por_categoria.sort_by(|a, b| b.cantidad.cmp(&a.cantidad).then_with(|| a.categoria.cmp(&b.categoria)));

    Ok(Breakdown { region_label, por_delito, por_categoria })
}

/// Idéntico a `get_evolution::resolve_region_label` (misma precedencia
/// municipio > departamento > "Nacional", HU-3.03) — duplicado a propósito
/// en vez de extraído a un helper compartido: son 2 llamadores y ~15
/// líneas, la abstracción no paga su costo todavía (ver guía del proyecto
/// "tres líneas similares es mejor que una abstracción prematura").
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
    use crate::domain::evolution::{Agrupacion, EvolutionPoint};
    use crate::domain::granularidad::Granularidad;

    struct FakeStatsRepository {
        desglose: HashMap<String, i64>,
        municipio_nombre: Option<String>,
        departamento_nombre: Option<String>,
    }

    impl StatsRepository for FakeStatsRepository {
        async fn total_delitos(&self, _filters: &GlobalFilters) -> Result<i64, RepositoryError> {
            unimplemented!("no usado por los tests de get_breakdown")
        }
        async fn delito_mas_comun(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<Option<String>, RepositoryError> {
            unimplemented!("no usado por los tests de get_breakdown")
        }
        async fn mes_mayor_impacto(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<Option<String>, RepositoryError> {
            unimplemented!("no usado por los tests de get_breakdown")
        }
        async fn distribucion_genero(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            unimplemented!("no usado por los tests de get_breakdown")
        }
        async fn municipio_nombre(
            &self,
            _codigo_dane: i32,
        ) -> Result<Option<String>, RepositoryError> {
            Ok(self.municipio_nombre.clone())
        }
        async fn departamento_nombre(
            &self,
            _dpto_codigo: i32,
        ) -> Result<Option<String>, RepositoryError> {
            Ok(self.departamento_nombre.clone())
        }
        async fn evolution_series(
            &self,
            _filters: &GlobalFilters,
            _agrupacion: Agrupacion,
        ) -> Result<Vec<EvolutionPoint>, RepositoryError> {
            unimplemented!("no usado por los tests de get_breakdown")
        }
        async fn map_stats(
            &self,
            _filters: &GlobalFilters,
            _granularidad: Granularidad,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            unimplemented!("no usado por los tests de get_breakdown")
        }
        async fn poblacion_promedio(
            &self,
            _anio_inicio: i32,
            _anio_fin: i32,
            _granularidad: Granularidad,
        ) -> Result<HashMap<String, f64>, RepositoryError> {
            unimplemented!("no usado por los tests de get_breakdown")
        }
        async fn desglose_por_delito(
            &self,
            _filters: &GlobalFilters,
        ) -> Result<HashMap<String, i64>, RepositoryError> {
            Ok(self.desglose.clone())
        }
    }

    fn repo_con(desglose: HashMap<String, i64>) -> FakeStatsRepository {
        FakeStatsRepository { desglose, municipio_nombre: None, departamento_nombre: None }
    }

    #[tokio::test]
    async fn labels_region_as_nacional_when_no_geographic_filter() {
        let repo = repo_con(HashMap::new());

        let result = execute(&repo, &GlobalFilters::default()).await.unwrap();

        assert_eq!(result.region_label, "Nacional");
    }

    #[tokio::test]
    async fn labels_region_by_municipio_when_municipio_id_is_set() {
        let mut repo = repo_con(HashMap::new());
        repo.municipio_nombre = Some("BOGOTÁ, D.C.".to_string());
        let filters = GlobalFilters { municipio_id: Some(11001), ..Default::default() };

        let result = execute(&repo, &filters).await.unwrap();

        assert_eq!(result.region_label, "BOGOTÁ, D.C.");
    }

    #[tokio::test]
    async fn resolves_categoria_for_each_delito_and_aggregates_por_categoria() {
        let repo = repo_con(HashMap::from([
            ("ARTICULO 239. HURTO PERSONAS".to_string(), 100),
            ("ARTICULO 239. HURTO RESIDENCIAS".to_string(), 50),
            ("ARTICULO 103. HOMICIDIO".to_string(), 10),
        ]));

        let result = execute(&repo, &GlobalFilters::default()).await.unwrap();

        assert_eq!(result.por_delito.len(), 3);
        let hurto_personas = result
            .por_delito
            .iter()
            .find(|d| d.delito == "ARTICULO 239. HURTO PERSONAS")
            .unwrap();
        assert_eq!(hurto_personas.categoria, "Delitos contra el Patrimonio Económico");

        // Las 2 filas de hurto (100 + 50) se agregan en una sola categoría.
        let patrimonio = result
            .por_categoria
            .iter()
            .find(|c| c.categoria == "Delitos contra el Patrimonio Económico")
            .unwrap();
        assert_eq!(patrimonio.cantidad, 150);
        assert_eq!(result.por_categoria.len(), 2); // Patrimonio + Vida e Integridad Personal
    }

    #[tokio::test]
    async fn por_delito_is_sorted_descending_by_cantidad() {
        let repo = repo_con(HashMap::from([
            ("ARTICULO 347. AMENAZAS".to_string(), 5),
            ("ARTICULO 103. HOMICIDIO".to_string(), 500),
            ("ARTICULO 244. EXTORSION".to_string(), 50),
        ]));

        let result = execute(&repo, &GlobalFilters::default()).await.unwrap();

        let cantidades: Vec<i64> = result.por_delito.iter().map(|d| d.cantidad).collect();
        assert_eq!(cantidades, vec![500, 50, 5]);
    }

    #[tokio::test]
    async fn empty_desglose_yields_empty_breakdown_not_an_error() {
        let repo = repo_con(HashMap::new());

        let result = execute(&repo, &GlobalFilters::default()).await.unwrap();

        assert!(result.por_delito.is_empty());
        assert!(result.por_categoria.is_empty());
    }
}
