import { useAppStore } from "../../shared/store/useAppStore";

const ANIOS = [2020, 2021, 2022, 2023, 2024, 2025];

/** Controles de comparación (HU-3.04): "Comparar" activa el modo, un
 * segmented control elige Por Región / Por Periodo, y cada modo muestra
 * su propio selector de Serie B. Solo tiene sentido junto a una región
 * primaria (Serie A) ya aislada — `EvolutionPanel` no lo renderiza si no
 * hay `selectedRegion`. */
export function ComparisonControls() {
  const comparisonMode = useAppStore((s) => s.comparisonMode);
  const comparisonRegion = useAppStore((s) => s.comparisonRegion);
  const comparisonPeriodo = useAppStore((s) => s.comparisonPeriodo);
  const setComparisonMode = useAppStore((s) => s.setComparisonMode);
  const setComparisonPeriodo = useAppStore((s) => s.setComparisonPeriodo);

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
        <>
          <div role="group" aria-label="Tipo de comparación" className="flex rounded-md border border-border overflow-hidden">
            {(["region", "periodo"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={comparisonMode === mode}
                onClick={() => setComparisonMode(mode)}
                className={`text-label-md normal-case px-2 py-1 transition-colors ${
                  comparisonMode === mode
                    ? "bg-accent-interactive text-accent-interactive-on"
                    : "bg-surface-card text-text-secondary hover:bg-surface-card-hover"
                }`}
              >
                {mode === "region" ? "Por Región" : "Por Periodo"}
              </button>
            ))}
          </div>

          {comparisonMode === "region" && (
            <span className="text-label-md normal-case text-text-secondary">
              {comparisonRegion ? comparisonRegion.nombre : "Haz clic en una segunda región en el mapa"}
            </span>
          )}

          {comparisonMode === "periodo" && (
            <div className="flex items-center gap-1">
              <select
                aria-label="Año inicial de comparación"
                value={comparisonPeriodo?.anioInicio ?? ""}
                onChange={(e) =>
                  setComparisonPeriodo({
                    anioInicio: Number(e.target.value),
                    anioFin: comparisonPeriodo?.anioFin ?? Number(e.target.value),
                  })
                }
                className="bg-surface-card border border-border rounded-md px-1.5 py-1 text-text-primary text-label-md normal-case"
              >
                <option value="">Desde</option>
                {ANIOS.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
              <span className="text-text-secondary text-label-md">—</span>
              <select
                aria-label="Año final de comparación"
                value={comparisonPeriodo?.anioFin ?? ""}
                onChange={(e) =>
                  setComparisonPeriodo({
                    anioInicio: comparisonPeriodo?.anioInicio ?? Number(e.target.value),
                    anioFin: Number(e.target.value),
                  })
                }
                className="bg-surface-card border border-border rounded-md px-1.5 py-1 text-text-primary text-label-md normal-case"
              >
                <option value="">Hasta</option>
                {ANIOS.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}
