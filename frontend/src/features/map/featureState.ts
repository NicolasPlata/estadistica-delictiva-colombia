import type { MapStats } from "../../shared/api/types";

export interface FeatureStateEntry {
  id: number;
  cantidad: number;
}

/** Las claves de `MapStats.data` son las claves de un objeto JSON (siempre
 * string, ej. `"5"`), pero la propiedad `codigo_dane` del GeoJSON (usada
 * como `promoteId` de la fuente) es numérica — `map.setFeatureState`
 * necesita que el `id` calce en tipo, no solo en valor. */
export function toFeatureStateEntries(stats: MapStats): FeatureStateEntry[] {
  return Object.entries(stats.data).map(([codigoDane, cantidad]) => ({
    id: Number(codigoDane),
    cantidad,
  }));
}
