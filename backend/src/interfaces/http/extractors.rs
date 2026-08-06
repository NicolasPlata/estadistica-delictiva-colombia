use axum::extract::path::ErrorKind;
use axum::extract::rejection::{JsonRejection, PathRejection};
use axum::extract::{FromRequest, FromRequestParts, Path, Request};
use axum::http::request::Parts;
use axum::Json;
use serde::de::DeserializeOwned;

use super::error::AppError;

/// Envuelve `axum::Json<T>` para que un body malformado o con tipos
/// incorrectos termine en `AppError::BadRequest` (JSON, `{"error": "..."}`)
/// en vez del texto plano por defecto de Axum — mismo shape de error que
/// las fallas de repositorio, sin importar en qué capa se originó (Hito 5.1).
pub struct AppJson<T>(pub T);

impl<T, S> FromRequest<S> for AppJson<T>
where
    T: DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        match Json::<T>::from_request(req, state).await {
            Ok(Json(value)) => Ok(AppJson(value)),
            Err(rejection) => Err(AppError::BadRequest(json_rejection_message(rejection))),
        }
    }
}

fn json_rejection_message(rejection: JsonRejection) -> String {
    match rejection {
        JsonRejection::JsonDataError(e) => format!("El body no cumple el formato esperado: {e}"),
        JsonRejection::JsonSyntaxError(_) => "El body no es JSON válido.".to_string(),
        JsonRejection::MissingJsonContentType(_) => {
            "Falta la cabecera Content-Type: application/json.".to_string()
        }
        other => other.to_string(),
    }
}

/// Igual que `AppJson` pero para parámetros de ruta (ej.
/// `{granularidad}`) — un valor que no calza con el enum esperado debe dar
/// 400 con el mismo shape de error, no el texto plano por defecto de Axum.
pub struct AppPath<T>(pub T);

impl<T, S> FromRequestParts<S> for AppPath<T>
where
    T: DeserializeOwned + Send,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match Path::<T>::from_request_parts(parts, state).await {
            Ok(Path(value)) => Ok(AppPath(value)),
            Err(rejection) => Err(AppError::BadRequest(path_rejection_message(rejection))),
        }
    }
}

fn path_rejection_message(rejection: PathRejection) -> String {
    match rejection {
        PathRejection::FailedToDeserializePathParams(e) => match e.kind() {
            ErrorKind::ParseError { value, expected_type } => format!(
                "Valor de ruta inválido: '{value}' no es un {expected_type} válido."
            ),
            _ => e.to_string(),
        },
        other => other.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::routing::post;
    use axum::Router;
    use serde::Deserialize;
    use tower::ServiceExt;

    #[derive(Debug, Deserialize)]
    struct Payload {
        #[allow(dead_code)]
        anio: i32,
    }

    async fn echo(AppJson(payload): AppJson<Payload>) -> String {
        payload.anio.to_string()
    }

    fn router() -> Router {
        Router::new().route("/echo", post(echo))
    }

    #[tokio::test]
    async fn valid_json_body_passes_through() {
        let response = router()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/echo")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(r#"{"anio": 2023}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);
    }

    #[tokio::test]
    async fn malformed_json_body_returns_400_with_json_error() {
        let response = router()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/echo")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from("{ esto no es json"))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::BAD_REQUEST);
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(json["error"].is_string());
    }

    #[tokio::test]
    async fn wrong_field_type_returns_400_with_json_error() {
        let response = router()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/echo")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(r#"{"anio": "no-es-un-numero"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::BAD_REQUEST);
    }

    #[derive(Debug, Deserialize, PartialEq)]
    #[serde(rename_all = "UPPERCASE")]
    enum Nivel {
        Alto,
        Bajo,
    }

    async fn echo_path(AppPath(nivel): AppPath<Nivel>) -> String {
        format!("{nivel:?}")
    }

    fn router_with_path() -> Router {
        Router::new().route("/nivel/{nivel}", axum::routing::get(echo_path))
    }

    #[tokio::test]
    async fn valid_path_param_passes_through() {
        let response = router_with_path()
            .oneshot(
                axum::http::Request::builder()
                    .uri("/nivel/ALTO")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::OK);
    }

    #[tokio::test]
    async fn invalid_path_param_returns_400_with_json_error() {
        let response = router_with_path()
            .oneshot(
                axum::http::Request::builder()
                    .uri("/nivel/INVALIDO")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), axum::http::StatusCode::BAD_REQUEST);
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(json["error"].is_string());
    }
}
