import { Map as MapIcon, Moon, Satellite } from "lucide-react";
import type { Basemap } from "../../shared/api/types";
import { useAppStore } from "../../shared/store/useAppStore";

const OPCIONES: { value: Basemap; label: string; Icon: typeof MapIcon }[] = [
  { value: "osm", label: "OpenStreetMap", Icon: MapIcon },
  { value: "satelital", label: "Satelital", Icon: Satellite },
  { value: "oscuro", label: "Oscuro", Icon: Moon },
];

/** Control flotante glassmorphism sobre el mapa (HU-1.05) — nunca toca la
 * capa de choropleth/estadísticas, solo la fuente raster de fondo. */
export function BasemapSwitcher() {
  const basemap = useAppStore((s) => s.basemap);
  const setBasemap = useAppStore((s) => s.setBasemap);

  return (
    <div
      role="group"
      aria-label="Selector de mapa base"
      className="absolute top-4 right-4 flex gap-1 rounded-lg border border-border bg-surface-panel/80 backdrop-blur-md p-1 shadow-lg"
    >
      {OPCIONES.map(({ value, label, Icon }) => {
        const active = basemap === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => setBasemap(value)}
            className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${
              active
                ? "bg-accent-interactive text-accent-interactive-on"
                : "text-text-secondary hover:bg-surface-card-hover"
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
