import { describe, expect, it } from "vitest";
import { formatPeriodo } from "./formatPeriodo";

describe("formatPeriodo", () => {
  it("returns an ANUAL periodo unchanged (ya es solo el año)", () => {
    expect(formatPeriodo("2020", "ANUAL")).toBe("2020");
  });

  it("abbreviates a MENSUAL periodo to 'Mes Año'", () => {
    expect(formatPeriodo("2023-07", "MENSUAL")).toBe("Jul 2023");
  });

  it("handles January and December correctly", () => {
    expect(formatPeriodo("2024-01", "MENSUAL")).toBe("Ene 2024");
    expect(formatPeriodo("2024-12", "MENSUAL")).toBe("Dic 2024");
  });
});
