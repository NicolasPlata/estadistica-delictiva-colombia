import type { Granularidad } from "../../shared/api/types";
import { useAppStore } from "../../shared/store/useAppStore";
import { FilterSection } from "./FilterSection";

const OPCIONES: { value: Granularidad; label: string }[] = [
  { value: "DEPARTAMENTO", label: "Departamento" },
  { value: "MUNICIPIO", label: "Municipio" },
];

/** HU-1.04. Vive en `features/filters` (junto al resto de "Componentes
 * Base" del Hito 2.2) aunque más adelante también se renderice como
 * control flotante sobre el mapa (Fase 3) — es el mismo estado, solo con
 * otra presentación. */
export function GranularidadToggle() {
  const granularidad = useAppStore((s) => s.granularidad);
  const setGranularidad = useAppStore((s) => s.setGranularidad);

  return (
    <FilterSection label="Granularidad">
      <div
        role="group"
        aria-label="Nivel de agregación geográfica"
        className="flex rounded-md border border-border overflow-hidden"
      >
        {OPCIONES.map((opt) => {
          const active = granularidad === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => setGranularidad(opt.value)}
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
