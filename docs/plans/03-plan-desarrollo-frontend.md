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

---

## Fase 5: Integración Total y Optimización (Polish)
**Objetivo:** Conectar todo, probar fluidamente y optimizar carga.

*   **Hito 5.1: Bindings del Estado (Reactividad)**
    *   Vincular el botón "Aplicar Filtros" (o actualización en tiempo real) para que modifique el estado global, gatillando re-renderizados eficientes en el Mapa y Gráficos simultáneamente.
*   **Hito 5.2: Optimización de TTV (Time to View)**
    *   Asegurar *Code Splitting*.
    *   Comprobar que el mapa renderice por encima de 60 FPS y el estado inicial se vea en pantalla en menos de 2 segundos.
    *   Añadir loaders dinámicos atractivos durante las consultas a la API.
