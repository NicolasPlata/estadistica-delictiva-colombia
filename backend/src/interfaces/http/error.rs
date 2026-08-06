use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

use crate::application::ports::RepositoryError;

/// Error HTTP unificado (Hito 5.1, RNF de "respuestas 400/500 limpias" de
/// `02-api-contracts.md`) — todo error que llega a un handler termina en
/// una de estas dos variantes, con el mismo shape de cuerpo JSON
/// `{"error": "..."}` sin importar de dónde vino (repositorio, validación
/// de input, etc.). Antes de este Hito, los handlers devolvían
/// `(StatusCode, String)`, que Axum renderiza como texto plano — violaba
/// el contrato sin que ningún test lo hubiera detectado hasta ahora.
#[derive(Debug, Clone, PartialEq)]
pub enum AppError {
    BadRequest(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl From<RepositoryError> for AppError {
    fn from(e: RepositoryError) -> Self {
        // `e.0` (no `.to_string()`): el `Display` de RepositoryError antepone
        // "error de repositorio: ", redundante una vez envuelto en `Internal`.
        AppError::Internal(e.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::response::IntoResponse;

    #[tokio::test]
    async fn bad_request_produces_400_with_json_error_body() {
        let response = AppError::BadRequest("payload inválido".to_string()).into_response();

        assert_eq!(response.status(), axum::http::StatusCode::BAD_REQUEST);
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"], "payload inválido");
    }

    #[tokio::test]
    async fn internal_produces_500_with_json_error_body() {
        let response = AppError::Internal("conexión perdida".to_string()).into_response();

        assert_eq!(
            response.status(),
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        );
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"], "conexión perdida");
    }

    #[test]
    fn repository_errors_convert_to_internal() {
        let repo_err = crate::application::ports::RepositoryError("boom".to_string());

        let app_err: AppError = repo_err.into();

        assert_eq!(app_err, AppError::Internal("boom".to_string()));
    }
}
