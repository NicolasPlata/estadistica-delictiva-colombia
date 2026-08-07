import { describe, expect, it } from "vitest";
import type { MapStats } from "../../shared/api/types";
import { toFeatureStateEntries } from "./featureState";

describe("toFeatureStateEntries", () => {
  it("converts string codigo_dane keys to numeric ids (must match the GeoJSON promoteId type)", () => {
    const stats: MapStats = {
      granularidad: "DEPARTAMENTO",
      data: { "5": 1200, "11": 3400 },
    };

    expect(toFeatureStateEntries(stats)).toEqual([
      { id: 5, cantidad: 1200 },
      { id: 11, cantidad: 3400 },
    ]);
  });

  it("returns an empty list when no region has data (HU-1.02: todo se pinta neutro)", () => {
    const stats: MapStats = { granularidad: "MUNICIPIO", data: {} };

    expect(toFeatureStateEntries(stats)).toEqual([]);
  });
});
