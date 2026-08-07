import type { Metrica } from "../../shared/api/types";
import { useAppStore } from "../../shared/store/useAppStore";
import { FilterSection } from "./FilterSection";

const OPCIONES: { value: Metrica; label: string }[] = [
  { value: "ABSOLUTA", label: "Cantidad" },
  { value: "TASA", label: "Tasa x100k hab." },
];

/** Fase 6 (RN-12). Mismo patrón que `GranularidadToggle` — cambia cómo se
 * lee el choropleth (conteo absoluto vs. tasa por 100.000 habitantes), no
 * qué datos se traen, así que vive junto a Granularidad y no dentro de los
 * filtros cruzados de más abajo. */
export function MetricaToggle() {
  const metrica = useAppStore((s) => s.metrica);
  const setMetrica = useAppStore((s) => s.setMetrica);

  return (
    <FilterSection label="Ver por">
      <div
        role="group"
        aria-label="Unidad del choropleth"
        className="flex rounded-md border border-border overflow-hidden"
      >
        {OPCIONES.map((opt) => {
          const active = metrica === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => setMetrica(opt.value)}
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
