import { useEffect } from "react";
import { useAppStore } from "../shared/store/useAppStore";

/**
 * Shell raíz: monta `data-theme` en `<html>` en sincronía con el store
 * (RNF-04, HU-1.05) — la hoja de tokens (`shared/design-system/tokens.css`)
 * lee ese atributo para conmutar los colores. El contenido real del
 * dashboard (mapa, sidebar, KPIs) llega en las Fases 2-4; por ahora este
 * shell solo prueba que el ciclo tema→DOM→CSS funciona de punta a punta.
 */
export function App() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-headline-lg">Criterium Analytics</h1>
        <p className="text-body-md text-text-secondary mt-2">
          Dashboard de Estadística Delictiva — en construcción.
        </p>
      </div>
    </div>
  );
}
