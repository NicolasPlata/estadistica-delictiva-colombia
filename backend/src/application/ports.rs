use std::collections::HashMap;
use std::fmt;

use crate::domain::evolution::{Agrupacion, EvolutionPoint};
use crate::domain::filters::GlobalFilters;
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
}
