# Frontend — Estadística Delictiva Colombia

React (Vite + TypeScript) + Zustand + Tailwind CSS v4 + MapLibre GL JS + Recharts. **Completo**, incluyendo las 3 funcionalidades del plan v2 (tasa per cápita, desglose de delitos, leyenda del mapa) — ver [`docs/plans/03-plan-desarrollo-frontend.md`](../docs/plans/03-plan-desarrollo-frontend.md) y [`docs/plans/04-plan-desarrollo-funcionalidades-v2.md`](../docs/plans/04-plan-desarrollo-funcionalidades-v2.md) para el detalle por Hito, y [`BACKLOG.md`](../BACKLOG.md) para el estado granular. Única deuda conocida: sidebar sin colapsar en móvil (ver "Deuda técnica" en `BACKLOG.md`).

```
src/
  app/                   # shell raíz: Header + Sidebar + Main Area — monta data-theme en <html> en sync con el store (RNF-04, HU-1.05)
  features/
    map/                  # MapCanvas (MapLibre), BasemapSwitcher (HU-1.05), MapLegend (HU-1.02), MapTooltip (HU-1.03), choropleth.ts (cuantiles)
    filters/               # Sidebar + 7 componentes de filtro (incluye MetricaToggle, Cantidad/Tasa), cableados a GlobalFilters y a /metadata/filtros
    kpis/                  # KpisPanel + donut de género (HU-3.01)
    evolution/             # EvolutionPanel: línea nacional/barras regionales (HU-3.02/3.03) + comparación Serie A/B (HU-3.04)
    breakdown/             # RegionBreakdownPanel: tabla + pastel del desglose de delitos por tipo/categoría (HU-3.05), nacional por defecto
  shared/
    api/                   # client.ts (fetch wrapper), metadata/geometry/mapStats/kpis/evolution/breakdown.ts, types.ts — reflejan docs/architecture/02-api-contracts.md
    design-system/         # tokens.css — variables CSS + @theme de Tailwind, fuente: docs/design/00-design-system.md
    store/                  # useAppStore.ts (Zustand) — tema, mapa base, granularidad, métrica, GlobalFilters, vocabulario, caché de geometría, selección/comparación de regiones
```

## Rendimiento (Hito 5.2)

`MapCanvas`/`KpisPanel`/`EvolutionPanel`/`RegionBreakdownPanel` se cargan con `React.lazy` (cada uno en su propio `<Suspense>`) — MapLibre (~970KB) y Recharts son las dependencias más pesadas y nunca bloquean el pintado inicial del shell. Medido contra un build de producción real (`vite preview`): shell visible en ~108ms, mapa montado en ~954ms, 60 FPS incluso con la granularidad más pesada (1.122 municipios).

## Mapa (MapLibre GL JS)

`vite.config.ts` excluye `maplibre-gl` de `optimizeDeps` — su Web Worker de tilización de GeoJSON se rompe con el pre-bundling de esbuild (ver `BACKLOG.md`, Fase 3, para el detalle del bug). El mapa base se aplica de forma imperativa (`RasterTileSource.setTiles`), nunca vía `setStyle`, para que cambiar de basemap no destruya la capa de choropleth (HU-1.05). El límite departamental (`departamentos-limite`) se dibuja siempre, en ambas granularidades, como referencia geográfica constante (HU-1.04, token `limite-departamental`). La rampa de color es siempre "más oscuro = más peligroso" en ambos temas, con `MapLegend` indicándolo explícitamente.

## Tokens de diseño

`shared/design-system/tokens.css` traduce la tabla de roles reconciliada de [`docs/design/00-design-system.md`](../docs/design/00-design-system.md) a variables CSS, conmutadas por `[data-theme="dark"]` en `<html>` — **Light es el default incondicional** (RNF-04, revisado 2026-08-07; no depende de `prefers-color-scheme`). Integradas a Tailwind v4 vía `@theme` (`bg-surface-canvas`, `text-text-primary`, etc. — nunca hex ni nombres crudos M3 en componentes).

## Metodología: TDD

Igual rigor que el backend (ver `docs/plans/03-...`/`04-...` "Metodología"): lógica no-visual test-first con Vitest + Testing Library — filtros, formateo, agregaciones y el store se cubren con tests; los componentes de puro markup (paneles, toggles) no, salvo que tengan lógica embebida real. Ejemplo: `shared/store/theme.test.ts` fija la regla de HU-1.05 (mapa base por defecto según tema) antes de implementarla.

**84 tests** (Vitest + Testing Library) en 20 archivos.

## Correr localmente

```bash
npm install
npm test        # 84 tests, deben pasar en verde
npm run dev      # http://localhost:5173
```

Guía completa (backend + base de datos + stack completo) en [`docs/desarrollo-local.md`](../docs/desarrollo-local.md).
