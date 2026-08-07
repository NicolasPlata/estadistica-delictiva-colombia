import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-surface-panel border-b border-border">
      <div className="flex items-baseline gap-2">
        <span className="text-headline-md text-text-primary">Estadística Delictiva - Colombia</span>
      </div>
      <ThemeToggle />
    </header>
  );
}
