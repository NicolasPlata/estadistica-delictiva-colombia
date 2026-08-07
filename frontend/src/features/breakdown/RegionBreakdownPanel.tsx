import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fetchBreakdown } from "../../shared/api/breakdown";
import type { Breakdown } from "../../shared/api/types";
import { useAppStore } from "../../shared/store/useAppStore";
import { buildBreakdownFilters } from "./buildBreakdownFilters";
import { buildCategoriaDonutData } from "./formatBreakdown";

const ANIOS = [2020, 2021, 2022, 2023, 2024, 2025];

/** Mismo orden que `CATEGORIAS_ORDEN` en `formatBreakdown.ts` — el color
 * sigue siempre a la misma categoría, nunca a su posición en la
 * respuesta (Reconciliación 6, `00-design-system.md`). */
const CATEGORIA_COLORS = [
  "var(--categoria-patrimonio-economico)",
  "var(--categoria-vida-integridad)",
  "var(--categoria-delitos-sexuales)",
  "var(--categoria-amenazas)",
  "var(--categoria-violencia-intrafamiliar)",
  "var(--categoria-extorsion)",
  "var(--categoria-secuestro)",
  "var(--categoria-terrorismo)",
];

function BreakdownSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando desglose de delitos"
      className="absolute top-20 right-4 w-80 max-h-[520px] rounded-lg border border-border bg-surface-panel/90 backdrop-blur-md p-4 shadow-lg animate-pulse"
    >
      <div className="h-2.5 w-32 rounded bg-surface-card-hover mb-2" />
      <div className="h-5 w-40 rounded bg-surface-card-hover mb-4" />
      <div className="h-24 rounded bg-surface-card-hover mb-4" />
      <div className="h-40 rounded bg-surface-card-hover" />
    </div>
  );
}

/** Panel de desglose de delitos por región (Fase 7, RN-04) — se abre al
 * seleccionar una región en el mapa (HU-3.03, mismo `selectedRegion` que
 * `EvolutionPanel`), en el lateral derecho del mapa (único cuadrante libre:
 * KPIs arriba, Evolución abajo con ancho completo). Filtrable por año con
 * un selector local (no vive en `GlobalFilters` ni en `useAppStore` — es
 * un refinamiento propio de este panel, mismo criterio que el resto de
 * estados "locales a un panel" ya establecidos en el proyecto). */
export function RegionBreakdownPanel() {
  const filters = useAppStore((s) => s.filters);
  const granularidad = useAppStore((s) => s.granularidad);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const clearSelectedRegion = useAppStore((s) => s.clearSelectedRegion);

  const [anio, setAnio] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);

  useEffect(() => {
    setAnio(null);
  }, [selectedRegion]);

  useEffect(() => {
    if (!selectedRegion) {
      setBreakdown(null);
      return;
    }

    let cancelled = false;
    const breakdownFilters = buildBreakdownFilters(filters, selectedRegion, granularidad, anio);
    fetchBreakdown(breakdownFilters)
      .then((data) => {
        if (!cancelled) setBreakdown(data);
      })
      .catch(() => {
        if (!cancelled) setBreakdown(null);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, selectedRegion, granularidad, anio]);

  if (!selectedRegion) return null;
  if (!breakdown) return <BreakdownSkeleton />;

  const donutData = buildCategoriaDonutData(breakdown.por_categoria);

  return (
    <div className="absolute top-20 right-4 w-80 max-h-[calc(100%-340px)] overflow-y-auto rounded-lg border border-border bg-surface-panel/90 backdrop-blur-md p-4 shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-label-md text-text-secondary uppercase">Desglose de Delitos</h2>
          <p className="text-headline-md text-text-primary">{breakdown.region_label}</p>
        </div>
        <button
          type="button"
          onClick={clearSelectedRegion}
          aria-label="Cerrar desglose"
          className="flex items-center justify-center w-6 h-6 rounded-full text-text-secondary hover:bg-surface-card-hover shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      <label className="flex flex-col gap-1.5 mb-4">
        <span className="text-label-md text-text-secondary uppercase">Año</span>
        <select
          value={anio ?? ""}
          onChange={(e) => setAnio(e.target.value === "" ? null : Number(e.target.value))}
          className="bg-surface-card border border-border rounded-md px-3 py-2 text-text-primary text-body-sm"
        >
          <option value="">Todos los años</option>
          {ANIOS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      {donutData.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-24 h-24 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={26}
                  outerRadius={44}
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={entry.name} fill={CATEGORIA_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    `${Number(value).toLocaleString("es-CO")} delitos`,
                    name as string,
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--surface-panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-col gap-1.5 min-w-0">
            {donutData.map((entry, index) => (
              <li key={entry.name} className="flex items-start gap-1.5 text-label-md text-text-secondary normal-case">
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: CATEGORIA_COLORS[index] }}
                />
                {/* Nombres largos ("Delitos contra el Patrimonio
                    Económico") se truncaban con el porcentaje incluido, así
                    que nunca se veía el %. Se deja hacer wrap a varias
                    líneas en vez de truncar (min-w-0 para que el flex
                    child pueda encogerse y realmente ajuste el ancho). */}
                <span className="min-w-0">
                  {entry.name} · {entry.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="text-label-md text-text-secondary uppercase mb-2">Por Tipo de Delito</h3>
      {breakdown.por_delito.length === 0 ? (
        <p className="text-body-sm text-text-secondary">Sin delitos registrados para este filtro.</p>
      ) : (
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-label-md text-text-secondary uppercase text-left">
              <th className="font-semibold pb-1.5 border-b border-border">Delito</th>
              <th className="font-semibold pb-1.5 border-b border-border text-right">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.por_delito.map((fila) => (
              <tr key={fila.delito} className="border-b border-border last:border-0">
                <td className="py-1.5 pr-2 text-text-secondary">{fila.delito}</td>
                <td className="py-1.5 text-right text-text-primary font-semibold">
                  {fila.cantidad.toLocaleString("es-CO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
