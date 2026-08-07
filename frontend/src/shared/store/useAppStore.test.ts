import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegionFeatureCollection } from "../api/geometry";
import type { FiltrosVocabulario } from "../api/types";
import { useAppStore } from "./useAppStore";

vi.mock("../api/metadata", () => ({
  fetchFiltrosVocabulario: vi.fn(),
}));

vi.mock("../api/geometry", () => ({
  fetchGeometry: vi.fn(),
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

  it("defaults metrica to TASA (pedido explícito del usuario, 2026-08-07)", () => {
    expect(useAppStore.getState().metrica).toBe("TASA");
  });

  it("setMetrica switches the toggle", () => {
    useAppStore.getState().setMetrica("ABSOLUTA");

    expect(useAppStore.getState().metrica).toBe("ABSOLUTA");
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

  it("defaults geometry status to 'idle' for every granularidad", () => {
    const state = useAppStore.getState();

    expect(state.geometryStatus).toEqual({});
    expect(state.geometryCache).toEqual({});
  });

  it("loadGeometry fetches and caches the geometry keyed by granularidad", async () => {
    const { fetchGeometry } = await import("../api/geometry");
    const geojson: RegionFeatureCollection = { type: "FeatureCollection", features: [] };
    vi.mocked(fetchGeometry).mockResolvedValue(geojson);

    await useAppStore.getState().loadGeometry("DEPARTAMENTO");

    expect(useAppStore.getState().geometryStatus.DEPARTAMENTO).toBe("ready");
    expect(useAppStore.getState().geometryCache.DEPARTAMENTO).toEqual(geojson);
    expect(fetchGeometry).toHaveBeenCalledWith("DEPARTAMENTO");
  });

  it("loadGeometry does not re-fetch a granularidad that is already cached (ADR 0002: una sola vez por sesión)", async () => {
    const { fetchGeometry } = await import("../api/geometry");
    const geojson: RegionFeatureCollection = { type: "FeatureCollection", features: [] };
    vi.mocked(fetchGeometry).mockResolvedValue(geojson);

    await useAppStore.getState().loadGeometry("MUNICIPIO");
    await useAppStore.getState().loadGeometry("MUNICIPIO");

    expect(fetchGeometry).toHaveBeenCalledTimes(1);
  });

  it("loadGeometry sets status to 'error' for that granularidad when the request fails", async () => {
    const { fetchGeometry } = await import("../api/geometry");
    vi.mocked(fetchGeometry).mockRejectedValue(new Error("boom"));

    await expect(useAppStore.getState().loadGeometry("MUNICIPIO")).resolves.toBeUndefined();

    expect(useAppStore.getState().geometryStatus.MUNICIPIO).toBe("error");
    expect(useAppStore.getState().geometryCache.MUNICIPIO).toBeUndefined();
  });

  it("defaults selectedRegion to null (HU-3.03: sin territorio aislado)", () => {
    expect(useAppStore.getState().selectedRegion).toBeNull();
  });

  it("setSelectedRegion stores the clicked region (HU-3.03)", () => {
    useAppStore.getState().setSelectedRegion({ codigoDane: 11, nombre: "BOGOTÁ, D.C." });

    expect(useAppStore.getState().selectedRegion).toEqual({ codigoDane: 11, nombre: "BOGOTÁ, D.C." });
  });

  it("clearSelectedRegion resets it back to null", () => {
    useAppStore.getState().setSelectedRegion({ codigoDane: 11, nombre: "BOGOTÁ, D.C." });

    useAppStore.getState().clearSelectedRegion();

    expect(useAppStore.getState().selectedRegion).toBeNull();
  });

  it("switching granularidad clears the selected region (el codigo_dane ya no refiere a la misma entidad)", () => {
    useAppStore.getState().setSelectedRegion({ codigoDane: 11, nombre: "BOGOTÁ, D.C." });

    useAppStore.getState().setGranularidad("MUNICIPIO");

    expect(useAppStore.getState().selectedRegion).toBeNull();
  });

  it("defaults comparisonMode to 'off' with no comparison region (HU-3.04)", () => {
    const state = useAppStore.getState();

    expect(state.comparisonMode).toBe("off");
    expect(state.comparisonRegion).toBeNull();
  });

  it("setComparisonMode switches modes", () => {
    useAppStore.getState().setComparisonMode("region");

    expect(useAppStore.getState().comparisonMode).toBe("region");
  });

  it("turning comparison off clears any comparison region already picked", () => {
    useAppStore.getState().setComparisonMode("region");
    useAppStore.getState().setComparisonRegion({ codigoDane: 5, nombre: "ANTIOQUIA" });

    useAppStore.getState().setComparisonMode("off");

    expect(useAppStore.getState().comparisonRegion).toBeNull();
  });

  it("setComparisonRegion stores Serie B's pick", () => {
    useAppStore.getState().setComparisonRegion({ codigoDane: 5, nombre: "ANTIOQUIA" });

    expect(useAppStore.getState().comparisonRegion).toEqual({ codigoDane: 5, nombre: "ANTIOQUIA" });
  });

  it("picking a new primary region resets any comparison already set up", () => {
    useAppStore.getState().setSelectedRegion({ codigoDane: 11, nombre: "BOGOTÁ, D.C." });
    useAppStore.getState().setComparisonMode("region");
    useAppStore.getState().setComparisonRegion({ codigoDane: 5, nombre: "ANTIOQUIA" });

    useAppStore.getState().setSelectedRegion({ codigoDane: 76, nombre: "VALLE DEL CAUCA" });

    expect(useAppStore.getState().comparisonMode).toBe("off");
    expect(useAppStore.getState().comparisonRegion).toBeNull();
  });

  it("clearing the selected region also resets comparison state", () => {
    useAppStore.getState().setSelectedRegion({ codigoDane: 11, nombre: "BOGOTÁ, D.C." });
    useAppStore.getState().setComparisonMode("region");
    useAppStore.getState().setComparisonRegion({ codigoDane: 5, nombre: "ANTIOQUIA" });

    useAppStore.getState().clearSelectedRegion();

    expect(useAppStore.getState().comparisonMode).toBe("off");
    expect(useAppStore.getState().comparisonRegion).toBeNull();
  });
});
