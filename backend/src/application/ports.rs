use std::fmt;

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
