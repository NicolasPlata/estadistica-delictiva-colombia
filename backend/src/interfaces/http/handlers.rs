use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use axum::extract::State;
use axum::http::header;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use super::error::AppError;
use super::extractors::{AppJson, AppPath};
use super::routes::AppState;
use crate::application::get_map_stats as get_map_stats_uc;
use crate::application::{get_evolution, get_filtros, get_geometry, get_kpis};
use crate::domain::evolution::{Agrupacion, Evolution};
use crate::domain::filters::GlobalFilters;
use crate::domain::granularidad::Granularidad;
use crate::domain::kpis::Kpis;
use crate::domain::map_stats::MapStats;
use crate::domain::metrica::Metrica;
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
) -> Result<Json<FiltrosVocabulario>, AppError> {
    Ok(Json(get_filtros::execute(&state.filtros_repo).await?))
}

/// `POST /api/v1/stats/kpi` — ver `02-api-contracts.md` §2.1 (HU-3.01).
/// El body es `GlobalFilters` directamente (no envuelto en `{"filters": ...}`
/// como sí lo hace `/stats/evolution`, que además necesita el parámetro
/// `agrupacion` junto a los filtros).
pub async fn get_kpi_stats(
    State(state): State<AppState>,
    AppJson(filters): AppJson<GlobalFilters>,
) -> Result<Json<Kpis>, AppError> {
    Ok(Json(get_kpis::execute(&state.stats_repo, &filters).await?))
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
    AppJson(body): AppJson<EvolutionRequestBody>,
) -> Result<Json<Evolution>, AppError> {
    Ok(Json(
        get_evolution::execute(&state.stats_repo, &body.filters, body.agrupacion).await?,
    ))
}

/// `GET /api/v1/map/geometry/{granularidad}` — ver `02-api-contracts.md`
/// §3.1 (ADR 0002, Hito 4.1). No usa `Json<T>` de retorno porque además del
/// body necesita las cabeceras `Cache-Control`/`ETag` para cacheo agresivo
/// (RNF-08) — el `ETag` es un hash del contenido, no un valor fijo, así que
/// cambia automáticamente si la geometría subyacente cambia.
pub async fn get_map_geometry(
    State(state): State<AppState>,
    AppPath(granularidad): AppPath<Granularidad>,
) -> Result<Response, AppError> {
    let geojson = get_geometry::execute(&state.geometry_repo, granularidad).await?;

    let body = serde_json::to_string(&geojson)
        .map_err(|e| AppError::Internal(format!("no se pudo serializar el GeoJSON: {e}")))?;

    let mut hasher = DefaultHasher::new();
    body.hash(&mut hasher);
    let etag = format!("\"{:x}\"", hasher.finish());

    Ok((
        [
            (header::CACHE_CONTROL, "public, max-age=86400".to_string()),
            (header::ETAG, etag),
            (header::CONTENT_TYPE, "application/json".to_string()),
        ],
        body,
    )
        .into_response())
}

/// Body de `POST /api/v1/map/stats` (`02-api-contracts.md` §3.2) — mismo
/// razonamiento que `EvolutionRequestBody`: forma de empaquetado del wire
/// format de este endpoint, no un concepto de dominio. `metrica` es nuevo
/// (Fase 6) y por defecto `Absoluta` (`#[serde(default)]` sobre un enum que
/// implementa `Default`) — un cliente que no lo envíe conserva el
/// comportamiento previo a esta fase, sin romper el contrato existente.
#[derive(Debug, Deserialize)]
pub struct MapStatsRequestBody {
    #[serde(default)]
    filters: GlobalFilters,
    granularidad: Granularidad,
    #[serde(default)]
    metrica: Metrica,
}

/// `POST /api/v1/map/stats` — ver `02-api-contracts.md` §3.2
/// (HU-1.02/1.03/1.04, Fase 6 para `metrica`).
pub async fn get_map_stats(
    State(state): State<AppState>,
    AppJson(body): AppJson<MapStatsRequestBody>,
) -> Result<Json<MapStats>, AppError> {
    Ok(Json(
        get_map_stats_uc::execute(
            &state.stats_repo,
            &body.filters,
            body.granularidad,
            body.metrica,
        )
        .await?,
    ))
}
