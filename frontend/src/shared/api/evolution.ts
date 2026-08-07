import { apiFetch } from "./client";
import type { Agrupacion, Evolution, GlobalFilters } from "./types";

/** `POST /api/v1/stats/evolution` — ver `02-api-contracts.md` §2.2. */
export function fetchEvolution(
  filters: GlobalFilters,
  agrupacion: Agrupacion,
): Promise<Evolution> {
  return apiFetch<Evolution>("/api/v1/stats/evolution", {
    method: "POST",
    body: JSON.stringify({ filters, agrupacion }),
  });
}
