# Frontend — Estadística Delictiva Colombia

Cliente en React (Vite) + MapLibre GL JS + Zustand. Pendiente de inicializar — ver [Hito 1.1](../docs/plans/03-plan-desarrollo-frontend.md#fase-1-setup-e-infraestructura-base) para el detalle completo, incluyendo la estructura por *features* que debe seguir este proyecto:

```
src/
  app/                  # shell, providers, router, tema (data-theme)
  features/
    map/                # canvas MapLibre, basemap switcher, choropleth, tooltip
    filters/             # sidebar y su slice de estado (GlobalFilters)
    kpis/                # tarjetas KPI, donut de género
    evolution/           # gráfico de líneas y de barras
  shared/
    api/                 # una función fetch por endpoint de 02-api-contracts.md
    design-system/       # tokens como variables CSS, componentes base
    store/               # store Zustand raíz
```

Tokens de diseño (Light/Dark, reconciliados): [`docs/design/00-design-system.md`](../docs/design/00-design-system.md).
Mockups: [Figma](https://www.figma.com/design/NJXIriyDT674hHetseeX0B/estadistica_delicitva).
