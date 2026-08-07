import { apiFetch } from "./client";
import type { GlobalFilters, Granularidad, MapStats } from "./types";

/** `POST /api/v1/map/stats` — ver `02-api-contracts.md` §3.2. Dinámico y
 * liviano: se pide en cada cambio de filtros/granularidad y se aplica
 * sobre la geometría ya cacheada vía `map.setFeatureState` (ADR 0002). */
export function fetchMapStats(
  filters: GlobalFilters,
  granularidad: Granularidad,
): Promise<MapStats> {
  return apiFetch<MapStats>("/api/v1/map/stats", {
    method: "POST",
    body: JSON.stringify({ filters, granularidad }),
  });
}
