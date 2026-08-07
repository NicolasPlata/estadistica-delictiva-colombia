# Frontend — Estadística Delictiva Colombia

React (Vite + TypeScript) + Zustand + Tailwind CSS v4 + MapLibre GL JS (llega en Fase 3). **Fase 1 (Setup e Infraestructura Base) completa** — ver [`docs/plans/03-plan-desarrollo-frontend.md`](../docs/plans/03-plan-desarrollo-frontend.md) para el roadmap y [`BACKLOG.md`](../BACKLOG.md) para el estado granular.

```
src/
  app/                  # shell raíz — monta data-theme en <html> en sync con el store (RNF-04, HU-1.05)
  features/
    map/                 # (Fase 3) canvas MapLibre, basemap switcher, choropleth, tooltip
    filters/              # (Fase 2) sidebar y su slice de estado
    kpis/                 # (Fase 4) tarjetas KPI, donut de género
    evolution/            # (Fase 4) gráfico de líneas/barras, comparación (HU-3.04)
  shared/
    api/                  # types.ts — tipos que reflejan docs/architecture/02-api-contracts.md
    design-system/        # tokens.css — variables CSS + @theme de Tailwind, fuente: docs/design/00-design-system.md
    store/                 # useAppStore.ts (Zustand) — tema, mapa base, GlobalFilters
```

## Tokens de diseño
`shared/design-system/tokens.css` traduce la tabla de roles reconciliada de [`docs/design/00-design-system.md`](../docs/design/00-design-system.md) a variables CSS, conmutadas por `[data-theme="light"]` en `<html>` (Dark es el default **incondicional** — RNF-04 no depende de `prefers-color-scheme`). Integradas a Tailwind v4 vía `@theme` (`bg-surface-canvas`, `text-text-primary`, etc. — nunca hex ni nombres crudos M3 en componentes).

## Metodología: TDD
Igual rigor que el backend (ver `docs/plans/03-...` "Metodología"): lógica no-visual test-first con Vitest + Testing Library. Ejemplo: `shared/store/theme.test.ts` fija la regla de HU-1.05 (mapa base por defecto según tema) antes de implementarla.

## Correr localmente
```bash
npm install
npm test        # Vitest, debe pasar en verde
npm run dev      # http://localhost:5173
```
