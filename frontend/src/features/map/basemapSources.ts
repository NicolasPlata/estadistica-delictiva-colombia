import type { Basemap } from "../../shared/api/types";

export interface BasemapSource {
  label: string;
  tiles: string[];
  attribution: string;
  maxzoom: number;
}

/** Fuentes raster XYZ de los 3 mapas base (RF-10, HU-1.05) — ver
 * `docs/architecture/01-arquitectura.md#mapas-base-basemaps` para las URLs
 * y la atribución legal exigida por cada proveedor (RNF-09). Independientes
 * de la capa de choropleth: cambiar de mapa base nunca recarga geometría
 * ni estadísticas. */
export const BASEMAP_SOURCES: Record<Basemap, BasemapSource> = {
  osm: {
    label: "OpenStreetMap",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap contributors",
    maxzoom: 19,
  },
  satelital: {
    label: "Satelital",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxzoom: 19,
  },
  oscuro: {
    label: "Oscuro",
    tiles: ["a", "b", "c", "d"].map(
      (subdomain) => `https://${subdomain}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`,
    ),
    attribution: "© OpenStreetMap contributors © CARTO",
    maxzoom: 20,
  },
};
