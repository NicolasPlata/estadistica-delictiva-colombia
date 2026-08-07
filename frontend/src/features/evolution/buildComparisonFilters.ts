import type { GlobalFilters, Granularidad } from "../../shared/api/types";
import type { ComparisonMode, PeriodoRange, SelectedRegion } from "../../shared/store/useAppStore";
import { buildEvolutionFilters } from "./buildEvolutionFilters";

/** Filtros de la Serie B (HU-3.04) — `null` cuando la comparación está
 * apagada o el usuario todavía no terminó de elegirla (región/rango
 * pendientes), para que el panel sepa que aún no debe pedir la Serie B. */
export function buildComparisonFilters(
  baseFilters: GlobalFilters,
  mode: ComparisonMode,
  selectedRegion: SelectedRegion | null,
  comparisonRegion: SelectedRegion | null,
  comparisonPeriodo: PeriodoRange | null,
  granularidad: Granularidad,
): GlobalFilters | null {
  if (mode === "off") return null;

  if (mode === "region") {
    if (!comparisonRegion) return null;
    return buildEvolutionFilters(baseFilters, comparisonRegion, granularidad);
  }

  if (!comparisonPeriodo) return null;
  return {
    ...buildEvolutionFilters(baseFilters, selectedRegion, granularidad),
    anio_inicio: comparisonPeriodo.anioInicio,
    anio_fin: comparisonPeriodo.anioFin,
  };
}
