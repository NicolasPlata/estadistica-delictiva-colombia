import { describe, expect, it } from "vitest";
import type { GlobalFilters } from "../../shared/api/types";
import { buildEvolutionFilters } from "./buildEvolutionFilters";

describe("buildEvolutionFilters", () => {
  const baseFilters: GlobalFilters = { anio_inicio: 2020, anio_fin: 2025, genero: "FEMENINO" };

  it("returns the base filters unchanged when no region is selected (vista nacional, HU-3.02)", () => {
    expect(buildEvolutionFilters(baseFilters, null, "DEPARTAMENTO")).toEqual(baseFilters);
  });

  it("adds departamento_id when a region is selected under granularidad DEPARTAMENTO", () => {
    const result = buildEvolutionFilters(baseFilters, { codigoDane: 11, nombre: "BOGOTÁ" }, "DEPARTAMENTO");

    expect(result).toEqual({ ...baseFilters, departamento_id: 11 });
  });

  it("adds municipio_id when a region is selected under granularidad MUNICIPIO", () => {
    const result = buildEvolutionFilters(baseFilters, { codigoDane: 11001, nombre: "BOGOTÁ" }, "MUNICIPIO");

    expect(result).toEqual({ ...baseFilters, municipio_id: 11001 });
  });

  it("never sets both departamento_id and municipio_id at once", () => {
    const result = buildEvolutionFilters(baseFilters, { codigoDane: 11001, nombre: "BOGOTÁ" }, "MUNICIPIO");

    expect(result.departamento_id).toBeUndefined();
  });
});
