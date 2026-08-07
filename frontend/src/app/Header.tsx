import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

/** El botón de filtros (hamburguesa) solo existe en móvil (`md:hidden`) —
 * en escritorio el Sidebar ya está siempre visible, no hay nada que abrir
 * (ver `App.tsx` para el estado `mobileFiltersOpen` que este botón
 * controla). */
export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 bg-surface-panel border-b border-border">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-headline-md text-text-primary truncate">Estadística Delictiva - Colombia</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <ThemeToggle />
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir filtros"
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-text-secondary hover:bg-surface-card-hover"
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}
