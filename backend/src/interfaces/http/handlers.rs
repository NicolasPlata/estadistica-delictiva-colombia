use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde_json::{json, Value};

use super::routes::AppState;
use crate::application::get_filtros;
use crate::domain::vocabulario::FiltrosVocabulario;

/// Liveness check simple: si el proceso responde, está vivo.
/// No consulta la base de datos a propósito (eso sería un "readiness"
/// check distinto, no cubierto por este Hito).
pub async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// `GET /api/v1/metadata/filtros` — ver `02-api-contracts.md` §4.1.
pub async fn get_filtros_metadata(
    State(state): State<AppState>,
) -> Result<Json<FiltrosVocabulario>, (StatusCode, String)> {
    get_filtros::execute(&state.filtros_repo)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}
