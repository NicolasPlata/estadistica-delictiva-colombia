export interface HoveredRegion {
  nombre: string;
  cantidad: number | null;
  x: number;
  y: number;
}

/** Tooltip flotante (Glassmorphism, HU-1.03) — posicionado en las
 * coordenadas de pantalla del evento `onHover` del mapa, no en el DOM del
 * polígono (MapLibre renderiza en un único `<canvas>`). */
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
          : `${region.cantidad.toLocaleString("es-CO")} delitos`}
      </p>
    </div>
  );
}
