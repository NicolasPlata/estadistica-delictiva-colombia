use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use super::routes::AppState;
use crate::application::{get_evolution, get_filtros, get_kpis};
use crate::domain::evolution::{Agrupacion, Evolution};
use crate::domain::filters::GlobalFilters;
use crate::domain::kpis::Kpis;
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

/// `POST /api/v1/stats/kpi` — ver `02-api-contracts.md` §2.1 (HU-3.01).
/// El body es `GlobalFilters` directamente (no envuelto en `{"filters": ...}`
/// como sí lo hará `/stats/evolution` en el Hito 3.2, que además necesita
/// el parámetro `agrupacion` junto a los filtros).
pub async fn get_kpi_stats(
    State(state): State<AppState>,
    Json(filters): Json<GlobalFilters>,
) -> Result<Json<Kpis>, (StatusCode, String)> {
    get_kpis::execute(&state.stats_repo, &filters)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

/// Body de `POST /api/v1/stats/evolution` (`02-api-contracts.md` §2.2) —
/// a diferencia de `/stats/kpi`, envuelve los filtros junto al parámetro
/// `agrupacion`. Vive aquí (no en `domain`) porque es pura forma de
/// empaquetado del wire format de este endpoint específico, no un concepto
/// de negocio reutilizable.
#[derive(Debug, Deserialize)]
pub struct EvolutionRequestBody {
    #[serde(default)]
    filters: GlobalFilters,
    agrupacion: Agrupacion,
}

/// `POST /api/v1/stats/evolution` — ver `02-api-contracts.md` §2.2
/// (HU-3.02/HU-3.03).
pub async fn get_evolution_stats(
    State(state): State<AppState>,
    Json(body): Json<EvolutionRequestBody>,
) -> Result<Json<Evolution>, (StatusCode, String)> {
    get_evolution::execute(&state.stats_repo, &body.filters, body.agrupacion)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}
