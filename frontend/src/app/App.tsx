import { lazy, Suspense, useEffect, useState } from "react";
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
// Móvil (< md): reemplaza EvolutionPanel + RegionBreakdownPanel (que en
// escritorio flotan uno abajo a ancho completo y el otro al lateral
// derecho — no caben los dos a la vez en una pantalla angosta) por un
// único bottom sheet colapsable con pestañas. Diseñado en Figma antes de
// implementarse (Flow Screens, "... — Panel Inferior Expandido").
const MobileInsightsSheet = lazy(() =>
  import("../features/mobile/MobileInsightsSheet").then((m) => ({ default: m.MobileInsightsSheet })),
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-surface-canvas text-text-primary">
      <Header onMenuClick={() => setMobileFiltersOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} />
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
          {/* Escritorio: EvolutionPanel + RegionBreakdownPanel flotan
              siempre visibles. Móvil: un único MobileInsightsSheet los
              reemplaza (ver arriba) — `hidden md:block` en vez de un
              `<div>` posicionado evita que el `display:none` de móvil
              rompa el `absolute` de cada panel contra `main` en
              escritorio (el wrapper nunca establece su propio contexto
              de posicionamiento). */}
          <div className="hidden md:block">
            <Suspense fallback={null}>
              <EvolutionPanel />
            </Suspense>
            <Suspense fallback={null}>
              <RegionBreakdownPanel />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <div className="md:hidden">
              <MobileInsightsSheet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
