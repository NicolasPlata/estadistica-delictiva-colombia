import type { GlobalFilters, Granularidad } from "../../shared/api/types";
import type { ComparisonMode, SelectedRegion } from "../../shared/store/useAppStore";
import { buildEvolutionFilters } from "./buildEvolutionFilters";

/** Filtros de la Serie B (HU-3.04) — `null` cuando la comparación está
 * apagada o el usuario todavía no eligió la segunda región, para que el
 * panel sepa que aún no debe pedir la Serie B. */
export function buildComparisonFilters(
  baseFilters: GlobalFilters,
  mode: ComparisonMode,
  comparisonRegion: SelectedRegion | null,
  granularidad: Granularidad,
): GlobalFilters | null {
  if (mode !== "region" || !comparisonRegion) return null;
  return buildEvolutionFilters(baseFilters, comparisonRegion, granularidad);
}
