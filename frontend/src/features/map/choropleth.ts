export type ChoroplethColors = readonly [string, string, string, string, string];
export type ChoroplethBreaks = readonly [number, number, number, number];

/** Expresión JSON de estilo MapLibre — se tipa como árbol recursivo propio
 * en vez de importar `ExpressionSpecification` del style-spec (unión
 * recursiva enorme, pensada para literales inline, no para construirse
 * mediante una función); el cast ocurre en el único punto de contacto con
 * la prop `paint` de `<Layer>`. */
export type MapLibreExpression = (string | number | null | MapLibreExpression)[];

/** Clasificación por cuantiles (rango más cercano, sin interpolar) — 5
 * cubetas para calzar con los 5 pasos fijos de la rampa del choropleth
 * (00-design-system.md, Reconciliación 3). `null` cuando no hay datos que
 * clasificar (todas las regiones "sin dato", HU-1.02). */
export function computeQuantileBreaks(values: number[]): ChoroplethBreaks | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => {
    const index = Math.max(0, Math.ceil(p * sorted.length) - 1);
    return sorted[Math.min(index, sorted.length - 1)];
  };

  return [percentile(0.2), percentile(0.4), percentile(0.6), percentile(0.8)];
}

/** `case` + `step` de MapLibre: pinta el color neutro cuando la región no
 * tiene `feature-state` asignado (sin datos en el filtro actual, HU-1.02)
 * y, si lo tiene, clasifica `cantidad` en la rampa según los cuantiles. */
export function buildChoroplethExpression(
  breaks: ChoroplethBreaks,
  colors: ChoroplethColors,
  neutralColor: string,
): MapLibreExpression {
  return [
    "case",
    ["==", ["feature-state", "cantidad"], null],
    neutralColor,
    [
      "step",
      ["feature-state", "cantidad"],
      colors[0],
      breaks[0],
      colors[1],
      breaks[1],
      colors[2],
      breaks[2],
      colors[3],
      breaks[3],
      colors[4],
    ],
  ];
}
