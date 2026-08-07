import { lazy, Suspense, useEffect } from "react";
import { Sidebar } from "../features/filters/Sidebar";
import { useAppStore } from "../shared/store/useAppStore";
import { Header } from "./Header";

// Hito 5.2 (TTV<2s): MapLibre y Recharts son las dos dependencias más
// pesadas del bundle (~1MB y ~200KB respectivamente sin comprimir) — se
// cargan de forma diferida para que el shell (Header + Sidebar) pinte de
// inmediato sin esperar a que bajen.
const MapCanvas = lazy(() =>
  import("../features/map/MapCanvas").then((m) => ({ default: m.MapCanvas })),
);
const KpisPanel = lazy(() =>
  import("../features/kpis/KpisPanel").then((m) => ({ default: m.KpisPanel })),
);
const EvolutionPanel = lazy(() =>
  import("../features/evolution/EvolutionPanel").then((m) => ({ default: m.EvolutionPanel })),
);
const RegionBreakdownPanel = lazy(() =>
  import("../features/breakdown/RegionBreakdownPanel").then((m) => ({ default: m.RegionBreakdownPanel })),
);

function MapCanvasSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-surface-canvas">
      <div
        role="status"
        aria-label="Cargando mapa"
        className="w-10 h-10 rounded-full border-2 border-border border-t-accent-interactive animate-spin"
      />
    </div>
  );
}

/**
 * Shell raíz: monta `data-theme` en `<html>` en sincronía con el store
 * (RNF-04, HU-1.05) — la hoja de tokens (`shared/design-system/tokens.css`)
 * lee ese atributo para conmutar los colores. Los paneles de KPIs/evolución
 * se superponen al Main Area sobre el mapa.
 */
export function App() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-surface-canvas text-text-primary">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 relative">
          <Suspense fallback={<MapCanvasSkeleton />}>
            <MapCanvas />
          </Suspense>
          {/* Fallback null: cada panel ya muestra su propio esqueleto de
              carga de datos una vez que su chunk resuelve — no hace falta
              un segundo loader superpuesto mientras el código baja. */}
          <Suspense fallback={null}>
            <KpisPanel />
          </Suspense>
          <Suspense fallback={null}>
            <EvolutionPanel />
          </Suspense>
          <Suspense fallback={null}>
            <RegionBreakdownPanel />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
