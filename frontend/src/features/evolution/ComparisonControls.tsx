import { useAppStore } from "../../shared/store/useAppStore";

/** Control de comparación (HU-3.04): "Comparar" activa el modo región,
 * que superpone una segunda región (Serie B) sobre la Serie A ya aislada.
 * Solo tiene sentido junto a una región primaria — `EvolutionPanel` no lo
 * renderiza si no hay `selectedRegion`. */
export function ComparisonControls() {
  const comparisonMode = useAppStore((s) => s.comparisonMode);
  const comparisonRegion = useAppStore((s) => s.comparisonRegion);
  const setComparisonMode = useAppStore((s) => s.setComparisonMode);

  const activo = comparisonMode !== "off";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={activo}
        onClick={() => setComparisonMode(activo ? "off" : "region")}
        className={`text-label-md uppercase px-2 py-1 rounded-md transition-colors ${
          activo
            ? "bg-accent-interactive text-accent-interactive-on"
            : "bg-surface-card text-text-secondary hover:bg-surface-card-hover"
        }`}
      >
        Comparar
      </button>

      {activo && (
        <span className="text-label-md normal-case text-text-secondary">
          {comparisonRegion ? comparisonRegion.nombre : "Haz clic en una segunda región en el mapa"}
        </span>
      )}
    </div>
  );
}
