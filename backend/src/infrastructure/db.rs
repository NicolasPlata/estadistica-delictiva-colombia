use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

/// Wrapper delgado sobre `sqlx::PgPool::connect` — sin lógica de negocio que
/// testear con mocks (es I/O puro), por eso no lleva tests unitarios. Se
/// ejerce indirectamente por cualquier test de integración futuro contra la
/// base de datos real.
pub async fn build_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    // 10 conexiones es conservador para desarrollo local; al desplegar en un
    // proveedor free-tier, ajustar según su límite documentado en
    // docs/architecture/01-arquitectura.md ("Pool de conexiones en free-tier").
    PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
}

/// Variante "lazy": construye el `PgPool` sin abrir ninguna conexión de
/// inmediato (se conecta recién en la primera query). Existe para poder
/// montar el `Router` completo en tests que no ejercitan rutas dependientes
/// de la base de datos (ej. `/api/health`) sin requerir Postgres corriendo.
pub fn build_pool_lazy(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .connect_lazy(database_url)
}
