import { useEffect } from "react";
import { Sidebar } from "../features/filters/Sidebar";
import { KpisPanel } from "../features/kpis/KpisPanel";
import { MapCanvas } from "../features/map/MapCanvas";
import { useAppStore } from "../shared/store/useAppStore";
import { Header } from "./Header";

/**
 * Shell raíz: monta `data-theme` en `<html>` en sincronía con el store
 * (RNF-04, HU-1.05) — la hoja de tokens (`shared/design-system/tokens.css`)
 * lee ese atributo para conmutar los colores. Los paneles de KPIs/evolución
 * (Fase 4) se superponen al Main Area sobre el mapa.
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
          <MapCanvas />
          <KpisPanel />
        </main>
      </div>
    </div>
  );
}
