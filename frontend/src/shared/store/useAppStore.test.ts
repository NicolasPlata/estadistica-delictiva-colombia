import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FiltrosVocabulario } from "../api/types";
import { useAppStore } from "./useAppStore";

vi.mock("../api/metadata", () => ({
  fetchFiltrosVocabulario: vi.fn(),
}));

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
    vi.clearAllMocks();
  });

  it("defaults to dark theme (RNF-04) and its matching basemap", () => {
    const state = useAppStore.getState();

    expect(state.theme).toBe("dark");
    expect(state.basemap).toBe("oscuro");
  });

  it("defaults filters to an empty (unfiltered) GlobalFilters", () => {
    expect(useAppStore.getState().filters).toEqual({});
  });

  it("switching to light resets the basemap to osm (HU-1.05)", () => {
    useAppStore.getState().setBasemap("satelital");

    useAppStore.getState().setTheme("light");

    expect(useAppStore.getState().theme).toBe("light");
    expect(useAppStore.getState().basemap).toBe("osm");
  });

  it("switching to dark resets the basemap to oscuro even after a manual pick", () => {
    useAppStore.getState().setTheme("light");
    useAppStore.getState().setBasemap("satelital");

    useAppStore.getState().setTheme("dark");

    expect(useAppStore.getState().basemap).toBe("oscuro");
  });

  it("allows picking satelital manually without it being tied to a theme", () => {
    useAppStore.getState().setBasemap("satelital");

    expect(useAppStore.getState().basemap).toBe("satelital");
  });

  it("merges partial filter updates instead of replacing the whole object", () => {
    useAppStore.getState().setFilters({ anio_inicio: 2023 });
    useAppStore.getState().setFilters({ genero: "FEMENINO" });

    expect(useAppStore.getState().filters).toEqual({
      anio_inicio: 2023,
      genero: "FEMENINO",
    });
  });

  it("defaults granularidad to DEPARTAMENTO (HU-1.04)", () => {
    expect(useAppStore.getState().granularidad).toBe("DEPARTAMENTO");
  });

  it("setGranularidad switches the toggle", () => {
    useAppStore.getState().setGranularidad("MUNICIPIO");

    expect(useAppStore.getState().granularidad).toBe("MUNICIPIO");
  });

  it("defaults vocabulario status to 'idle' with no data", () => {
    const state = useAppStore.getState();

    expect(state.vocabularioStatus).toBe("idle");
    expect(state.vocabulario).toBeNull();
  });

  it("loadVocabulario fetches once and stores the result as 'ready'", async () => {
    const { fetchFiltrosVocabulario } = await import("../api/metadata");
    const vocab: FiltrosVocabulario = {
      delitos: ["HURTO A PERSONAS"],
      armas_medios: ["ARMA DE FUEGO"],
      generos: ["MASCULINO", "FEMENINO", "NO_REPORTADO"],
      grupos_edad: ["DE 18 ANOS Y MAS"],
    };
    vi.mocked(fetchFiltrosVocabulario).mockResolvedValue(vocab);

    await useAppStore.getState().loadVocabulario();

    expect(useAppStore.getState().vocabularioStatus).toBe("ready");
    expect(useAppStore.getState().vocabulario).toEqual(vocab);
  });

  it("loadVocabulario sets status to 'error' when the request fails, without throwing", async () => {
    const { fetchFiltrosVocabulario } = await import("../api/metadata");
    vi.mocked(fetchFiltrosVocabulario).mockRejectedValue(new Error("boom"));

    await expect(useAppStore.getState().loadVocabulario()).resolves.toBeUndefined();

    expect(useAppStore.getState().vocabularioStatus).toBe("error");
    expect(useAppStore.getState().vocabulario).toBeNull();
  });
});
