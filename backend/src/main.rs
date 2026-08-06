mod application;
mod domain;
mod infrastructure;
mod interfaces;

use infrastructure::{
    config::AppConfig, db, postgres_filtros_repository::PgFiltrosRepository,
    postgres_geometry_repository::PgGeometryRepository,
    postgres_stats_repository::PgStatsRepository,
};
use interfaces::http::routes::AppState;

#[tokio::main]
async fn main() {
    let config = AppConfig::from_env();

    let pool = db::build_pool(&config.database_url)
        .await
        .expect("No se pudo conectar a PostgreSQL — revisa las credenciales en .env");

    let state = AppState {
        filtros_repo: PgFiltrosRepository::new(pool.clone()),
        stats_repo: PgStatsRepository::new(pool.clone()),
        geometry_repo: PgGeometryRepository::new(pool),
    };

    let app = interfaces::http::build_router(state)
        .layer(interfaces::http::cors::cors_layer(&config.cors_allowed_origin));

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.server_port))
        .await
        .expect("No se pudo abrir el puerto del servidor");

    println!("Servidor escuchando en http://0.0.0.0:{}", config.server_port);

    axum::serve(listener, app)
        .await
        .expect("El servidor Axum se detuvo inesperadamente");
}
