import type { EvolutionPoint } from "../../shared/api/types";

export interface ComparisonPoint {
  label: string;
  serieA: number;
  serieB: number;
  periodoA: string;
  periodoB: string;
}

/** Superpone dos series en un único dataset (HU-3.04: "un gráfico, no
 * dos"). Ambas series comparten el mismo rango de años (comparación por
 * región), así que se alinean por el `periodo` real. */
export function mergeEvolutionSeries(serieA: EvolutionPoint[], serieB: EvolutionPoint[]): ComparisonPoint[] {
  const length = Math.max(serieA.length, serieB.length);

  return Array.from({ length }, (_, index) => {
    const puntoA = serieA[index];
    const puntoB = serieB[index];
    return {
      label: puntoA?.periodo ?? puntoB?.periodo ?? "",
      serieA: puntoA?.cantidad ?? 0,
      serieB: puntoB?.cantidad ?? 0,
      periodoA: puntoA?.periodo ?? "",
      periodoB: puntoB?.periodo ?? "",
    };
  });
}
