# Plan de Desarrollo: Frontend (React)

Este documento detalla la hoja de ruta estratégica para el desarrollo del Cliente/Dashboard de Estadística Delictiva, garantizando el cumplimiento de requerimientos técnicos (Performance) y de interfaz (Premium/Glassmorphism).

## Metodología: TDD
Igual que en el backend (ver `docs/plans/02-plan-desarrollo-backend.md`), la lógica no-visual se escribe test-first: funciones de `shared/api/` (mapeo de respuestas de `02-api-contracts.md`), lógica de `shared/store/` (ej. el reseteo de mapa base al cambiar tema, HU-1.05) y utilidades de formateo (separadores de miles, etc.) llevan tests unitarios (Vitest) escritos antes de la implementación. Los componentes visuales puros se verifican manualmente en el navegador — TDD aplica a lógica, no a maquetado.

---

## Fase 1: Setup e Infraestructura Base
**Objetivo:** Crear el entorno de desarrollo y configurar las bases arquitectónicas de la interfaz de usuario.

*   **Hito 1.1: Inicialización**
    *   Crear proyecto React utilizando `Vite` (por velocidad de compilación).
    *   Configurar herramientas de estilos: Tailwind CSS (recomendado para desarrollo ágil) o CSS puro modularizado, según preferencia técnica final.
    *   Instalar dependencias estructurales: `lucide-react` (iconos), `axios` o `fetch` nativo para API.
    *   **Estructura por *features*, no por tipo de archivo** (evitar carpetas `components/`, `hooks/`, `utils/` como cajón de sastre):
        ```
        src/
          app/                  # shell, providers, router, montaje del tema (data-theme)
          features/
            map/                # canvas MapLibre, basemap switcher, capa choropleth, tooltip
            filters/             # sidebar y su slice de estado (GlobalFilters)
            kpis/                # tarjetas KPI, donut de género
            evolution/           # gráfico de líneas y de barras
          shared/
            api/                 # funciones fetch, una por endpoint de 02-api-contracts.md
            design-system/       # tokens como variables CSS, componentes base (Button, Select, Chip...)
            store/               # store Zustand raíz
        ```
    *   Traducir los tokens de [`docs/design/DESIGN-dark.md`](../design/DESIGN-dark.md) y [`DESIGN-light.md`](../design/DESIGN-light.md) a variables CSS conmutables por `data-theme`, siguiendo la estrategia de theming descrita en [`docs/design/00-design-system.md`](../design/00-design-system.md). Resolver explícitamente ahí las inconsistencias de rol semántico (`primary`) señaladas en ese documento antes de mapear los tokens a componentes.
*   **Hito 1.2: Gestión de Estado (State Management)**
    *   Implementar gestor de estado global (Zustand o Context API) para almacenar centralmente el objeto `GlobalFilters` y orquestar las peticiones a la API.
    *   Incluir en el store el tema activo (`Light`/`Dark`) y el mapa base activo (`osm`/`satelital`/`oscuro`), con la lógica de HU-1.05: cambiar el tema reestablece el mapa base a su default para ese tema (ver [Mapas Base](../architecture/01-arquitectura.md#mapas-base-basemaps)).

---

## Fase 2: Construcción del Layout y UI "Premium"
**Objetivo:** Desarrollar el esqueleto visual de la aplicación asegurando el "Dark Mode" y la estética Glassmorphism solicitada en los Requerimientos No Funcionales.

*   **Hito 2.1: Estructura Principal (Layout)**
    *   Diseñar el `Sidebar` (Panel lateral izquierdo) para alojar todos los controles de filtrado.
    *   Diseñar el contenedor principal (`Main Area`) que alojará el Mapa al 100% de la pantalla.
    *   Asegurar la responsividad del layout mediante un Sidebar colapsable en móviles.
*   **Hito 2.2: Componentes Base**
    *   Crear controles visuales de alta calidad: Selector de rango de Años, selector múltiple de Delitos, segmented control de Género, selectores de Grupo de Edad y Arma/Medio (HU-2.03), interruptor (Toggle) de Granularidad (Departamento vs. Municipio).
    *   Poblar Delitos/Arma-Medio/Género/Grupo de Edad desde una única llamada a `GET /api/v1/metadata/filtros` al montar la app (ver `02-api-contracts.md` §4.1) — no hardcodear estas listas en el frontend.

---

## Fase 3: Motor Geográfico y Cartografía
**Objetivo:** Integrar el lienzo del mapa y hacer que reaccione dinámicamente a los datos del backend.

*   **Hito 3.1: Configuración de MapLibre GL JS**
    *   Instalar `maplibre-gl` y `react-map-gl`.
    *   Configurar las 3 fuentes raster de mapa base (OpenStreetMap, Satelital Esri, Oscuro CARTO — ver [Mapas Base](../architecture/01-arquitectura.md#mapas-base-basemaps)) y el control flotante para alternar entre ellas (HU-1.05), incluyendo el reseteo automático al default de cada tema al cambiar Light/Dark y la atribución legal visible del proveedor activo (RNF-09).
*   **Hito 3.2: Capas Temáticas y Tooltips**
    *   Cargar la geometría desde `GET /api/v1/map/geometry/{granularidad}` **una sola vez** por granularidad (al montar el mapa o al hacer toggle Departamento/Municipio) y mantenerla cacheada en memoria/estado del cliente (ver [ADR 0002](../adr/0002-separacion-geometria-estadisticas.md)).
    *   En cada cambio de `GlobalFilters`, pedir únicamente `POST /api/v1/map/stats` (payload liviano `{codigo_dane: cantidad}`) y aplicarlo sobre la geometría ya cargada mediante `map.setFeatureState()` + expresiones `match`/`case` de MapLibre (Data-driven styling), en vez de volver a pedir o re-renderizar polígonos.
    *   Las regiones ausentes en la respuesta de `stats` deben pintarse con el color neutro/transparente definido en HU-1.02.
    *   Desarrollar el `Tooltip` flotante (Glassmorphism) que se activa mediante los eventos `onHover` del mapa, leyendo el valor ya asignado por `feature-state` (Historia de Usuario HU-1.03).

**Estado: Fase 3 completa.** Notas de implementación y hallazgos reales (no anticipados en el plan original):

- `react-map-gl` (vía su entrada `/maplibre`, que envuelve `@vis.gl/react-maplibre`) + `maplibre-gl`. La geometría se cachea en `useAppStore` (`geometryCache`/`loadGeometry`, mismo patrón fetch-once que `loadVocabulario`); las estadísticas se piden por separado (`shared/api/mapStats.ts`) en cada cambio de `filters`/`granularidad` y se aplican con `map.setFeatureState` — nunca se reconstruye la fuente GeoJSON.
- **Clasificación por cuantiles, no umbrales fijos:** `features/map/choropleth.ts` (`computeQuantileBreaks` + `buildChoroplethExpression`, TDD'd) reparte el rango de valores del filtro activo en 5 cubetas (nearest-rank) mapeadas a los 5 pasos fijos de la rampa de `00-design-system.md` — necesario porque el rango de "cantidad" cambia radicalmente según el filtro (no tendría sentido un umbral fijo).
- **Bug real de Vite, no de la app:** el pre-bundling de esbuild rompe el Web Worker que `maplibre-gl` usa para tilizar fuentes GeoJSON (sirve un `maplibre-gl-worker.mjs` que nunca existe) — las fuentes GeoJSON se quedaban sin cargar *para siempre*, sin ningún error visible en consola. Corregido con `optimizeDeps.exclude: ['maplibre-gl']` en `vite.config.ts`.
- **Bug real de timing, encontrado con Playwright real (no jsdom):** `map.setFeatureState` fijado antes de que el source termine de tilizar (`isSourceLoaded`) se pierde silenciosamente en cuanto el tile "real" reemplaza al provisional — corregido sondeando `isSourceLoaded` por `requestAnimationFrame` antes de aplicar. Un ref (`useRef`) leído dentro de otro efecto también resultó "stale" (react-map-gl crea la instancia de MapLibre en un efecto interno posterior al primer render) — corregido guardando el mapa en `useState` para que su llegada dispare un re-render real.
- **HU-1.05, violación real encontrada y corregida:** la primera implementación reconstruía el `mapStyle` completo (`setStyle`) en cada cambio de mapa base, lo que MapLibre interpreta como "recargar el estilo" y destruye cualquier fuente/capa no declarada en el nuevo objeto — es decir, borraba la capa de choropleth cada vez que se cambiaba de mapa base o de tema, justo lo que la HU prohíbe explícitamente. Corregido: el `mapStyle` es estático (nunca cambia de identidad) y el mapa base real se aplica de forma imperativa vía `RasterTileSource.setTiles()`, que no toca el resto del estilo. La atribución (RNF-09) se renderiza como texto propio (no vía el `AttributionControl` de MapLibre, que no se actualiza solo al cambiar tiles con este enfoque).
- **Verificación visual real con datos reales:** backend levantado localmente contra Postgres real, verificado con Playwright headless (WebGL por software) en ambos temas, las 3 fuentes base, ambas granularidades, y el tooltip mostrando el valor exacto devuelto por `POST /api/v1/map/stats` (ej. Tolima, 145.376 delitos).

**Adenda (post-cierre) — Límite departamental siempre visible (HU-1.04):** feedback del usuario tras revisar la Fase 3: en la vista de Municipio se perdía toda referencia departamental. Se agregó una tercera fuente/capa (`departamentos-limite`), independiente de `regiones` — siempre carga la geometría de `DEPARTAMENTO` (`loadGeometry("DEPARTAMENTO")` sin condicionar a la granularidad activa; el cache fetch-once de `useAppStore` evita el refetch si ya estaba cargada) y la dibuja como línea sólida de 2px en un tono reservado (`limite-departamental`, teal — ver Hallazgo adicional en `00-design-system.md`), por encima de la capa de límites normal. Primer intento con línea discontinua descartado tras verificación visual: a la escala de país completo el patrón se volvía casi ilegible — una línea sólida y algo más gruesa fue la que realmente cumplió "esta línea se debe ver".

**Bug real reportado por el usuario tras el despliegue de lo anterior (dos vueltas):** al cambiar a Municipio, la línea departamental quedaba *debajo* de la capa de municipios. Causa raíz: `geometry` (la fuente `regiones`) pasa por `undefined` mientras la geometría de Municipio —bastante más pesada que la de Departamento— todavía está cargando, así que React desmonta y remonta esa fuente/capa; al remontarse, MapLibre la agrega al tope del estilo, por encima de `departamentos-limite`.

El primer intento (un efecto que llamaba `map.moveLayer(id)` una sola vez cuando `geometry` cambiaba) no alcanzó — el usuario lo reportó de nuevo. Diagnosticado con un hook de depuración temporal (`window.__debugMap`, expone la instancia de MapLibre) inspeccionando `map.getStyle().layers` en distintos momentos tras el cambio de granularidad: el remontaje de `regiones` ocurre en un *tick posterior* al del efecto (no en el mismo commit de React como se había asumido), así que `moveLayer` se ejecutaba antes de que `regiones` se re-agregara y quedaba sin efecto. Corregido escuchando el evento `styledata` de MapLibre (se dispara en cada alta/baja de capa del estilo) y reafirmando el tope ahí — cubre el reordenamiento sin depender de ninguna suposición sobre el orden de los efectos de React. Verificado con el mismo hook de depuración (orden de capas correcto en cada punto del tiempo, no solo al final) y alternando Departamento/Municipio repetidamente contra el backend real.

---

## Fase 4: Dashboarding y Gráficas Estadísticas
**Objetivo:** Mostrar los KPI analíticos de soporte sobre el mapa cartográfico.

*   **Hito 4.1: Tarjetas de KPIs y Género**
    *   Construir panel superior flotante o sidebar-top para mostrar Totales y Variación.
    *   Implementar minigráfico (Donut Chart pequeño) para visualizar rápidamente la brecha de género (HU-3.01).
*   **Hito 4.2: Gráficos de Evolución Regional**
    *   Instalar librería de gráficos (ej. `Recharts`, `Chart.js` o `Nivo`).
    *   Crear el componente `EvolutionBarChart` que aparecerá en un panel flotante inferior o modal no obstructivo cuando el usuario haga clic en un territorio (HU-3.03).
*   **Hito 4.3: Comparación Paralela (HU-3.04, RF-09)**
    *   Agregar el control "Comparar" al panel de evolución del Hito 4.2, con selector "Por Región" / "Por Periodo".
    *   Sin cambios de backend: cada serie sale de su propia llamada a `POST /api/v1/stats/evolution` con un `GlobalFilters` independiente — el estado de comparación (Serie A/B) vive en el store del cliente.
    *   Superponer ambas series en el mismo gráfico (no dos gráficos separados) usando los tokens `comparacion-serie-a`/`comparacion-serie-b` de `docs/design/00-design-system.md` — reservados exclusivamente para este uso.

**Estado: Fase 4 completa.** Notas de implementación y hallazgos reales:

- **Recharts** (peer deps compatibles con React 19). KPIs y evolución se piden por separado (`shared/api/kpis.ts`, `evolution.ts`) — ninguno vive en `useAppStore`, ambos son estado local de sus paneles (mismo patrón que `MapCanvas`'s `mapStatsData`), reactivos a `GlobalFilters` vía `useEffect`.
- **Gap real de diseño (Hito 4.1):** el donut de género necesitaba 3 colores categóricos que no reutilizaran `comparacion-serie-a/b` (reservados para HU-3.04) ni la familia roja (choropleth/`status-critical`). Se validaron combinaciones con `validate_palette.js --pairs all` hasta encontrar slots 4/6/7 (amarillo/verde/violeta) — documentado como Reconciliación 5 en `00-design-system.md`.
- **`selectedRegion` vive fuera de `GlobalFilters` (Hito 4.2):** aislar un territorio para el panel de evolución (HU-3.03) no debe filtrar el mapa ni los KPIs — es estado propio en `useAppStore`, traducido a `departamento_id`/`municipio_id` solo al construir la petición de evolución (`buildEvolutionFilters`). Se limpia junto con la granularidad (un `codigo_dane` de departamento y uno de municipio no son la misma entidad).
- **Clic en el mapa como selector de región (Hito 4.2/4.3):** no existe un dropdown de región en el sidebar — la única forma de elegir territorio es haciendo clic en el mapa, que resalta la región con `feature-state.selected`. En modo comparación "Por Región" (Hito 4.3), el mismo clic se redirige a elegir la Serie B en vez de reemplazar la Serie A.
- **Alineación de series en la comparación (Hito 4.3):** "Por Región" comparte el mismo rango de años en ambas series, así que se alinea por el `periodo` real; "Por Periodo" compara rangos de años distintos, donde alinear por calendario no tiene sentido — se alinea por posición relativa ("Año 1", "Año 2"...), rellenando con cero la serie más corta (técnica "indexed to a common base" del skill de dataviz).
- Los 3 hitos verificados con datos reales end-to-end (backend local + Playwright), no solo con mocks: total nacional (4.836.275, coincide con el conteo pre-rollup de la migración), caída real de criminalidad en 2020 visible en la línea mensual, comparación Tolima vs. Antioquia con magnitudes reales.

---

## Fase 5: Integración Total y Optimización (Polish)
**Objetivo:** Conectar todo, probar fluidamente y optimizar carga.

*   **Hito 5.1: Bindings del Estado (Reactividad)**
    *   Vincular el botón "Aplicar Filtros" (o actualización en tiempo real) para que modifique el estado global, gatillando re-renderizados eficientes en el Mapa y Gráficos simultáneamente.
*   **Hito 5.2: Optimización de TTV (Time to View)**
    *   Asegurar *Code Splitting*.
    *   Comprobar que el mapa renderice por encima de 60 FPS y el estado inicial se vea en pantalla en menos de 2 segundos.
    *   Añadir loaders dinámicos atractivos durante las consultas a la API.

**Estado: Fase 5 completa — Frontend 100% terminado.**

- **Hito 5.1 ya estaba satisfecho de facto**, sin trabajo nuevo: desde la Fase 2 cada control de filtro llama `setFilters` directamente al cambiar (se tomó la alternativa "actualización en tiempo real" que el plan ya permitía, en vez de un botón "Aplicar Filtros"), y cada consumidor (`MapCanvas`, `KpisPanel`, `EvolutionPanel`) se suscribe a `filters` con un selector Zustand acotado — cada uno refresca de forma independiente sin re-renders cruzados.
- **Hito 5.2 — code splitting real:** `MapCanvas`/`KpisPanel`/`EvolutionPanel` pasados a `React.lazy`, cada uno en su propio `<Suspense>` (para que los paneles de Recharts, más livianos, no esperen al chunk de MapLibre). El bundle crítico inicial bajó de 630KB a 190KB (185KB→60KB gzip); `maplibre-gl` (~970KB) y Recharts cargan en paralelo después del primer pintado, no antes.
- **Loaders:** esqueletos `animate-pulse` (mismas dimensiones que el panel real, sin salto de layout) para KPIs/evolución mientras cargan datos; spinner para el chunk del mapa mientras carga código.
- **Medido contra un build de producción real (`vite preview`), no el dev server** — la métrica que importa es la de producción: shell (Header+Sidebar) visible en 108ms, mapa montado en 954ms (ambos muy por debajo del presupuesto de 2s de RNF-01); FPS del mapa 60.0 en reposo / 60.3 paneando, con la granularidad más pesada (1.122 municipios) — ni con WebGL por software (Chromium headless) se pierden frames.
