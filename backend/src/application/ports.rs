use std::collections::HashMap;
use std::fmt;

use crate::domain::evolution::{Agrupacion, EvolutionPoint};
use crate::domain::filters::GlobalFilters;
use crate::domain::granularidad::Granularidad;
use crate::domain::vocabulario::FiltrosVocabulario;

/// Error de repositorio, sin depender de `sqlx` (esa conversión vive en
/// `infrastructure`, donde sqlx ya es una dependencia natural) — así
/// `application` nunca importa el crate de base de datos.
#[derive(Debug, PartialEq)]
pub struct RepositoryError(pub String);

impl fmt::Display for RepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "error de repositorio: {}", self.0)
    }
}

impl std::error::Error for RepositoryError {}

pub trait FiltrosRepository {
    async fn get_filtros(&self) -> Result<FiltrosVocabulario, RepositoryError>;
}

/// Puerto para las agregaciones analíticas de `/api/v1/stats/kpi`
/// (HU-3.01). Cada método es una consulta independiente en vez de un único
/// "get_kpis" monolítico, para que `application::get_kpis` pueda combinar
/// el resultado de `total_delitos` para el periodo actual Y el anterior sin
/// que el repositorio necesite saber nada sobre "variación porcentual".
pub trait StatsRepository {
    async fn total_delitos(&self, filters: &GlobalFilters) -> Result<i64, RepositoryError>;
    async fn delito_mas_comun(
        &self,
        filters: &GlobalFilters,
    ) -> Result<Option<String>, RepositoryError>;
    async fn mes_mayor_impacto(
        &self,
        filters: &GlobalFilters,
    ) -> Result<Option<String>, RepositoryError>;
    async fn distribucion_genero(
        &self,
        filters: &GlobalFilters,
    ) -> Result<HashMap<String, i64>, RepositoryError>;

    /// `{delito: cantidad}` (Fase 7) — mismo patrón que
    /// `distribucion_genero`, agrupando por `delitos` en vez de `genero`.
    /// La resolución de categoría padre (RN-04) ocurre en
    /// `application::get_breakdown`, no aquí — este método solo agrega.
    async fn desglose_por_delito(
        &self,
        filters: &GlobalFilters,
    ) -> Result<HashMap<String, i64>, RepositoryError>;

    /// Nombre del municipio para un `codigo_dane`, o `None` si no existe
    /// (HU-3.03: título dinámico del gráfico de evolución regional).
    async fn municipio_nombre(&self, codigo_dane: i32) -> Result<Option<String>, RepositoryError>;
    /// Nombre del departamento para un `dpto_codigo`, o `None` si no existe.
    async fn departamento_nombre(
        &self,
        dpto_codigo: i32,
    ) -> Result<Option<String>, RepositoryError>;
    /// Serie temporal agregada según `agrupacion` (HU-3.02/HU-3.03).
    async fn evolution_series(
        &self,
        filters: &GlobalFilters,
        agrupacion: Agrupacion,
    ) -> Result<Vec<EvolutionPoint>, RepositoryError>;

    /// `{codigo: cantidad}` para el choropleth (HU-1.02), agrupado por
    /// `dpto_codigo` o `codigo_dane` según `granularidad` — ver
    /// `docs/plans/02-plan-desarrollo-backend.md` Hito 4.2 sobre por qué la
    /// clave de agrupación no es siempre `codigo_dane`.
    async fn map_stats(
        &self,
        filters: &GlobalFilters,
        granularidad: Granularidad,
    ) -> Result<HashMap<String, i64>, RepositoryError>;

    /// `{codigo: población_promedio}` (Fase 6, RN-12) — promedio de
    /// población entre `anio_inicio` y `anio_fin` (ambos inclusive),
    /// agrupado igual que `map_stats` (`dpto_codigo`/`codigo_dane` según
    /// `granularidad`, RN-13). Vive como método separado de `map_stats` en
    /// vez de fusionarse en una sola consulta: mantiene `map_stats` sin
    /// cambios (cero riesgo de regresión sobre RNF-03 ya medido) y deja la
    /// fórmula de la tasa (RN-12) como código Rust explícito y testeable en
    /// `application::get_map_stats`, no enterrada en SQL dinámico.
    async fn poblacion_promedio(
        &self,
        anio_inicio: i32,
        anio_fin: i32,
        granularidad: Granularidad,
    ) -> Result<HashMap<String, f64>, RepositoryError>;
}

/// Puerto para `GET /api/v1/map/geometry/{granularidad}` (ADR 0002): la
/// geometría es estática y no depende de `GlobalFilters`, por eso vive en un
/// trait separado de `StatsRepository` — consulta una tabla distinta
/// (`municipios_geo`) con una forma de dato distinta (GeoJSON, no un
/// número). El repositorio devuelve el `FeatureCollection` ya ensamblado
/// como `serde_json::Value` en vez de un struct de dominio: la decisión de
/// diseño (Hito 4.1) es que PostGIS arme el JSON completo en SQL
/// (`jsonb_build_object`/`jsonb_agg`) para minimizar el procesamiento y
/// consumo de RAM en Rust — no hay nada que un struct tipado ganaría aquí
/// que no sea reserializar trabajo que la base de datos ya hizo.
pub trait GeometryRepository {
    async fn get_geometry(
        &self,
        granularidad: Granularidad,
    ) -> Result<serde_json::Value, RepositoryError>;
}
