import { useEffect } from "react";
import { Sidebar } from "../features/filters/Sidebar";
import { useAppStore } from "../shared/store/useAppStore";
import { Header } from "./Header";

/**
 * Shell raíz: monta `data-theme` en `<html>` en sincronía con el store
 * (RNF-04, HU-1.05) — la hoja de tokens (`shared/design-system/tokens.css`)
 * lee ese atributo para conmutar los colores. El mapa (Fase 3) y los
 * paneles de KPIs/evolución (Fase 4) ocupan el Main Area, aún placeholder.
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
        <main className="flex-1 flex items-center justify-center">
          <p className="text-body-md text-text-secondary">
            El mapa llega en la siguiente fase.
          </p>
        </main>
      </div>
    </div>
  );
}
