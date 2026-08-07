import { describe, expect, it } from "vitest";
import { buildGeneroDonutData, formatMesMayorImpacto, formatVariacion } from "./formatKpis";

describe("formatVariacion", () => {
  it("marks an increase as critical (más delitos es una mala noticia)", () => {
    expect(formatVariacion(5.4)).toEqual({ text: "+5.4%", tone: "critical" });
  });

  it("marks a decrease as good", () => {
    expect(formatVariacion(-3.2)).toEqual({ text: "-3.2%", tone: "good" });
  });

  it("marks no change as neutral", () => {
    expect(formatVariacion(0)).toEqual({ text: "0.0%", tone: "neutral" });
  });

  it("keeps the documented +100% convention (sin datos en el periodo anterior) as critical", () => {
    expect(formatVariacion(100)).toEqual({ text: "+100.0%", tone: "critical" });
  });
});

describe("formatMesMayorImpacto", () => {
  it("formats a YYYY-MM period with the Spanish month name capitalized", () => {
    expect(formatMesMayorImpacto("2023-07")).toBe("Julio 2023");
  });

  it("handles single-digit-padded months at the start and end of the year", () => {
    expect(formatMesMayorImpacto("2024-01")).toBe("Enero 2024");
    expect(formatMesMayorImpacto("2024-12")).toBe("Diciembre 2024");
  });

  it("falls back to a placeholder when there is no data", () => {
    expect(formatMesMayorImpacto(null)).toBe("Sin datos");
  });
});

describe("buildGeneroDonutData", () => {
  it("maps the raw distribution into labeled slices in a stable order", () => {
    const data = buildGeneroDonutData({
      MASCULINO: 210000,
      FEMENINO: 230000,
      NO_REPORTADO: 10210,
    });

    expect(data).toEqual([
      { name: "Masculino", value: 210000 },
      { name: "Femenino", value: 230000 },
      { name: "No reportado", value: 10210 },
    ]);
  });

  it("omits genders absent from the response instead of showing a zero slice", () => {
    const data = buildGeneroDonutData({ MASCULINO: 5, FEMENINO: 3 });

    expect(data).toEqual([
      { name: "Masculino", value: 5 },
      { name: "Femenino", value: 3 },
    ]);
  });
});
