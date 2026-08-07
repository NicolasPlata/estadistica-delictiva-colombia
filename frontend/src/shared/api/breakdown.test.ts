import { afterEach, describe, expect, it, vi } from "vitest";
import type { GlobalFilters } from "./types";
import { fetchBreakdown } from "./breakdown";

describe("fetchBreakdown", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the filters as the raw request body and returns the parsed breakdown", async () => {
    const body = {
      region_label: "ANTIOQUIA",
      por_delito: [
        { delito: "ARTICULO 239. HURTO PERSONAS", categoria: "Delitos contra el Patrimonio Económico", cantidad: 142031 },
      ],
      por_categoria: [{ categoria: "Delitos contra el Patrimonio Económico", cantidad: 142031 }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      }),
    );
    const filters: GlobalFilters = { departamento_id: 5 };

    const result = await fetchBreakdown(filters);

    expect(result).toEqual(body);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/v1/stats/breakdown");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(filters);
  });
});
