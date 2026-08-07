import type { Genero } from "../../shared/api/types";
import { useAppStore } from "../../shared/store/useAppStore";
import { FilterSection } from "./FilterSection";

const OPCIONES: { value: Genero | undefined; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "MASCULINO", label: "Masc." },
  { value: "FEMENINO", label: "Fem." },
  { value: "NO_REPORTADO", label: "N/R" },
];

export function GeneroSegmentedControl() {
  const genero = useAppStore((s) => s.filters.genero);
  const setFilters = useAppStore((s) => s.setFilters);

  return (
    <FilterSection label="Género">
      <div
        role="group"
        aria-label="Filtro de género"
        className="flex rounded-md border border-border overflow-hidden"
      >
        {OPCIONES.map((opt) => {
          const active = genero === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              aria-pressed={active}
              onClick={() => setFilters({ genero: opt.value })}
              className={`flex-1 py-1.5 text-body-sm transition-colors ${
                active
                  ? "bg-accent-interactive text-accent-interactive-on"
                  : "bg-surface-card text-text-secondary hover:bg-surface-card-hover"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </FilterSection>
  );
}
