import { useAppStore } from "../../shared/store/useAppStore";
import { FilterSection } from "./FilterSection";

const EMPTY: string[] = [];

export function ArmaMedioSelect() {
  const armaMedio = useAppStore((s) => s.filters.arma_medio);
  const setFilters = useAppStore((s) => s.setFilters);
  const opciones = useAppStore((s) => s.vocabulario?.armas_medios ?? EMPTY);

  return (
    <FilterSection label="Arma / Medio">
      <select
        aria-label="Arma o medio empleado"
        value={armaMedio ?? ""}
        onChange={(e) => setFilters({ arma_medio: e.target.value || undefined })}
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
