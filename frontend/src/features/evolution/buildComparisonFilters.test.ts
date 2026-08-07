import { describe, expect, it } from "vitest";
import type { GlobalFilters } from "../../shared/api/types";
import { buildComparisonFilters } from "./buildComparisonFilters";

describe("buildComparisonFilters", () => {
  const baseFilters: GlobalFilters = { anio_inicio: 2020, anio_fin: 2025, genero: "FEMENINO" };
  const selectedRegion = { codigoDane: 11, nombre: "BOGOTÁ" };

  it("returns null when comparison is off", () => {
    expect(buildComparisonFilters(baseFilters, "off", selectedRegion, null, null, "DEPARTAMENTO")).toBeNull();
  });

  it("returns null in 'region' mode until a comparison region is picked", () => {
    expect(buildComparisonFilters(baseFilters, "region", selectedRegion, null, null, "DEPARTAMENTO")).toBeNull();
  });

  it("'region' mode: Serie B keeps every other filter but swaps the region (HU-3.04)", () => {
    const comparisonRegion = { codigoDane: 5, nombre: "ANTIOQUIA" };

    const result = buildComparisonFilters(baseFilters, "region", selectedRegion, comparisonRegion, null, "DEPARTAMENTO");

    expect(result).toEqual({ ...baseFilters, departamento_id: 5 });
  });

  it("returns null in 'periodo' mode until a comparison range is picked", () => {
    expect(buildComparisonFilters(baseFilters, "periodo", selectedRegion, null, null, "DEPARTAMENTO")).toBeNull();
  });

  it("'periodo' mode: Serie B keeps the same region but swaps the year range (HU-3.04)", () => {
    const result = buildComparisonFilters(
      baseFilters,
      "periodo",
      selectedRegion,
      null,
      { anioInicio: 2015, anioFin: 2019 },
      "DEPARTAMENTO",
    );

    expect(result).toEqual({ ...baseFilters, departamento_id: 11, anio_inicio: 2015, anio_fin: 2019 });
  });
});
