use axum::http::{HeaderValue, Method};
use tower_http::cors::{AllowOrigin, CorsLayer};

/// CORS restringido a un único origen configurable (Hito 5.1) — nunca
/// `Any`: el backend expone datos reales (aunque públicos) y las
/// peticiones son `POST` con body JSON, así que reflejar cualquier origen
/// no aporta nada y es una práctica floja por defecto.
///
/// `AllowOrigin::list` (no un `HeaderValue` suelto) a propósito: con un
/// valor suelto, tower-http usa modo "exact" y **siempre** manda ese
/// `Access-Control-Allow-Origin` fijo, sin importar el `Origin` real de la
/// petición (delegando el bloqueo enteramente al navegador). Con `list`,
/// el header solo se refleja cuando el `Origin` entrante calza —
/// comportamiento más estricto y el que efectivamente se testea abajo.
pub fn cors_layer(allowed_origin: &str) -> CorsLayer {
    let origin: HeaderValue = allowed_origin
        .parse()
        .unwrap_or_else(|_| panic!("CORS_ALLOWED_ORIGIN inválido: {allowed_origin}"));

    CorsLayer::new()
        .allow_origin(AllowOrigin::list([origin]))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([axum::http::header::CONTENT_TYPE])
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::routing::get;
    use axum::Router;
    use tower::ServiceExt;

    fn app_with_cors(allowed_origin: &str) -> Router {
        Router::new()
            .route("/ping", get(|| async { "pong" }))
            .layer(cors_layer(allowed_origin))
    }

    #[tokio::test]
    async fn allows_configured_origin() {
        let app = app_with_cors("http://localhost:5173");

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/ping")
                    .header("origin", "http://localhost:5173")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(
            response
                .headers()
                .get("access-control-allow-origin")
                .unwrap(),
            "http://localhost:5173"
        );
    }

    #[tokio::test]
    async fn does_not_reflect_a_different_origin() {
        let app = app_with_cors("http://localhost:5173");

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/ping")
                    .header("origin", "https://sitio-no-autorizado.com")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert!(response
            .headers()
            .get("access-control-allow-origin")
            .is_none());
    }
}
