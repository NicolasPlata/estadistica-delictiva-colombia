import { describe, expect, it } from "vitest";
import type { GlobalFilters } from "../../shared/api/types";
import { buildBreakdownFilters } from "./buildBreakdownFilters";

describe("buildBreakdownFilters", () => {
  const baseFilters: GlobalFilters = { anio_inicio: 2020, anio_fin: 2025, genero: "FEMENINO" };
  const selectedRegion = { codigoDane: 5, nombre: "ANTIOQUIA" };

  it("returns the base filters unchanged when there is no selected region", () => {
    expect(buildBreakdownFilters(baseFilters, null, "DEPARTAMENTO", null)).toEqual(baseFilters);
  });

  it("focuses on the region via departamento_id when granularidad is DEPARTAMENTO", () => {
    const result = buildBreakdownFilters(baseFilters, selectedRegion, "DEPARTAMENTO", null);

    expect(result).toEqual({ ...baseFilters, departamento_id: 5 });
  });

  it("focuses on the region via municipio_id when granularidad is MUNICIPIO", () => {
    const municipio = { codigoDane: 5001, nombre: "MEDELLÍN" };

    const result = buildBreakdownFilters(baseFilters, municipio, "MUNICIPIO", null);

    expect(result).toEqual({ ...baseFilters, municipio_id: 5001 });
  });

  it("anio === null keeps the global year range untouched ('todos los años')", () => {
    const result = buildBreakdownFilters(baseFilters, selectedRegion, "DEPARTAMENTO", null);

    expect(result.anio_inicio).toBe(2020);
    expect(result.anio_fin).toBe(2025);
  });

  it("a chosen anio overrides anio_inicio/anio_fin to that single year", () => {
    const result = buildBreakdownFilters(baseFilters, selectedRegion, "DEPARTAMENTO", 2023);

    expect(result.anio_inicio).toBe(2023);
    expect(result.anio_fin).toBe(2023);
    expect(result.departamento_id).toBe(5);
    expect(result.genero).toBe("FEMENINO");
  });
});
