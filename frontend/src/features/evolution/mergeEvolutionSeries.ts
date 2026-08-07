import type { EvolutionPoint } from "../../shared/api/types";

export interface ComparisonPoint {
  label: string;
  serieA: number;
  serieB: number;
  periodoA: string;
  periodoB: string;
}

/** Superpone dos series en un único dataset (HU-3.04: "un gráfico, no
 * dos"). "region" comparte el mismo rango de años, así que alinea por el
 * `periodo` real; "periodo" compara rangos de años distintos, así que
 * alinea por posición relativa ("Año 1", "Año 2"...) — comparar por
 * calendario no tendría sentido ahí (dataviz: "indexed to a common base"). */
export function mergeEvolutionSeries(
  serieA: EvolutionPoint[],
  serieB: EvolutionPoint[],
  mode: "region" | "periodo",
): ComparisonPoint[] {
  const length = Math.max(serieA.length, serieB.length);

  return Array.from({ length }, (_, index) => {
    const puntoA = serieA[index];
    const puntoB = serieB[index];
    return {
      label: mode === "region" ? (puntoA?.periodo ?? puntoB?.periodo ?? "") : `Año ${index + 1}`,
      serieA: puntoA?.cantidad ?? 0,
      serieB: puntoB?.cantidad ?? 0,
      periodoA: puntoA?.periodo ?? "",
      periodoB: puntoB?.periodo ?? "",
    };
  });
}
