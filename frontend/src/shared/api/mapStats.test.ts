import { afterEach, describe, expect, it, vi } from "vitest";
import type { GlobalFilters } from "./types";
import { fetchMapStats } from "./mapStats";

describe("fetchMapStats", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the filters and granularidad, defaulting metrica to ABSOLUTA, and returns the parsed stats", async () => {
    const body = { granularidad: "DEPARTAMENTO", data: { "5": 100 } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      }),
    );
    const filters: GlobalFilters = { anio_inicio: 2023 };

    const result = await fetchMapStats(filters, "DEPARTAMENTO");

    expect(result).toEqual(body);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/v1/map/stats");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      filters,
      granularidad: "DEPARTAMENTO",
      metrica: "ABSOLUTA",
    });
  });

  it("posts an explicit metrica when given (Fase 6)", async () => {
    const body = { granularidad: "MUNICIPIO", data: { "11001": 312.4 } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      }),
    );

    await fetchMapStats({}, "MUNICIPIO", "TASA");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      filters: {},
      granularidad: "MUNICIPIO",
      metrica: "TASA",
    });
  });
});
