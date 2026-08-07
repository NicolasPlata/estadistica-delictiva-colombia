# Frontend — Estadística Delictiva Colombia

React (Vite + TypeScript) + Zustand + Tailwind CSS v4 + MapLibre GL JS. **Fase 3 (Motor Geográfico y Cartografía) completa** — ver [`docs/plans/03-plan-desarrollo-frontend.md`](../docs/plans/03-plan-desarrollo-frontend.md) para el roadmap y [`BACKLOG.md`](../BACKLOG.md) para el estado granular.

```
src/
  app/                  # shell raíz (Header + Sidebar + Main Area) — monta data-theme en <html> en sync con el store (RNF-04, HU-1.05)
  features/
    map/                 # MapCanvas (MapLibre), BasemapSwitcher (HU-1.05), MapTooltip (HU-1.03), choropleth.ts (cuantiles)
    filters/              # Sidebar + 6 componentes de filtro, cableados a GlobalFilters y a /metadata/filtros
    kpis/                 # (Fase 4) tarjetas KPI, donut de género
    evolution/            # (Fase 4) gráfico de líneas/barras, comparación (HU-3.04)
  shared/
    api/                  # client.ts (fetch wrapper), metadata/geometry/mapStats.ts, types.ts — reflejan docs/architecture/02-api-contracts.md
    design-system/        # tokens.css — variables CSS + @theme de Tailwind, fuente: docs/design/00-design-system.md
    store/                 # useAppStore.ts (Zustand) — tema, mapa base, granularidad, GlobalFilters, vocabulario, caché de geometría
```

## Mapa (MapLibre GL JS)
`vite.config.ts` excluye `maplibre-gl` de `optimizeDeps` — su Web Worker de tilización de GeoJSON se rompe con el pre-bundling de esbuild (ver `BACKLOG.md`, Fase 3, para el detalle del bug). El mapa base se aplica de forma imperativa (`RasterTileSource.setTiles`), nunca vía `setStyle`, para que cambiar de basemap no destruya la capa de choropleth (HU-1.05).

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
