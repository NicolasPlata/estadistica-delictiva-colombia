import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fetchBreakdown } from "../../shared/api/breakdown";
import { fetchEvolution } from "../../shared/api/evolution";
import type { Breakdown, Evolution } from "../../shared/api/types";
import { buildBreakdownFilters } from "../breakdown/buildBreakdownFilters";
import { buildCategoriaDonutData } from "../breakdown/formatBreakdown";
import { buildEvolutionFilters } from "../evolution/buildEvolutionFilters";
import { formatPeriodo } from "../evolution/formatPeriodo";
import { useAppStore } from "../../shared/store/useAppStore";

const ANIOS = [2020, 2021, 2022, 2023, 2024, 2025];

/** Mismo orden/colores que `RegionBreakdownPanel` — el color sigue a la
 * categoría, nunca a su posición en la respuesta. */
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

type Tab = "evolucion" | "desglose";

/** Reemplazo móvil (`< md`) de `EvolutionPanel` + `RegionBreakdownPanel`
 * — en escritorio esos 2 flotan siempre visibles (uno abajo a ancho
 * completo, el otro al lateral derecho), pero no caben los dos a la vez
 * en una pantalla angosta. Diseñado en Figma antes de implementarse
 * (Flow Screens, "Dashboard — Mobile — Dark — Panel Inferior
 * Expandido"): un único bottom sheet colapsable con pestañas, como el de
 * Google Maps — colapsado por defecto para maximizar el mapa visible.
 *
 * Alcance reducido a propósito respecto a las versiones de escritorio
 * (mismo criterio ya usado para Basemap Switcher/filtro de Meses,
 * deliberadamente omitidos en móvil): sin modo de comparación (HU-3.04)
 * en la pestaña Evolución — es una funcionalidad de power-user que no
 * se diseñó para esta pantalla. */
export function MobileInsightsSheet() {
  const filters = useAppStore((s) => s.filters);
  const granularidad = useAppStore((s) => s.granularidad);
  const selectedRegion = useAppStore((s) => s.selectedRegion);

  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("evolucion");
  const [anio, setAnio] = useState<number | null>(null);
  const [evolution, setEvolution] = useState<Evolution | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const agrupacion = selectedRegion ? "ANUAL" : "MENSUAL";

  useEffect(() => {
    setAnio(null);
  }, [selectedRegion]);

  useEffect(() => {
    let cancelled = false;
    const evolutionFilters = buildEvolutionFilters(filters, selectedRegion, granularidad);
    fetchEvolution(evolutionFilters, agrupacion)
      .then((data) => {
        if (!cancelled) setEvolution(data);
      })
      .catch(() => {
        if (!cancelled) setEvolution(null);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, selectedRegion, granularidad, agrupacion]);

  useEffect(() => {
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

  function selectTab(next: Tab) {
    setTab(next);
    setExpanded(true);
  }

  const evolutionData = evolution?.series.map((point) => ({
    label: formatPeriodo(point.periodo, agrupacion),
    cantidad: point.cantidad,
  }));
  const donutData = breakdown ? buildCategoriaDonutData(breakdown.por_categoria) : [];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-20 rounded-t-2xl border-t border-border bg-surface-panel shadow-lg transition-[max-height] duration-200 ${
        expanded ? "max-h-[70vh]" : "max-h-24"
      } overflow-hidden flex flex-col`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "Contraer panel" : "Expandir panel"}
        className="flex flex-col items-center gap-2 pt-2.5 pb-2 shrink-0"
      >
        <span className="w-9 h-1 rounded-full bg-border" aria-hidden="true" />
        <span className="flex items-center gap-1 text-text-secondary">
          {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>

      <div role="tablist" className="flex items-center gap-6 px-4 pb-2 shrink-0">
        {(
          [
            ["evolucion", "Evolución"],
            ["desglose", "Desglose"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => selectTab(value)}
            className={`text-label-md uppercase pb-1 border-b-2 transition-colors ${
              tab === value
                ? "text-accent-interactive border-accent-interactive"
                : "text-text-secondary border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!expanded && (
        <p className="px-4 pb-3 text-body-sm text-text-secondary truncate">
          {evolution ? `Total: ${evolution.series.reduce((sum, p) => sum + p.cantidad, 0).toLocaleString("es-CO")} delitos — desliza para expandir` : "Cargando…"}
        </p>
      )}

      {expanded && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {tab === "evolucion" &&
            (evolutionData ? (
              <>
                <h2 className="text-label-md text-text-secondary uppercase mb-2">
                  {selectedRegion ? `Evolución Anual — ${evolution!.region_label}` : `Evolución Mensual — ${evolution!.region_label}`}
                </h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    {selectedRegion ? (
                      <BarChart data={evolutionData}>
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)", borderRadius: 6 }}
                          formatter={(value: unknown) => Number(value).toLocaleString("es-CO")}
                        />
                        <Bar dataKey="cantidad" fill="var(--accent-interactive)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      </BarChart>
                    ) : (
                      <LineChart data={evolutionData}>
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)", borderRadius: 6 }}
                          formatter={(value: unknown) => Number(value).toLocaleString("es-CO")}
                        />
                        <Line type="monotone" dataKey="cantidad" stroke="var(--accent-interactive)" strokeWidth={2} dot={false} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-body-sm text-text-secondary">Cargando…</p>
            ))}

          {tab === "desglose" &&
            (breakdown ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-label-md text-text-secondary uppercase">Desglose — {breakdown.region_label}</h2>
                  <select
                    value={anio ?? ""}
                    onChange={(e) => setAnio(e.target.value === "" ? null : Number(e.target.value))}
                    className="bg-surface-card border border-border rounded-md px-2 py-1 text-text-primary text-body-sm"
                  >
                    <option value="">Todos los años</option>
                    {ANIOS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                {donutData.length > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-20 h-20 shrink-0">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={22} outerRadius={38} paddingAngle={2} stroke="none">
                            {donutData.map((entry, index) => (
                              <Cell key={entry.name} fill={CATEGORIA_COLORS[index]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="flex flex-col gap-1 min-w-0">
                      {donutData.map((entry, index) => (
                        <li key={entry.name} className="flex items-start gap-1.5 text-label-md text-text-secondary normal-case">
                          <span
                            aria-hidden="true"
                            className="w-2 h-2 rounded-full shrink-0 mt-1"
                            style={{ backgroundColor: CATEGORIA_COLORS[index] }}
                          />
                          <span className="min-w-0">
                            {entry.name} · {entry.pct.toFixed(0)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
                        <td className="py-1.5 text-right text-text-primary font-semibold">{fila.cantidad.toLocaleString("es-CO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-body-sm text-text-secondary">Cargando…</p>
            ))}
        </div>
      )}
    </div>
  );
}
