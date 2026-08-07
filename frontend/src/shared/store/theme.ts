import type { Basemap, Theme } from "../api/types";

/**
 * Mapa base por defecto para cada tema (HU-1.05, RF-10). Cambiar de tema
 * siempre reestablece el mapa base a este valor, descartando cualquier
 * selección manual previa — la orquestación de "cuándo" vive en el store
 * (`useAppStore.setTheme`), esta función solo resuelve el "a qué".
 */
export function defaultBasemapForTheme(theme: Theme): Basemap {
  return theme === "light" ? "osm" : "oscuro";
}
