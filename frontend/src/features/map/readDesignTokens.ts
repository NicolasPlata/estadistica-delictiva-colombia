import type { ChoroplethColors } from "./choropleth";

/** Lee un custom property de `:root` en tiempo real — los valores cambian
 * con `[data-theme]` (tokens.css), así que esto siempre refleja el tema
 * activo sin necesidad de que este módulo sepa nada de temas. */
function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function readChoroplethRamp(): ChoroplethColors {
  return [
    readCssVar("--choropleth-1"),
    readCssVar("--choropleth-2"),
    readCssVar("--choropleth-3"),
    readCssVar("--choropleth-4"),
    readCssVar("--choropleth-5"),
  ];
}

/** HU-1.02: las regiones sin datos se pintan sin relleno (revela el mapa
 * base) — el "color neutro" real es el borde, no el fill; ver
 * `readNoDataBorder`. Se mantiene por si se necesita un fill neutro en el
 * futuro (ej. exportar una imagen estática del mapa). */
export function readSurfaceCanvas(): string {
  return readCssVar("--surface-canvas");
}

export function readBorderColor(): string {
  return readCssVar("--border");
}

/** Usado para resaltar el territorio aislado en el mapa (HU-3.03). */
export function readAccentColor(): string {
  return readCssVar("--accent-interactive");
}

/** Límite departamental de referencia, siempre visible sobre el mapa
 * independientemente de la granularidad activa (HU-1.04). */
export function readLimiteDepartamentalColor(): string {
  return readCssVar("--limite-departamental");
}
