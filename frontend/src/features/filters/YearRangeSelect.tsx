import { useAppStore } from "../../shared/store/useAppStore";
import { FilterSection } from "./FilterSection";

// RN-06: el dataset cubre 2020-2025 — el selector no debe ofrecer años
// fuera de ese rango.
const ANIOS = [2020, 2021, 2022, 2023, 2024, 2025];

const SELECT_CLASSES =
  "flex-1 min-w-0 bg-surface-card border border-border rounded-md px-2 py-1.5 text-text-primary text-body-sm focus:outline-none focus:ring-2 focus:ring-accent-interactive";

export function YearRangeSelect() {
  const anioInicio = useAppStore((s) => s.filters.anio_inicio);
  const anioFin = useAppStore((s) => s.filters.anio_fin);
  const setFilters = useAppStore((s) => s.setFilters);

  return (
    <FilterSection label="Rango de Años">
      <div className="flex items-center gap-2">
        <select
          aria-label="Año inicial"
          value={anioInicio ?? ""}
          onChange={(e) =>
            setFilters({
              anio_inicio: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className={SELECT_CLASSES}
        >
          <option value="">Desde</option>
          {ANIOS.map((anio) => (
            <option key={anio} value={anio}>
              {anio}
            </option>
          ))}
        </select>
        <span className="text-text-secondary text-body-sm shrink-0">—</span>
        <select
          aria-label="Año final"
          value={anioFin ?? ""}
          onChange={(e) =>
            setFilters({
              anio_fin: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className={SELECT_CLASSES}
        >
          <option value="">Hasta</option>
          {ANIOS.map((anio) => (
            <option key={anio} value={anio}>
              {anio}
            </option>
          ))}
        </select>
      </div>
    </FilterSection>
  );
}
