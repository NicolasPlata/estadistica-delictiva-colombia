import { describe, expect, it } from "vitest";
import { mergeEvolutionSeries } from "./mergeEvolutionSeries";

describe("mergeEvolutionSeries", () => {
  it("'region' mode aligns by the shared periodo (same year range for both series)", () => {
    const serieA = [
      { periodo: "2020", cantidad: 100 },
      { periodo: "2021", cantidad: 200 },
    ];
    const serieB = [
      { periodo: "2020", cantidad: 50 },
      { periodo: "2021", cantidad: 60 },
    ];

    expect(mergeEvolutionSeries(serieA, serieB, "region")).toEqual([
      { label: "2020", serieA: 100, serieB: 50, periodoA: "2020", periodoB: "2020" },
      { label: "2021", serieA: 200, serieB: 60, periodoA: "2021", periodoB: "2021" },
    ]);
  });

  it("'periodo' mode aligns by relative position, not by calendar year (distintos rangos de años)", () => {
    const serieA = [
      { periodo: "2023", cantidad: 100 },
      { periodo: "2024", cantidad: 200 },
    ];
    const serieB = [
      { periodo: "2015", cantidad: 40 },
      { periodo: "2016", cantidad: 55 },
    ];

    expect(mergeEvolutionSeries(serieA, serieB, "periodo")).toEqual([
      { label: "Año 1", serieA: 100, serieB: 40, periodoA: "2023", periodoB: "2015" },
      { label: "Año 2", serieA: 200, serieB: 55, periodoA: "2024", periodoB: "2016" },
    ]);
  });

  it("pads the shorter series with zero instead of dropping the longer one's extra points", () => {
    const serieA = [
      { periodo: "2020", cantidad: 10 },
      { periodo: "2021", cantidad: 20 },
      { periodo: "2022", cantidad: 30 },
    ];
    const serieB = [{ periodo: "2020", cantidad: 5 }];

    const result = mergeEvolutionSeries(serieA, serieB, "region");

    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ label: "2022", serieA: 30, serieB: 0, periodoA: "2022", periodoB: "" });
  });
});
