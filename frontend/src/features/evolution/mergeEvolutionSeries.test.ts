import { describe, expect, it } from "vitest";
import { mergeEvolutionSeries } from "./mergeEvolutionSeries";

describe("mergeEvolutionSeries", () => {
  it("aligns by the shared periodo (same year range for both series)", () => {
    const serieA = [
      { periodo: "2020", cantidad: 100 },
      { periodo: "2021", cantidad: 200 },
    ];
    const serieB = [
      { periodo: "2020", cantidad: 50 },
      { periodo: "2021", cantidad: 60 },
    ];

    expect(mergeEvolutionSeries(serieA, serieB)).toEqual([
      { label: "2020", serieA: 100, serieB: 50, periodoA: "2020", periodoB: "2020" },
      { label: "2021", serieA: 200, serieB: 60, periodoA: "2021", periodoB: "2021" },
    ]);
  });

  it("pads the shorter series with zero instead of dropping the longer one's extra points", () => {
    const serieA = [
      { periodo: "2020", cantidad: 10 },
      { periodo: "2021", cantidad: 20 },
      { periodo: "2022", cantidad: 30 },
    ];
    const serieB = [{ periodo: "2020", cantidad: 5 }];

    const result = mergeEvolutionSeries(serieA, serieB);

    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ label: "2022", serieA: 30, serieB: 0, periodoA: "2022", periodoB: "" });
  });
});
