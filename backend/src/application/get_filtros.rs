use crate::application::ports::{FiltrosRepository, RepositoryError};
use crate::domain::vocabulario::FiltrosVocabulario;

/// Caso de uso de `GET /api/v1/metadata/filtros`. Es un passthrough
/// deliberado — la razón de existir no es lógica de transformación (no la
/// hay todavía) sino mantener a `interfaces/http` desacoplado de
/// `infrastructure`: el handler solo conoce esta función y el trait
/// `FiltrosRepository`, nunca `sqlx` directamente.
pub async fn execute<R: FiltrosRepository>(
    repo: &R,
) -> Result<FiltrosVocabulario, RepositoryError> {
    repo.get_filtros().await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::{FiltrosRepository, RepositoryError};
    use crate::domain::vocabulario::FiltrosVocabulario;

    struct FakeFiltrosRepository;

    impl FiltrosRepository for FakeFiltrosRepository {
        async fn get_filtros(&self) -> Result<FiltrosVocabulario, RepositoryError> {
            Ok(FiltrosVocabulario {
                delitos: vec!["HURTO A PERSONAS".to_string()],
                armas_medios: vec!["ARMA DE FUEGO".to_string()],
                generos: vec![
                    "MASCULINO".to_string(),
                    "FEMENINO".to_string(),
                    "NO_REPORTADO".to_string(),
                ],
                grupos_edad: vec!["DE 18 ANOS Y MAS".to_string()],
            })
        }
    }

    struct FailingFiltrosRepository;

    impl FiltrosRepository for FailingFiltrosRepository {
        async fn get_filtros(&self) -> Result<FiltrosVocabulario, RepositoryError> {
            Err(RepositoryError("conexión perdida".to_string()))
        }
    }

    #[tokio::test]
    async fn returns_vocabulary_from_repository() {
        let result = execute(&FakeFiltrosRepository).await.unwrap();

        assert_eq!(result.generos.len(), 3);
        assert!(result.delitos.contains(&"HURTO A PERSONAS".to_string()));
    }

    #[tokio::test]
    async fn propagates_repository_errors() {
        let result = execute(&FailingFiltrosRepository).await;

        assert!(result.is_err());
    }
}
