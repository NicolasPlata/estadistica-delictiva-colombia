import { useAppStore } from "../../shared/store/useAppStore";
import { FilterSection } from "./FilterSection";

const EMPTY: string[] = [];

export function GrupoEdadSelect() {
  const grupoEdad = useAppStore((s) => s.filters.grupo_edad);
  const setFilters = useAppStore((s) => s.setFilters);
  const opciones = useAppStore((s) => s.vocabulario?.grupos_edad ?? EMPTY);

  return (
    <FilterSection label="Grupo de Edad">
      <select
        aria-label="Grupo de edad"
        value={grupoEdad ?? ""}
        onChange={(e) => setFilters({ grupo_edad: e.target.value || undefined })}
        className="w-full bg-surface-card border border-border rounded-md px-2 py-1.5 text-text-primary text-body-sm focus:outline-none focus:ring-2 focus:ring-accent-interactive"
      >
        <option value="">Todos</option>
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </select>
    </FilterSection>
  );
}
