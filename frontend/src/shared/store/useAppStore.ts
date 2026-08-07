import { create } from "zustand";
import { fetchGeometry, type RegionFeatureCollection } from "../api/geometry";
import { fetchFiltrosVocabulario } from "../api/metadata";
import type {
  Basemap,
  FiltrosVocabulario,
  GlobalFilters,
  Granularidad,
  Theme,
} from "../api/types";
import { defaultBasemapForTheme } from "./theme";

type VocabularioStatus = "idle" | "loading" | "ready" | "error";
type GeometryStatus = "loading" | "ready" | "error";

interface AppState {
  theme: Theme;
  basemap: Basemap;
  filters: GlobalFilters;
  /** HU-1.04 — nivel de agregación del choropleth, independiente de
   * `GlobalFilters` (no es un filtro, es el nivel geográfico de vista). */
  granularidad: Granularidad;
  vocabulario: FiltrosVocabulario | null;
  vocabularioStatus: VocabularioStatus;
  setTheme: (theme: Theme) => void;
  setBasemap: (basemap: Basemap) => void;
  /** Fusiona `patch` sobre los filtros actuales (RF-06: cruzados y
   * dinámicos) — nunca reemplaza el objeto completo, así que fijar un
   * filtro no borra los demás ya activos. */
  setFilters: (patch: GlobalFilters) => void;
  setGranularidad: (granularidad: Granularidad) => void;
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
}

export const useAppStore = create<AppState>((set, get) => ({
  // RNF-04: Dark es el default incondicional.
  theme: "dark",
  basemap: defaultBasemapForTheme("dark"),
  filters: {},
  granularidad: "DEPARTAMENTO",
  vocabulario: null,
  vocabularioStatus: "idle",
  geometryCache: {},
  geometryStatus: {},

  setTheme: (theme) =>
    set({ theme, basemap: defaultBasemapForTheme(theme) }),

  setBasemap: (basemap) => set({ basemap }),

  setFilters: (patch) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),

  setGranularidad: (granularidad) => set({ granularidad }),

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
