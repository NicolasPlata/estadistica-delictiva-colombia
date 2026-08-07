import { afterEach, describe, expect, it, vi } from "vitest";
import type { GlobalFilters } from "./types";
import { fetchKpis } from "./kpis";

describe("fetchKpis", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the filters as the raw request body and returns the parsed KPIs", async () => {
    const body = {
      total_delitos: 450210,
      variacion_porcentual: 5.4,
      delito_mas_comun: "HURTO A PERSONAS",
      mes_mayor_impacto: "2023-07",
      distribucion_genero: { MASCULINO: 210000, FEMENINO: 230000, NO_REPORTADO: 10210 },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      }),
    );
    const filters: GlobalFilters = { anio_inicio: 2023 };

    const result = await fetchKpis(filters);

    expect(result).toEqual(body);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/v1/stats/kpi");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(filters);
  });
});
