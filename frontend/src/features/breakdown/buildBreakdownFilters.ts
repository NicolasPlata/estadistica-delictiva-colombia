import type { GlobalFilters, Granularidad } from "../../shared/api/types";
import type { SelectedRegion } from "../../shared/store/useAppStore";
import { buildEvolutionFilters } from "../evolution/buildEvolutionFilters";

/** Filtros de `POST /api/v1/stats/breakdown` (Fase 7): reutiliza
 * `buildEvolutionFilters` para enfocar la región (mismo mapeo
 * `codigo_dane` → `departamento_id`/`municipio_id` según granularidad),
 * y opcionalmente sobreescribe el rango de años con el selector local del
 * panel — `anio === null` es "todos los años" (no se sobreescribe nada,
 * queda el rango global activo). */
export function buildBreakdownFilters(
  baseFilters: GlobalFilters,
  selectedRegion: SelectedRegion | null,
  granularidad: Granularidad,
  anio: number | null,
): GlobalFilters {
  const regionFilters = buildEvolutionFilters(baseFilters, selectedRegion, granularidad);
  if (anio === null) return regionFilters;
  return { ...regionFilters, anio_inicio: anio, anio_fin: anio };
}
