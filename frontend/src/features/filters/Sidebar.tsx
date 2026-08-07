import { X } from "lucide-react";
import { useEffect } from "react";
import { useAppStore } from "../../shared/store/useAppStore";
import { ArmaMedioSelect } from "./ArmaMedioSelect";
import { DelitosMultiSelect } from "./DelitosMultiSelect";
import { GeneroSegmentedControl } from "./GeneroSegmentedControl";
import { GranularidadToggle } from "./GranularidadToggle";
import { GrupoEdadSelect } from "./GrupoEdadSelect";
import { MetricaToggle } from "./MetricaToggle";
import { YearRangeSelect } from "./YearRangeSelect";

/** En escritorio (`md:` y superior) es la columna estática de siempre. En
 * móvil se convierte en un drawer de pantalla completa, oculto por
 * defecto — `open`/`onClose` los controla `App.tsx` (estado de
 * navegación, no pertenece a `useAppStore`: no es un filtro ni algo que
 * otro componente necesite leer, mismo criterio ya usado para otros
 * estados "locales a la interacción" en este proyecto). Diseñado en
 * Figma antes de implementarse (Flow Screens, "... — Filtros Abiertos"). */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const loadVocabulario = useAppStore((s) => s.loadVocabulario);
  const vocabularioStatus = useAppStore((s) => s.vocabularioStatus);

  useEffect(() => {
    loadVocabulario();
  }, [loadVocabulario]);

  return (
    <aside
      className={`${open ? "flex" : "hidden"} md:flex flex-col gap-5 fixed md:static inset-0 z-30 md:z-auto w-full md:w-72 md:shrink-0 h-full overflow-y-auto bg-surface-panel md:border-r md:border-border px-4 py-6`}
    >
      <div className="flex items-center justify-between md:hidden">
        <span className="text-label-md text-text-secondary uppercase">Filtros Globales</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar filtros"
          className="flex items-center justify-center w-8 h-8 rounded-full text-text-secondary hover:bg-surface-card-hover"
        >
          <X size={16} />
        </button>
      </div>

      <GranularidadToggle />
      <MetricaToggle />
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
