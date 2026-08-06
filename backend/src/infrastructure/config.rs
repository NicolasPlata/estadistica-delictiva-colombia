/// Configuración de la aplicación, cargada desde variables de entorno.
/// `build` recibe un "lookup" inyectable (en vez de llamar a `std::env::var`
/// directamente) para poder testear la lógica de parseo sin tocar el entorno
/// real del proceso.
pub struct AppConfig {
    pub database_url: String,
    pub server_port: u16,
    /// Origen permitido por CORS (Hito 5.1) — default al puerto estándar de
    /// `vite dev` para que el frontend funcione sin configuración adicional
    /// en desarrollo local; configurable vía env para producción.
    pub cors_allowed_origin: String,
}

impl AppConfig {
    /// Punto de entrada real: carga `.env` (si existe) y lee de `std::env`.
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();
        Self::build(|key| std::env::var(key))
    }

    fn build(get: impl Fn(&str) -> Result<String, std::env::VarError>) -> Self {
        let db_user = get("DB_USER").expect("DB_USER debe estar definido en .env");
        let db_pass = get("DB_PASS").expect("DB_PASS debe estar definido en .env");
        let db_host = get("DB_HOST").expect("DB_HOST debe estar definido en .env");
        let db_port = get("DB_PORT").expect("DB_PORT debe estar definido en .env");
        let db_name = get("DB_NAME").expect("DB_NAME debe estar definido en .env");

        let database_url =
            format!("postgres://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}");

        let server_port = get("SERVER_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(3000);

        let cors_allowed_origin =
            get("CORS_ALLOWED_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".to_string());

        Self {
            database_url,
            server_port,
            cors_allowed_origin,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn lookup(vars: HashMap<&str, &str>) -> impl Fn(&str) -> Result<String, std::env::VarError> {
        move |key: &str| {
            vars.get(key)
                .map(|v| v.to_string())
                .ok_or(std::env::VarError::NotPresent)
        }
    }

    #[test]
    fn builds_database_url_from_individual_vars() {
        let vars = HashMap::from([
            ("DB_USER", "testuser"),
            ("DB_PASS", "testpass"),
            ("DB_HOST", "testhost"),
            ("DB_PORT", "1234"),
            ("DB_NAME", "testdb"),
        ]);

        let config = AppConfig::build(lookup(vars));

        assert_eq!(
            config.database_url,
            "postgres://testuser:testpass@testhost:1234/testdb"
        );
    }

    #[test]
    fn defaults_server_port_to_3000_when_not_set() {
        let vars = HashMap::from([
            ("DB_USER", "u"),
            ("DB_PASS", "p"),
            ("DB_HOST", "h"),
            ("DB_PORT", "5432"),
            ("DB_NAME", "d"),
        ]);

        let config = AppConfig::build(lookup(vars));

        assert_eq!(config.server_port, 3000);
    }

    #[test]
    fn reads_server_port_when_set() {
        let vars = HashMap::from([
            ("DB_USER", "u"),
            ("DB_PASS", "p"),
            ("DB_HOST", "h"),
            ("DB_PORT", "5432"),
            ("DB_NAME", "d"),
            ("SERVER_PORT", "8080"),
        ]);

        let config = AppConfig::build(lookup(vars));

        assert_eq!(config.server_port, 8080);
    }

    #[test]
    fn defaults_cors_allowed_origin_to_local_vite_dev_server() {
        let vars = HashMap::from([
            ("DB_USER", "u"),
            ("DB_PASS", "p"),
            ("DB_HOST", "h"),
            ("DB_PORT", "5432"),
            ("DB_NAME", "d"),
        ]);

        let config = AppConfig::build(lookup(vars));

        assert_eq!(config.cors_allowed_origin, "http://localhost:5173");
    }

    #[test]
    fn reads_cors_allowed_origin_when_set() {
        let vars = HashMap::from([
            ("DB_USER", "u"),
            ("DB_PASS", "p"),
            ("DB_HOST", "h"),
            ("DB_PORT", "5432"),
            ("DB_NAME", "d"),
            ("CORS_ALLOWED_ORIGIN", "https://mi-dominio.com"),
        ]);

        let config = AppConfig::build(lookup(vars));

        assert_eq!(config.cors_allowed_origin, "https://mi-dominio.com");
    }

    #[test]
    #[should_panic(expected = "DB_USER debe estar definido")]
    fn panics_with_clear_message_when_required_var_missing() {
        let vars = HashMap::from([
            ("DB_PASS", "p"),
            ("DB_HOST", "h"),
            ("DB_PORT", "5432"),
            ("DB_NAME", "d"),
        ]);

        AppConfig::build(lookup(vars));
    }
}
