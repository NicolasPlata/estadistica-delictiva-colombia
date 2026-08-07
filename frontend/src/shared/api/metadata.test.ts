import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFiltrosVocabulario } from "./metadata";

describe("fetchFiltrosVocabulario", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed vocabulary on a 200 response", async () => {
    const body = {
      delitos: ["HURTO A PERSONAS"],
      armas_medios: ["ARMA DE FUEGO"],
      generos: ["MASCULINO", "FEMENINO", "NO_REPORTADO"],
      grupos_edad: ["DE 18 ANOS Y MAS"],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      }),
    );

    const result = await fetchFiltrosVocabulario();

    expect(result).toEqual(body);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/v1/metadata/filtros");
  });

  it("throws a descriptive error on a non-OK response instead of returning malformed data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "boom" }),
      }),
    );

    await expect(fetchFiltrosVocabulario()).rejects.toThrow(/500/);
  });
});
