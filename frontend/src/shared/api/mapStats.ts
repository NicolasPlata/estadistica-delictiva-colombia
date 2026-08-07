import { apiFetch } from "./client";
import type { GlobalFilters, Granularidad, MapStats, Metrica } from "./types";

/** `POST /api/v1/map/stats` — ver `02-api-contracts.md` §3.2. Dinámico y
 * liviano: se pide en cada cambio de filtros/granularidad/métrica y se
 * aplica sobre la geometría ya cacheada vía `map.setFeatureState` (ADR
 * 0002). `metrica` por default `"ABSOLUTA"` (Fase 6) — omitirlo conserva
 * el comportamiento previo a esa fase. */
export function fetchMapStats(
  filters: GlobalFilters,
  granularidad: Granularidad,
  metrica: Metrica = "ABSOLUTA",
): Promise<MapStats> {
  return apiFetch<MapStats>("/api/v1/map/stats", {
    method: "POST",
    body: JSON.stringify({ filters, granularidad, metrica }),
  });
}
