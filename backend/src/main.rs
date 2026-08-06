mod application;
mod domain;
mod infrastructure;
mod interfaces;

use infrastructure::{config::AppConfig, db};

#[tokio::main]
async fn main() {
    let config = AppConfig::from_env();

    let pool = db::build_pool(&config.database_url)
        .await
        .expect("No se pudo conectar a PostgreSQL — revisa las credenciales en .env");

    // El pool aún no se inyecta en ningún handler (llega con los primeros
    // endpoints reales en la Fase 2) — se valida aquí que la conexión
    // funciona antes de levantar el servidor.
    drop(pool);

    let app = interfaces::http::build_router();

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.server_port))
        .await
        .expect("No se pudo abrir el puerto del servidor");

    println!("Servidor escuchando en http://0.0.0.0:{}", config.server_port);

    axum::serve(listener, app)
        .await
        .expect("El servidor Axum se detuvo inesperadamente");
}
