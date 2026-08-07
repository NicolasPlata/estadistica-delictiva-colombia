import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FiltrosVocabulario } from "../../shared/api/types";
import { useAppStore } from "../../shared/store/useAppStore";
import { Sidebar } from "./Sidebar";

vi.mock("../../shared/api/metadata", () => ({
  fetchFiltrosVocabulario: vi.fn(),
}));

const VOCABULARIO: FiltrosVocabulario = {
  delitos: ["Hurto", "Homicidio"],
  armas_medios: ["Arma de fuego"],
  generos: ["MASCULINO", "FEMENINO", "NO_REPORTADO"],
  grupos_edad: ["ADULTOS"],
};

describe("Sidebar", () => {
  beforeEach(async () => {
    useAppStore.setState(useAppStore.getInitialState());
    vi.clearAllMocks();
    const { fetchFiltrosVocabulario } = await import("../../shared/api/metadata");
    vi.mocked(fetchFiltrosVocabulario).mockResolvedValue(VOCABULARIO);
  });

  it("mounts without an infinite render loop when filters/vocabulario are empty", () => {
    // Regresión: selectores como `s.filters.delitos ?? []` devuelven un
    // array nuevo en cada render, lo que rompe el snapshot cache de
    // Zustand y produce "Maximum update depth exceeded" si no se usa una
    // referencia estable (ver EMPTY en DelitosMultiSelect/GrupoEdadSelect/
    // ArmaMedioSelect).
    expect(() => render(<Sidebar />)).not.toThrow();
  });

  it("loads vocabulario on mount and lets the user select and remove a delito chip", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const delitosToggle = await screen.findByRole("button", { expanded: false });
    await user.click(delitosToggle);
    await user.click(screen.getByText("Hurto"));

    expect(useAppStore.getState().filters.delitos).toEqual(["Hurto"]);
    expect(screen.getByLabelText("Quitar Hurto")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Quitar Hurto"));

    expect(useAppStore.getState().filters.delitos).toBeUndefined();
  });
});
