use std::sync::Arc;

use sqlx::PgPool;
use tokio::sync::OnceCell;

use crate::application::ports::{FiltrosRepository, RepositoryError};
use crate::domain::vocabulario::FiltrosVocabulario;

#[derive(Clone)]
pub struct PgFiltrosRepository {
    pool: PgPool,
    /// Caché en memoria (Hito 5.2): el vocabulario de filtros solo cambia
    /// si se re-ejecuta el ETL, así que recalcularlo en cada request (4
    /// `SELECT DISTINCT`, ~0.9s medido contra datos reales) es trabajo
    /// desperdiciado. `Arc` para que todos los clones (Axum clona el
    /// `AppState` por request) compartan la misma celda — se calcula una
    /// sola vez por arranque del proceso.
    cache: Arc<OnceCell<FiltrosVocabulario>>,
}

impl PgFiltrosRepository {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            cache: Arc::new(OnceCell::new()),
        }
    }

    async fn distinct(&self, column: &str) -> Result<Vec<String>, RepositoryError> {
        // `column` nunca viene del usuario (son 4 llamadas fijas más abajo),
        // así que interpolarlo en el nombre de columna no es una superficie
        // de inyección SQL — sqlx no permite bind parameters para
        // identificadores, solo para valores.
        // estadistica_rollup (no la tabla cruda): mismo resultado, muchas
        // menos filas que deduplicar (Hito 5.2, ver scripts/migrations/0002).
        let query = format!("SELECT DISTINCT {column} FROM estadistica_rollup ORDER BY {column}");

        sqlx::query_scalar::<_, String>(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| RepositoryError(e.to_string()))
    }

    async fn fetch_from_db(&self) -> Result<FiltrosVocabulario, RepositoryError> {
        Ok(FiltrosVocabulario {
            delitos: self.distinct("delitos").await?,
            armas_medios: self.distinct("arma_medio").await?,
            generos: self.distinct("genero").await?,
            grupos_edad: self.distinct("grupo_edad").await?,
        })
    }
}

impl FiltrosRepository for PgFiltrosRepository {
    async fn get_filtros(&self) -> Result<FiltrosVocabulario, RepositoryError> {
        self.cache
            .get_or_try_init(|| self.fetch_from_db())
            .await
            .cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::{config::AppConfig, db};
    use std::time::Instant;

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

    #[tokio::test]
    async fn second_call_is_served_from_cache_shared_across_clones() {
        let config = AppConfig::from_env();
        let pool = db::build_pool(&config.database_url)
            .await
            .expect("requiere PostgreSQL corriendo con las credenciales de .env");
        let repo = PgFiltrosRepository::new(pool);

        let first = repo.get_filtros().await.unwrap();

        // Clon nuevo — como lo haría Axum al extraer el estado por request.
        let clone = repo.clone();
        let start = Instant::now();
        let second = clone.get_filtros().await.unwrap();
        let elapsed = start.elapsed();

        assert_eq!(first, second);
        // La consulta real mide ~0.9s; un cache hit debe ser órdenes de
        // magnitud más rápido. 50ms de margen es generoso pero suficiente
        // para distinguir "cacheado" de "consultó la base de nuevo".
        assert!(
            elapsed.as_millis() < 50,
            "se esperaba un cache hit (<50ms), tardó {elapsed:?} — ¿se está recalculando?"
        );
    }
}
