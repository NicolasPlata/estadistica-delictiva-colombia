import { useAppStore } from "../../shared/store/useAppStore";

const PASOS = ["var(--choropleth-1)", "var(--choropleth-2)", "var(--choropleth-3)", "var(--choropleth-4)", "var(--choropleth-5)"];

/** Leyenda del choropleth (Fase 8) — estática (no depende de `GlobalFilters`
 * ni de datos por región, solo de `metrica` para el título y del tema
 * activo para los colores, vía `var(--choropleth-N)` — a diferencia de
 * `MapCanvas`, esto es HTML/CSS plano, así que no necesita
 * `readDesignTokens.ts` para resolver los custom properties: el navegador
 * los resuelve solo y siguen [data-theme] en vivo). Posicionada en el
 * lateral izquierdo del mapa, en la franja media libre entre `KpisPanel`
 * (arriba) y `EvolutionPanel` (abajo, ancho completo) — pedido explícito
 * del usuario: "que le indique... que lo oscuro es peligroso". En móvil
 * `EvolutionPanel` no existe (ver `MobileInsightsSheet`) — el piso libre
 * pasa a ser el sheet colapsado (`max-h-24` = 96px), así que `bottom-28`
 * reemplaza a `bottom-[288px]` (calculado para el panel de escritorio). */
export function MapLegend() {
  const metrica = useAppStore((s) => s.metrica);
  const titulo = metrica === "TASA" ? "Tasa x100k hab." : "Densidad Delictiva";

  return (
    <div className="absolute bottom-28 md:bottom-[288px] left-4 rounded-lg border border-border bg-surface-panel/80 backdrop-blur-md px-4 py-3 shadow-lg">
      <p className="text-label-md text-text-secondary uppercase mb-2">{titulo}</p>
      <div className="flex w-46 h-3 rounded-sm overflow-hidden mb-1.5" style={{ width: 184 }}>
        {PASOS.map((color, index) => (
          <span key={index} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="flex items-center justify-between text-body-sm text-text-primary" style={{ width: 184 }}>
        <span>Menor</span>
        <span>Mayor</span>
      </div>
      <p className="text-label-md text-text-secondary normal-case mt-1">Más oscuro = más peligroso</p>
    </div>
  );
}
