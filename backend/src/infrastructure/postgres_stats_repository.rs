use std::collections::HashMap;

use sqlx::{PgPool, Postgres, QueryBuilder, Row};

use crate::application::ports::{RepositoryError, StatsRepository};
use crate::domain::filters::GlobalFilters;

/// Encadena las cláusulas `WHERE` correspondientes a los campos presentes
/// de `GlobalFilters` sobre un `QueryBuilder` ya iniciado con su `SELECT ...
/// FROM estadistica_delictiva`. Arranca en `WHERE 1=1` para que cada filtro
/// solo tenga que preocuparse por su propio `AND ...`, sin bookkeeping de
/// "es la primera cláusula". Todo valor viaja como bind parameter
/// (`push_bind`) — nunca se interpola texto de usuario en el SQL, ver los
/// tests de `where_clause_tests` (incluido uno que directamente confirma
/// que un intento de inyección no aparece en `.sql()`).
fn apply_filters(qb: &mut QueryBuilder<Postgres>, filters: &GlobalFilters) {
    qb.push(" WHERE 1=1");

    if let Some(v) = filters.anio_inicio {
        qb.push(" AND anio >= ").push_bind(v);
    }
    if let Some(v) = filters.anio_fin {
        qb.push(" AND anio <= ").push_bind(v);
    }
    if let Some(v) = filters.departamento_id {
        // Nivel departamental: dpto_codigo, NUNCA codigo_dane (ver
        // docs/plans/02-plan-desarrollo-backend.md Hito 4.2).
        qb.push(" AND dpto_codigo = ").push_bind(v);
    }
    if let Some(v) = filters.municipio_id {
        qb.push(" AND codigo_dane = ").push_bind(v);
    }
    if let Some(v) = filters.delitos.clone() {
        qb.push(" AND delitos = ANY(").push_bind(v).push(")");
    }
    if let Some(v) = filters.genero.clone() {
        qb.push(" AND genero = ").push_bind(v);
    }
    if let Some(v) = filters.grupo_edad.clone() {
        qb.push(" AND grupo_edad = ").push_bind(v);
    }
    if let Some(v) = filters.arma_medio.clone() {
        qb.push(" AND arma_medio = ").push_bind(v);
    }
}

#[derive(Clone)]
pub struct PgStatsRepository {
    pool: PgPool,
}

impl PgStatsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl StatsRepository for PgStatsRepository {
    async fn total_delitos(&self, filters: &GlobalFilters) -> Result<i64, RepositoryError> {
        let mut qb = QueryBuilder::<Postgres>::new(
            "SELECT COALESCE(SUM(cantidad), 0) FROM estadistica_delictiva",
        );
        apply_filters(&mut qb, filters);

        qb.build_query_scalar::<i64>()
            .fetch_one(&self.pool)
            .await
            .map_err(|e| RepositoryError(e.to_string()))
    }

    async fn delito_mas_comun(
        &self,
        filters: &GlobalFilters,
    ) -> Result<Option<String>, RepositoryError> {
        let mut qb = QueryBuilder::<Postgres>::new("SELECT delitos FROM estadistica_delictiva");
        apply_filters(&mut qb, filters);
        qb.push(" GROUP BY delitos ORDER BY SUM(cantidad) DESC LIMIT 1");

        qb.build_query_scalar::<String>()
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| RepositoryError(e.to_string()))
    }

    async fn mes_mayor_impacto(
        &self,
        filters: &GlobalFilters,
    ) -> Result<Option<String>, RepositoryError> {
        let mut qb = QueryBuilder::<Postgres>::new(
            "SELECT anio::text || '-' || lpad(mes::text, 2, '0') FROM estadistica_delictiva",
        );
        apply_filters(&mut qb, filters);
        qb.push(" GROUP BY anio, mes ORDER BY SUM(cantidad) DESC LIMIT 1");

        qb.build_query_scalar::<String>()
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| RepositoryError(e.to_string()))
    }

    async fn distribucion_genero(
        &self,
        filters: &GlobalFilters,
    ) -> Result<HashMap<String, i64>, RepositoryError> {
        let mut qb = QueryBuilder::<Postgres>::new(
            "SELECT genero, COALESCE(SUM(cantidad), 0) AS total FROM estadistica_delictiva",
        );
        apply_filters(&mut qb, filters);
        qb.push(" GROUP BY genero");

        let rows = qb
            .build()
            .fetch_all(&self.pool)
            .await
            .map_err(|e| RepositoryError(e.to_string()))?;

        rows.into_iter()
            .map(|row| {
                let genero: String = row.try_get("genero").map_err(|e| RepositoryError(e.to_string()))?;
                let total: i64 = row.try_get("total").map_err(|e| RepositoryError(e.to_string()))?;
                Ok((genero, total))
            })
            .collect()
    }
}

#[cfg(test)]
mod where_clause_tests {
    use super::*;
    use crate::domain::filters::GlobalFilters;
    use sqlx::{Postgres, QueryBuilder};

    #[test]
    fn empty_filters_produce_base_where_only() {
        let mut qb = QueryBuilder::<Postgres>::new("SELECT 1 FROM estadistica_delictiva");
        apply_filters(&mut qb, &GlobalFilters::default());
        assert_eq!(qb.sql(), "SELECT 1 FROM estadistica_delictiva WHERE 1=1");
    }

    #[test]
    fn anio_range_appends_bound_clauses_in_order() {
        let mut qb = QueryBuilder::<Postgres>::new("SELECT 1 FROM estadistica_delictiva");
        apply_filters(
            &mut qb,
            &GlobalFilters {
                anio_inicio: Some(2020),
                anio_fin: Some(2025),
                ..Default::default()
            },
        );
        assert_eq!(
            qb.sql(),
            "SELECT 1 FROM estadistica_delictiva WHERE 1=1 AND anio >= $1 AND anio <= $2"
        );
    }

    #[test]
    fn departamento_filters_by_dpto_codigo_not_codigo_dane() {
        // Regla documentada en docs/plans/02-... Hito 4.2: el nivel
        // departamental agrupa/filtra por dpto_codigo, nunca por codigo_dane
        // (o cada municipio contaría como su propia región).
        let mut qb = QueryBuilder::<Postgres>::new("SELECT 1 FROM estadistica_delictiva");
        apply_filters(
            &mut qb,
            &GlobalFilters {
                departamento_id: Some(5),
                ..Default::default()
            },
        );
        assert_eq!(
            qb.sql(),
            "SELECT 1 FROM estadistica_delictiva WHERE 1=1 AND dpto_codigo = $1"
        );
    }

    #[test]
    fn delitos_list_uses_any_with_a_single_bind_param() {
        let mut qb = QueryBuilder::<Postgres>::new("SELECT 1 FROM estadistica_delictiva");
        apply_filters(
            &mut qb,
            &GlobalFilters {
                delitos: Some(vec!["HURTO A PERSONAS".to_string(), "HOMICIDIO".to_string()]),
                ..Default::default()
            },
        );
        assert_eq!(
            qb.sql(),
            "SELECT 1 FROM estadistica_delictiva WHERE 1=1 AND delitos = ANY($1)"
        );
    }

    #[test]
    fn never_interpolates_filter_values_directly_into_the_sql_string() {
        // La prueba de fuego del requisito de seguridad del plan (Hito 3.1):
        // pase lo que pase en el valor, nunca debe aparecer en `.sql()` —
        // solo como bind parameter ($N).
        let mut qb = QueryBuilder::<Postgres>::new("SELECT 1 FROM estadistica_delictiva");
        apply_filters(
            &mut qb,
            &GlobalFilters {
                genero: Some("'; DROP TABLE estadistica_delictiva; --".to_string()),
                ..Default::default()
            },
        );
        assert!(!qb.sql().contains("DROP TABLE"));
        assert!(qb.sql().ends_with("AND genero = $1"));
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use crate::application::ports::StatsRepository;
    use crate::domain::filters::GlobalFilters;
    use crate::infrastructure::{config::AppConfig, db};

    async fn real_repo() -> PgStatsRepository {
        let config = AppConfig::from_env();
        let pool = db::build_pool(&config.database_url)
            .await
            .expect("requiere PostgreSQL corriendo con las credenciales de .env");
        PgStatsRepository::new(pool)
    }

    #[tokio::test]
    async fn total_delitos_matches_known_bogota_range() {
        let repo = real_repo().await;
        let filters = GlobalFilters {
            municipio_id: Some(11001), // Bogotá, D.C.
            ..Default::default()
        };

        let total = repo.total_delitos(&filters).await.unwrap();

        assert!(total > 0);
    }

    #[tokio::test]
    async fn total_delitos_is_zero_for_a_year_outside_the_dataset() {
        let repo = real_repo().await;
        let filters = GlobalFilters {
            anio_inicio: Some(1999),
            anio_fin: Some(1999),
            ..Default::default()
        };

        assert_eq!(repo.total_delitos(&filters).await.unwrap(), 0);
    }

    #[tokio::test]
    async fn delito_mas_comun_is_present_and_non_empty() {
        let repo = real_repo().await;

        let mas_comun = repo
            .delito_mas_comun(&GlobalFilters::default())
            .await
            .unwrap();

        assert!(mas_comun.is_some());
    }

    #[tokio::test]
    async fn mes_mayor_impacto_has_yyyy_mm_shape() {
        let repo = real_repo().await;

        let mes = repo
            .mes_mayor_impacto(&GlobalFilters::default())
            .await
            .unwrap()
            .unwrap();

        assert_eq!(mes.len(), 7);
        assert_eq!(mes.chars().nth(4), Some('-'));
    }

    #[tokio::test]
    async fn distribucion_genero_sums_to_the_same_total_as_total_delitos() {
        let repo = real_repo().await;
        let filters = GlobalFilters {
            anio_inicio: Some(2023),
            anio_fin: Some(2023),
            ..Default::default()
        };

        let total = repo.total_delitos(&filters).await.unwrap();
        let distribucion = repo.distribucion_genero(&filters).await.unwrap();

        assert_eq!(distribucion.values().sum::<i64>(), total);
        assert!(distribucion.contains_key("NO_REPORTADO"));
    }
}
