import { afterEach, describe, expect, it, vi } from "vitest";
import type { GlobalFilters } from "./types";
import { fetchEvolution } from "./evolution";

describe("fetchEvolution", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the filters and agrupacion, and returns the parsed series", async () => {
    const body = {
      region_label: "BOGOTÁ, D.C.",
      series: [
        { periodo: "2020", cantidad: 85000 },
        { periodo: "2021", cantidad: 91000 },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      }),
    );
    const filters: GlobalFilters = { municipio_id: 11001 };

    const result = await fetchEvolution(filters, "ANUAL");

    expect(result).toEqual(body);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/v1/stats/evolution");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ filters, agrupacion: "ANUAL" });
  });
});
