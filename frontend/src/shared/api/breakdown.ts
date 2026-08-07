import { apiFetch } from "./client";
import type { Breakdown, GlobalFilters } from "./types";

/** `POST /api/v1/stats/breakdown` — ver `02-api-contracts.md` §2.3 (Fase
 * 7). Igual que `/stats/kpi`, el body es `GlobalFilters` directamente. */
export function fetchBreakdown(filters: GlobalFilters): Promise<Breakdown> {
  return apiFetch<Breakdown>("/api/v1/stats/breakdown", {
    method: "POST",
    body: JSON.stringify(filters),
  });
}
