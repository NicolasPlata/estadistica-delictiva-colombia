import type { Metrica } from "../../shared/api/types";

export interface HoveredRegion {
  nombre: string;
  cantidad: number | null;
  metrica: Metrica;
  x: number;
  y: number;
}

function formatValor(cantidad: number, metrica: Metrica): string {
  if (metrica === "TASA") {
    const tasa = cantidad.toLocaleString("es-CO", { maximumFractionDigits: 1 });
    return `${tasa} por cada 100.000 hab.`;
  }
  return `${cantidad.toLocaleString("es-CO")} delitos`;
}

/** Tooltip flotante (Glassmorphism, HU-1.03) — posicionado en las
 * coordenadas de pantalla del evento `onHover` del mapa, no en el DOM del
 * polígono (MapLibre renderiza en un único `<canvas>`). Formatea el valor
 * según `metrica` (Fase 6): conteo absoluto o tasa por 100.000 hab. */
export function MapTooltip({ region }: { region: HoveredRegion | null }) {
  if (!region) return null;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-md border border-border bg-surface-panel/80 backdrop-blur-md px-3 py-2 shadow-lg"
      style={{ left: region.x + 12, top: region.y + 12 }}
    >
      <p className="text-label-md text-text-secondary uppercase">{region.nombre}</p>
      <p className="text-body-md text-text-primary">
        {region.cantidad === null
          ? "Sin datos en el filtro actual"
          : formatValor(region.cantidad, region.metrica)}
      </p>
    </div>
  );
}
