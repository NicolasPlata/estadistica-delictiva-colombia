import { apiFetch } from "./client";
import type { GlobalFilters, Kpis } from "./types";

/** `POST /api/v1/stats/kpi` — ver `02-api-contracts.md` §2.1. A diferencia
 * de `/map/stats`, el body ES `GlobalFilters` directamente (sin envolver
 * en `{filters, granularidad}`). */
export function fetchKpis(filters: GlobalFilters): Promise<Kpis> {
  return apiFetch<Kpis>("/api/v1/stats/kpi", {
    method: "POST",
    body: JSON.stringify(filters),
  });
}
