use std::collections::HashMap;
use std::fmt;

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
}
