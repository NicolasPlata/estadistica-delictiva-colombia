import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchEvolution } from "../../shared/api/evolution";
import type { Evolution } from "../../shared/api/types";
import { useAppStore } from "../../shared/store/useAppStore";
import { buildEvolutionFilters } from "./buildEvolutionFilters";
import { formatPeriodo } from "./formatPeriodo";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--surface-panel)",
    border: "1px solid var(--border)",
    borderRadius: 6,
  },
  labelStyle: { color: "var(--text-secondary)" },
  itemStyle: { color: "var(--text-primary)" },
};

function formatTooltipValue(value: unknown) {
  return Number(Array.isArray(value) ? value[0] : value).toLocaleString("es-CO");
}

/** Panel de evolución (HU-3.02/HU-3.03): línea mensual nacional por
 * defecto, barras anuales cuando se aísla un territorio en el mapa. La
 * comparación (HU-3.04, Hito 4.3) se agrega sobre este mismo panel. */
export function EvolutionPanel() {
  const filters = useAppStore((s) => s.filters);
  const granularidad = useAppStore((s) => s.granularidad);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const clearSelectedRegion = useAppStore((s) => s.clearSelectedRegion);

  const [evolution, setEvolution] = useState<Evolution | null>(null);
  const agrupacion = selectedRegion ? "ANUAL" : "MENSUAL";

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

  if (!evolution) return null;

  const titulo = selectedRegion
    ? `Evolución Anual — ${evolution.region_label}`
    : `Evolución Mensual — ${evolution.region_label}`;
  const data = evolution.series.map((point) => ({
    ...point,
    periodoLabel: formatPeriodo(point.periodo, agrupacion),
  }));

  return (
    <div className="absolute bottom-4 left-4 right-4 h-56 rounded-lg border border-border bg-surface-panel/80 backdrop-blur-md p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-label-md text-text-secondary uppercase">{titulo}</h2>
        {selectedRegion && (
          <button
            type="button"
            onClick={clearSelectedRegion}
            aria-label="Volver a la vista nacional"
            className="flex items-center justify-center w-6 h-6 rounded-full text-text-secondary hover:bg-surface-card-hover"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height="85%">
        {selectedRegion ? (
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="periodoLabel" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => value.toLocaleString("es-CO")}
            />
            <Tooltip {...TOOLTIP_STYLE} formatter={formatTooltipValue} />
            <Bar dataKey="cantidad" fill="var(--accent-interactive)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="periodoLabel"
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => value.toLocaleString("es-CO")}
            />
            <Tooltip {...TOOLTIP_STYLE} formatter={formatTooltipValue} />
            <Line
              type="monotone"
              dataKey="cantidad"
              stroke="var(--accent-interactive)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-panel)" }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
