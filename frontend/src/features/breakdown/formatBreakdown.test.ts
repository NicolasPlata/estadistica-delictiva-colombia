import { describe, expect, it } from "vitest";
import { buildCategoriaDonutData } from "./formatBreakdown";

describe("buildCategoriaDonutData", () => {
  it("orders categories by the fixed CATEGORIAS_ORDEN, not by response order", () => {
    const result = buildCategoriaDonutData([
      { categoria: "Terrorismo", cantidad: 10 },
      { categoria: "Delitos contra el Patrimonio Económico", cantidad: 100 },
    ]);

    expect(result.map((c) => c.name)).toEqual([
      "Delitos contra el Patrimonio Económico",
      "Terrorismo",
    ]);
  });

  it("omits categories absent from the response", () => {
    const result = buildCategoriaDonutData([{ categoria: "Amenazas", cantidad: 5 }]);

    expect(result).toHaveLength(1);
  });

  it("computes each category's percentage of the total", () => {
    const result = buildCategoriaDonutData([
      { categoria: "Delitos contra el Patrimonio Económico", cantidad: 75 },
      { categoria: "Amenazas", cantidad: 25 },
    ]);

    expect(result.find((c) => c.name === "Delitos contra el Patrimonio Económico")!.pct).toBe(75);
    expect(result.find((c) => c.name === "Amenazas")!.pct).toBe(25);
  });

  it("returns an empty array without dividing by zero when there is no data", () => {
    expect(buildCategoriaDonutData([])).toEqual([]);
  });
});
