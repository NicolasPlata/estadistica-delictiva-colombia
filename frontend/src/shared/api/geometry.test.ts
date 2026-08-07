import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGeometry } from "./geometry";

describe("fetchGeometry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the geometry for the given granularidad", async () => {
    const featureCollection = { type: "FeatureCollection", features: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(featureCollection),
      }),
    );

    const result = await fetchGeometry("MUNICIPIO");

    expect(result).toEqual(featureCollection);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/v1/map/geometry/MUNICIPIO");
  });
});
