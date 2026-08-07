import { create } from "zustand";
import type { Basemap, GlobalFilters, Theme } from "../api/types";
import { defaultBasemapForTheme } from "./theme";

interface AppState {
  theme: Theme;
  basemap: Basemap;
  filters: GlobalFilters;
  setTheme: (theme: Theme) => void;
  setBasemap: (basemap: Basemap) => void;
  /** Fusiona `patch` sobre los filtros actuales (RF-06: cruzados y
   * dinámicos) — nunca reemplaza el objeto completo, así que fijar un
   * filtro no borra los demás ya activos. */
  setFilters: (patch: GlobalFilters) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // RNF-04: Dark es el default incondicional.
  theme: "dark",
  basemap: defaultBasemapForTheme("dark"),
  filters: {},

  setTheme: (theme) =>
    set({ theme, basemap: defaultBasemapForTheme(theme) }),

  setBasemap: (basemap) => set({ basemap }),

  setFilters: (patch) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),
}));
