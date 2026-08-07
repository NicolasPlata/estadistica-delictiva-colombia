import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../shared/store/useAppStore";
import { App } from "./App";

vi.mock("../shared/api/metadata", () => ({
  fetchFiltrosVocabulario: vi.fn().mockResolvedValue({
    delitos: [],
    armas_medios: [],
    generos: [],
    grupos_edad: [],
  }),
}));

vi.mock("../shared/api/geometry", () => ({
  fetchGeometry: vi.fn().mockResolvedValue({ type: "FeatureCollection", features: [] }),
}));

vi.mock("../shared/api/mapStats", () => ({
  fetchMapStats: vi.fn().mockResolvedValue({ granularidad: "DEPARTAMENTO", data: {} }),
}));

vi.mock("../shared/api/kpis", () => ({
  fetchKpis: vi.fn().mockResolvedValue({
    total_delitos: 0,
    variacion_porcentual: 0,
    delito_mas_comun: null,
    mes_mayor_impacto: null,
    distribucion_genero: {},
  }),
}));

vi.mock("../shared/api/evolution", () => ({
  fetchEvolution: vi.fn().mockResolvedValue({ region_label: "Nacional", series: [] }),
}));

describe("App", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
    document.documentElement.removeAttribute("data-theme");
  });

  it("mounts data-theme=dark on <html> by default (RNF-04)", () => {
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("updates data-theme when the store's theme changes", () => {
    render(<App />);

    act(() => {
      useAppStore.getState().setTheme("light");
    });

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("renders the app title", () => {
    render(<App />);

    expect(screen.getByText("Criterium Analytics")).toBeInTheDocument();
  });
});
