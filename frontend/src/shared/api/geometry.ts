import type { Geometry } from "geojson";
import { apiFetch } from "./client";
import type { Granularidad } from "./types";

/** GeoJSON puro — el backend arma el `FeatureCollection` completo en SQL
 * (ver ADR 0002), el cliente no lo reinterpreta, solo lo pasa a la fuente
 * del mapa. */
export interface RegionFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: Geometry;
    properties: { codigo_dane: number; nombre_region: string };
  }>;
}

/** `GET /api/v1/map/geometry/{granularidad}` — ver `02-api-contracts.md`
 * §3.1. Estática y cacheable; se pide una sola vez por granularidad
 * (cache en `useAppStore`, no aquí). */
export function fetchGeometry(
  granularidad: Granularidad,
): Promise<RegionFeatureCollection> {
  return apiFetch<RegionFeatureCollection>(`/api/v1/map/geometry/${granularidad}`);
}
