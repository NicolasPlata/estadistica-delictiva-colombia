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
import { buildComparisonFilters } from "./buildComparisonFilters";
import { buildEvolutionFilters } from "./buildEvolutionFilters";
import { ComparisonControls } from "./ComparisonControls";
import { formatPeriodo } from "./formatPeriodo";
import { mergeEvolutionSeries } from "./mergeEvolutionSeries";

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

/** Panel de evolución (HU-3.02/HU-3.03/HU-3.04): línea mensual nacional
 * por defecto, barras anuales al aislar un territorio, y comparación
 * Serie A/B superpuesta en el mismo gráfico (nunca dos gráficos
 * separados). */
export function EvolutionPanel() {
  const filters = useAppStore((s) => s.filters);
  const granularidad = useAppStore((s) => s.granularidad);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const clearSelectedRegion = useAppStore((s) => s.clearSelectedRegion);
  const comparisonMode = useAppStore((s) => s.comparisonMode);
  const comparisonRegion = useAppStore((s) => s.comparisonRegion);
  const comparisonPeriodo = useAppStore((s) => s.comparisonPeriodo);

  const [evolution, setEvolution] = useState<Evolution | null>(null);
  const [comparisonEvolution, setComparisonEvolution] = useState<Evolution | null>(null);
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

  useEffect(() => {
    const comparisonFilters = buildComparisonFilters(
      filters,
      comparisonMode,
      selectedRegion,
      comparisonRegion,
      comparisonPeriodo,
      granularidad,
    );
    if (!comparisonFilters) {
      setComparisonEvolution(null);
      return;
    }

    let cancelled = false;
    fetchEvolution(comparisonFilters, "ANUAL")
      .then((data) => {
        if (!cancelled) setComparisonEvolution(data);
      })
      .catch(() => {
        if (!cancelled) setComparisonEvolution(null);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, comparisonMode, selectedRegion, comparisonRegion, comparisonPeriodo, granularidad]);

  if (!evolution) return null;

  const comparando = comparisonMode !== "off" && comparisonEvolution !== null;
  const titulo = selectedRegion
    ? `Evolución Anual — ${evolution.region_label}`
    : `Evolución Mensual — ${evolution.region_label}`;

  const data = comparando
    ? mergeEvolutionSeries(evolution.series, comparisonEvolution.series, comparisonMode as "region" | "periodo")
    : evolution.series.map((point) => ({ label: formatPeriodo(point.periodo, agrupacion), serieA: point.cantidad }));

  return (
    <div className="absolute bottom-4 left-4 right-4 h-64 rounded-lg border border-border bg-surface-panel/80 backdrop-blur-md p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-label-md text-text-secondary uppercase">{titulo}</h2>
        <div className="flex items-center gap-3">
          {selectedRegion && <ComparisonControls />}
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
      </div>

      {comparando && (
        <ul className="flex items-center gap-4 mb-1">
          <li className="flex items-center gap-1.5 text-label-md text-text-secondary normal-case">
            <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0 bg-comparacion-serie-a" />
            {evolution.region_label}
          </li>
          <li className="flex items-center gap-1.5 text-label-md text-text-secondary normal-case">
            <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0 bg-comparacion-serie-b" />
            {comparisonEvolution.region_label}
            {comparisonMode === "periodo" && ` (${comparisonPeriodo?.anioInicio}–${comparisonPeriodo?.anioFin})`}
          </li>
        </ul>
      )}

      <ResponsiveContainer width="100%" height="80%">
        {selectedRegion ? (
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => value.toLocaleString("es-CO")}
            />
            <Tooltip {...TOOLTIP_STYLE} formatter={formatTooltipValue} />
            <Bar dataKey="serieA" fill="var(--comparacion-serie-a)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            {comparando && (
              <Bar dataKey="serieB" fill="var(--comparacion-serie-b)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            )}
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="label"
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
              dataKey="serieA"
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
