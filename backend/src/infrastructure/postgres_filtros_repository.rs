use sqlx::PgPool;

use crate::application::ports::{FiltrosRepository, RepositoryError};
use crate::domain::vocabulario::FiltrosVocabulario;

#[derive(Clone)]
pub struct PgFiltrosRepository {
    pool: PgPool,
}

impl PgFiltrosRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn distinct(&self, column: &str) -> Result<Vec<String>, RepositoryError> {
        // `column` nunca viene del usuario (son 4 llamadas fijas más abajo),
        // así que interpolarlo en el nombre de columna no es una superficie
        // de inyección SQL — sqlx no permite bind parameters para
        // identificadores, solo para valores.
        let query = format!("SELECT DISTINCT {column} FROM estadistica_delictiva ORDER BY {column}");

        sqlx::query_scalar::<_, String>(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| RepositoryError(e.to_string()))
    }
}

impl FiltrosRepository for PgFiltrosRepository {
    async fn get_filtros(&self) -> Result<FiltrosVocabulario, RepositoryError> {
        Ok(FiltrosVocabulario {
            delitos: self.distinct("delitos").await?,
            armas_medios: self.distinct("arma_medio").await?,
            generos: self.distinct("genero").await?,
            grupos_edad: self.distinct("grupo_edad").await?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::{config::AppConfig, db};

    /// Test de integración: requiere la base de datos real de desarrollo
    /// (`.env` en la raíz del repo). No se mockea porque su único propósito
    /// es verificar que el SQL es correcto contra el esquema real — esa
    /// verificación no tiene valor si no toca la base de datos de verdad.
    #[tokio::test]
    async fn fetches_homologated_vocabulary_from_real_database() {
        let config = AppConfig::from_env();
        let pool = db::build_pool(&config.database_url)
            .await
            .expect("requiere PostgreSQL corriendo con las credenciales de .env");

        let repo = PgFiltrosRepository::new(pool);
        let vocab = repo.get_filtros().await.unwrap();

        assert!(!vocab.delitos.is_empty());
        assert!(!vocab.armas_medios.is_empty());
        // Confirma que la homologación de la migración correctiva sigue vigente.
        assert!(vocab.generos.contains(&"NO_REPORTADO".to_string()));
        assert_eq!(vocab.generos.len(), 3);
        assert!(vocab.grupos_edad.contains(&"DE 18 ANOS Y MAS".to_string()));
    }
}
