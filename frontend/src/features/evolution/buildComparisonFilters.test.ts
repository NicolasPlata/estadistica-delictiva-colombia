import { describe, expect, it } from "vitest";
import type { GlobalFilters } from "../../shared/api/types";
import { buildComparisonFilters } from "./buildComparisonFilters";

describe("buildComparisonFilters", () => {
  const baseFilters: GlobalFilters = { anio_inicio: 2020, anio_fin: 2025, genero: "FEMENINO" };

  it("returns null when comparison is off", () => {
    expect(buildComparisonFilters(baseFilters, "off", null, "DEPARTAMENTO")).toBeNull();
  });

  it("returns null in 'region' mode until a comparison region is picked", () => {
    expect(buildComparisonFilters(baseFilters, "region", null, "DEPARTAMENTO")).toBeNull();
  });

  it("'region' mode: Serie B keeps every other filter but swaps the region (HU-3.04)", () => {
    const comparisonRegion = { codigoDane: 5, nombre: "ANTIOQUIA" };

    const result = buildComparisonFilters(baseFilters, "region", comparisonRegion, "DEPARTAMENTO");

    expect(result).toEqual({ ...baseFilters, departamento_id: 5 });
  });
});
