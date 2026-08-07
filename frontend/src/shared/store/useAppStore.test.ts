import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
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
});
