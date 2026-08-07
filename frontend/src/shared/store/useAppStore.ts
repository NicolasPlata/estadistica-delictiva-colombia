import { create } from "zustand";
import { fetchGeometry, type RegionFeatureCollection } from "../api/geometry";
import { fetchFiltrosVocabulario } from "../api/metadata";
import type {
  Basemap,
  FiltrosVocabulario,
  GlobalFilters,
  Granularidad,
  Metrica,
  Theme,
} from "../api/types";
import { defaultBasemapForTheme } from "./theme";

type VocabularioStatus = "idle" | "loading" | "ready" | "error";
type GeometryStatus = "loading" | "ready" | "error";

/** Territorio aislado al hacer clic en el mapa (HU-3.03) — vive aparte de
 * `GlobalFilters` porque no filtra el mapa/KPIs, solo enfoca el panel de
 * evolución (ver `docs/plans/03-...` Hito 4.2). */
export interface SelectedRegion {
  codigoDane: number;
  nombre: string;
}

/** HU-3.04 — modo de comparación del panel de evolución (Serie A/B). */
export type ComparisonMode = "off" | "region";

interface AppState {
  theme: Theme;
  basemap: Basemap;
  filters: GlobalFilters;
  /** HU-1.04 — nivel de agregación del choropleth, independiente de
   * `GlobalFilters` (no es un filtro, es el nivel geográfico de vista). */
  granularidad: Granularidad;
  /** Fase 6 — unidad en la que se lee el choropleth (conteo absoluto o
   * tasa por 100.000 hab.). Igual que `granularidad`, no es un filtro de
   * qué datos traer sino de cómo se visualizan los mismos datos, así que
   * vive fuera de `GlobalFilters`. */
  metrica: Metrica;
  vocabulario: FiltrosVocabulario | null;
  vocabularioStatus: VocabularioStatus;
  setTheme: (theme: Theme) => void;
  setBasemap: (basemap: Basemap) => void;
  /** Fusiona `patch` sobre los filtros actuales (RF-06: cruzados y
   * dinámicos) — nunca reemplaza el objeto completo, así que fijar un
   * filtro no borra los demás ya activos. */
  setFilters: (patch: GlobalFilters) => void;
  setGranularidad: (granularidad: Granularidad) => void;
  setMetrica: (metrica: Metrica) => void;
  /** Carga el vocabulario de filtros (RF-05, HU-2.02/2.03) desde
   * `GET /api/v1/metadata/filtros` — se llama una vez al montar la app
   * (Hito 2.2). Nunca rechaza: un fallo de red deja `vocabularioStatus`
   * en `"error"` para que la UI lo maneje, en vez de tumbar el árbol de
   * React con una promesa no capturada. */
  loadVocabulario: () => Promise<void>;
  /** Geometría cacheada por granularidad — se pide una sola vez por sesión
   * (ADR 0002, HU-1.01/1.04): es estática, no depende de `GlobalFilters`,
   * y alternar Departamento/Municipio nunca debe volver a pedirla si ya
   * está en caché. */
  geometryCache: Partial<Record<Granularidad, RegionFeatureCollection>>;
  geometryStatus: Partial<Record<Granularidad, GeometryStatus>>;
  loadGeometry: (granularidad: Granularidad) => Promise<void>;
  /** HU-3.03 — territorio elegido en el mapa para el panel de evolución. */
  selectedRegion: SelectedRegion | null;
  setSelectedRegion: (region: SelectedRegion) => void;
  clearSelectedRegion: () => void;
  /** HU-3.04 — Serie B del panel de evolución, solo tiene sentido junto a
   * un `selectedRegion` (Serie A), así que se descarta con él. */
  comparisonMode: ComparisonMode;
  comparisonRegion: SelectedRegion | null;
  setComparisonMode: (mode: ComparisonMode) => void;
  setComparisonRegion: (region: SelectedRegion) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // RNF-04: Dark es el default incondicional.
  theme: "dark",
  basemap: defaultBasemapForTheme("dark"),
  filters: {},
  granularidad: "DEPARTAMENTO",
  metrica: "ABSOLUTA",
  vocabulario: null,
  vocabularioStatus: "idle",
  geometryCache: {},
  geometryStatus: {},
  selectedRegion: null,
  comparisonMode: "off",
  comparisonRegion: null,

  setTheme: (theme) =>
    set({ theme, basemap: defaultBasemapForTheme(theme) }),

  setBasemap: (basemap) => set({ basemap }),

  setFilters: (patch) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),

  // El codigo_dane de un departamento y el de un municipio no son la misma
  // entidad — un territorio aislado antes del cambio dejaría de tener
  // sentido, así que se descarta junto con la granularidad.
  setGranularidad: (granularidad) =>
    set({ granularidad, selectedRegion: null, comparisonMode: "off", comparisonRegion: null }),

  setMetrica: (metrica) => set({ metrica }),

  // Una región primaria nueva invalida cualquier comparación ya armada
  // contra la anterior (HU-3.04 vive "dentro" de la Serie A actual).
  setSelectedRegion: (region) =>
    set({ selectedRegion: region, comparisonMode: "off", comparisonRegion: null }),

  clearSelectedRegion: () =>
    set({ selectedRegion: null, comparisonMode: "off", comparisonRegion: null }),

  setComparisonMode: (mode) => set({ comparisonMode: mode, comparisonRegion: null }),

  setComparisonRegion: (region) => set({ comparisonRegion: region }),

  loadVocabulario: async () => {
    set({ vocabularioStatus: "loading" });
    try {
      const vocabulario = await fetchFiltrosVocabulario();
      set({ vocabulario, vocabularioStatus: "ready" });
    } catch {
      set({ vocabulario: null, vocabularioStatus: "error" });
    }
  },

  loadGeometry: async (granularidad) => {
    const { geometryStatus } = get();
    if (geometryStatus[granularidad] === "loading" || geometryStatus[granularidad] === "ready") {
      return;
    }

    set((state) => ({
      geometryStatus: { ...state.geometryStatus, [granularidad]: "loading" },
    }));
    try {
      const geometry = await fetchGeometry(granularidad);
      set((state) => ({
        geometryCache: { ...state.geometryCache, [granularidad]: geometry },
        geometryStatus: { ...state.geometryStatus, [granularidad]: "ready" },
      }));
    } catch {
      set((state) => ({
        geometryStatus: { ...state.geometryStatus, [granularidad]: "error" },
      }));
    }
  },
}));
