import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useAppStore } from "../../shared/store/useAppStore";
import { FilterSection } from "./FilterSection";
import { toggleSelection } from "./toggleSelection";

const EMPTY: string[] = [];

export function DelitosMultiSelect() {
  const [open, setOpen] = useState(false);
  const selected = useAppStore((s) => s.filters.delitos ?? EMPTY);
  const setFilters = useAppStore((s) => s.setFilters);
  const opciones = useAppStore((s) => s.vocabulario?.delitos ?? EMPTY);

  function toggle(delito: string) {
    setFilters({ delitos: toggleSelection(selected, delito) });
  }

  return (
    <FilterSection label="Tipo de Delito">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 bg-surface-card border border-border rounded-md px-2 py-1.5 text-text-primary text-body-sm"
        >
          <span className="truncate">
            {selected.length ? `${selected.length} seleccionados` : "Todos"}
          </span>
          <ChevronDown size={16} className="text-text-secondary shrink-0" />
        </button>

        {open && (
          <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-surface-card border border-border rounded-md shadow-lg">
            {opciones.map((delito) => (
              <label
                key={delito}
                className="flex items-start gap-2 px-2 py-1.5 text-body-sm text-text-primary hover:bg-surface-card-hover cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(delito)}
                  onChange={() => toggle(delito)}
                  className="accent-accent-interactive shrink-0 mt-0.5"
                />
                {/* Sin truncate: la lista del propio select tenía el mismo
                    problema que los chips — nombres largos cortados con
                    "..." antes de poder leerlos para elegir. */}
                <span className="min-w-0">{delito}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        // Apilados de ancho completo, sin truncar (mismo patrón que
        // "Multiselect Chip-Input" en Figma, `17:45`) — los nombres de
        // delito son largos ("ARTICULO 219 A. UTILIZACION O FACILITACION
        // DE MEDIOS DE COMUNICACION...") y truncarlos con "..." dentro de
        // una píldora angosta (versión anterior) ocultaba justo la
        // información que el usuario necesita para saber qué seleccionó.
        <div className="flex flex-col gap-1.5">
          {selected.map((delito) => (
            <span
              key={delito}
              className="flex items-center justify-between gap-2 bg-accent-interactive text-accent-interactive-on text-label-md normal-case px-2 py-1 rounded-md"
            >
              <span>{delito}</span>
              <button
                type="button"
                onClick={() => toggle(delito)}
                aria-label={`Quitar ${delito}`}
                className="shrink-0"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </FilterSection>
  );
}
