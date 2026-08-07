import type { GlobalFilters, Granularidad } from "../../shared/api/types";
import type { SelectedRegion } from "../../shared/store/useAppStore";

/** Enfoca `GlobalFilters` en el territorio aislado (HU-3.03) sin tocar el
 * resto de filtros activos — `null` deja la vista nacional (HU-3.02). El
 * `codigo_dane` se traduce a `departamento_id`/`municipio_id` según la
 * granularidad bajo la que se seleccionó (son campos mutuamente
 * excluyentes en el contrato de `GlobalFilters`). */
export function buildEvolutionFilters(
  baseFilters: GlobalFilters,
  selectedRegion: SelectedRegion | null,
  granularidad: Granularidad,
): GlobalFilters {
  if (!selectedRegion) return baseFilters;

  return granularidad === "DEPARTAMENTO"
    ? { ...baseFilters, departamento_id: selectedRegion.codigoDane }
    : { ...baseFilters, municipio_id: selectedRegion.codigoDane };
}
