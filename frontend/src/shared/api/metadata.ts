import { apiFetch } from "./client";
import type { FiltrosVocabulario } from "./types";

/** `GET /api/v1/metadata/filtros` — ver `02-api-contracts.md` §4.1. */
export function fetchFiltrosVocabulario(): Promise<FiltrosVocabulario> {
  return apiFetch<FiltrosVocabulario>("/api/v1/metadata/filtros");
}
