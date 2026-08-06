use axum::Json;
use serde_json::{json, Value};

/// Liveness check simple: si el proceso responde, está vivo.
/// No consulta la base de datos a propósito (eso sería un "readiness"
/// check distinto, no cubierto por este Hito).
pub async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
