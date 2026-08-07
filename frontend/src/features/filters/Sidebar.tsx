import { useEffect } from "react";
import { useAppStore } from "../../shared/store/useAppStore";
import { ArmaMedioSelect } from "./ArmaMedioSelect";
import { DelitosMultiSelect } from "./DelitosMultiSelect";
import { GeneroSegmentedControl } from "./GeneroSegmentedControl";
import { GranularidadToggle } from "./GranularidadToggle";
import { GrupoEdadSelect } from "./GrupoEdadSelect";
import { YearRangeSelect } from "./YearRangeSelect";

export function Sidebar() {
  const loadVocabulario = useAppStore((s) => s.loadVocabulario);
  const vocabularioStatus = useAppStore((s) => s.vocabularioStatus);

  useEffect(() => {
    loadVocabulario();
  }, [loadVocabulario]);

  return (
    <aside className="w-72 shrink-0 h-full overflow-y-auto bg-surface-panel border-r border-border px-4 py-6 flex flex-col gap-5">
      <GranularidadToggle />
      <YearRangeSelect />
      <DelitosMultiSelect />
      <GeneroSegmentedControl />
      <GrupoEdadSelect />
      <ArmaMedioSelect />

      {vocabularioStatus === "error" && (
        <p className="text-label-md text-status-critical" role="alert">
          No se pudieron cargar los filtros disponibles.
        </p>
      )}
    </aside>
  );
}
