import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { Kpis } from "../../shared/api/types";
import { fetchKpis } from "../../shared/api/kpis";
import { useAppStore } from "../../shared/store/useAppStore";
import { buildGeneroDonutData, formatMesMayorImpacto, formatVariacion } from "./formatKpis";

const DONUT_COLORS = [
  "var(--genero-masculino)",
  "var(--genero-femenino)",
  "var(--genero-no-reportado)",
];

const TONE_CLASSES = {
  critical: "text-status-critical",
  good: "text-status-good",
  neutral: "text-text-secondary",
};

/** Loader (Hito 5.2) — reserva el mismo espacio que el panel real para
 * que no salte el layout cuando los datos llegan. */
function KpisPanelSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando KPIs"
      className="absolute top-4 left-4 flex items-center gap-4 rounded-lg border border-border bg-surface-panel/80 backdrop-blur-md px-4 py-3 shadow-lg animate-pulse"
    >
      <div className="flex flex-col gap-1.5 w-32">
        <div className="h-2.5 w-20 rounded bg-surface-card-hover" />
        <div className="h-5 w-24 rounded bg-surface-card-hover" />
        <div className="h-2.5 w-28 rounded bg-surface-card-hover" />
      </div>
      <div className="flex flex-col gap-1.5 w-40 border-l border-border pl-4">
        <div className="h-2.5 w-24 rounded bg-surface-card-hover" />
        <div className="h-3 w-32 rounded bg-surface-card-hover" />
        <div className="h-2.5 w-24 rounded bg-surface-card-hover mt-1" />
        <div className="h-3 w-20 rounded bg-surface-card-hover" />
      </div>
      <div className="w-20 h-20 rounded-full bg-surface-card-hover shrink-0" />
    </div>
  );
}

/** Panel flotante de KPIs (HU-3.01) — reactivo a `GlobalFilters`, nunca a
 * la granularidad ni al mapa base. Vive como hermano de `MapCanvas` en el
 * Main Area (no dentro de él: no toca MapLibre). */
export function KpisPanel() {
  const filters = useAppStore((s) => s.filters);
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchKpis(filters)
      .then((data) => {
        if (!cancelled) setKpis(data);
      })
      .catch(() => {
        if (!cancelled) setKpis(null);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  if (!kpis) return <KpisPanelSkeleton />;

  const variacion = formatVariacion(kpis.variacion_porcentual);
  const donutData = buildGeneroDonutData(kpis.distribucion_genero);

  return (
    // `right-4 md:right-auto` + `overflow-x-auto`: en escritorio el ancho
    // es el intrínseco del contenido (como siempre). En móvil el panel no
    // cabe completo en 375px — en vez de encimarse con el resto de la
    // pantalla, se acota al viewport y se puede desplazar horizontalmente
    // (cada sección con `shrink-0` para que no se aplasten entre sí).
    <div className="absolute top-4 left-4 right-4 md:right-auto flex items-center gap-4 rounded-lg border border-border bg-surface-panel/80 backdrop-blur-md px-4 py-3 shadow-lg overflow-x-auto">
      <div className="flex flex-col gap-0.5 shrink-0">
        <span className="text-label-md text-text-secondary uppercase">Total de Delitos</span>
        <span className="text-headline-md text-text-primary">
          {kpis.total_delitos.toLocaleString("es-CO")}
        </span>
        <span className={`text-body-sm ${TONE_CLASSES[variacion.tone]}`}>
          {variacion.text}
          {kpis.variacion_porcentual !== null && " vs. periodo anterior"}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 border-l border-border pl-4 shrink-0">
        <span className="text-label-md text-text-secondary uppercase">Delito Más Común</span>
        <span className="text-body-sm text-text-primary">{kpis.delito_mas_comun ?? "Sin datos"}</span>
        <span className="text-label-md text-text-secondary uppercase mt-1">Mes de Mayor Impacto</span>
        <span className="text-body-sm text-text-primary">
          {formatMesMayorImpacto(kpis.mes_mayor_impacto)}
        </span>
      </div>

      {donutData.length > 0 && (
        <div className="flex items-center gap-2 border-l border-border pl-4 shrink-0">
          <div className="w-20 h-20 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={22}
                  outerRadius={38}
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={entry.name} fill={DONUT_COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-col gap-1">
            {donutData.map((entry, index) => (
              <li key={entry.name} className="flex items-center gap-1.5 text-label-md text-text-secondary normal-case">
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: DONUT_COLORS[index] }}
                />
                {entry.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
