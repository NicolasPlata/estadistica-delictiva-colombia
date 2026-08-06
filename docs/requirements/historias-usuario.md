# Historias de Usuario

El siguiente documento detalla el comportamiento de la aplicación desde la perspectiva del usuario final, siguiendo el formato estándar de marcos ágiles.

---

## 🗺️ Épica 1: Exploración Geoespacial

### HU-1.01: Visualizar mapa cartográfico base
**Como** analista de datos o visitante del portafolio  
**Quiero** visualizar un mapa interactivo de Colombia completamente cargado  
**Para** tener un lienzo sobre el cual analizar los datos geográficamente.  
* **Criterios de Aceptación:**
  - El mapa debe renderizarse utilizando MapLibre GL JS y WebGL.
  - El tema visual debe aplicar el "Dark Mode" diseñado (Glassmorphism) por defecto, con posibilidad de alternar a "Light Mode" (ver [Sistema de Diseño](../design/00-design-system.md)).
  - La carga del mapa no debe interrumpir el hilo principal del navegador.

### HU-1.02: Visualizar mapa de calor (Densidad)
**Como** analista  
**Quiero** que los municipios o departamentos cambien de color según su densidad delictiva (Choropleth)  
**Para** identificar rápidamente las "zonas rojas" o focos de concentración.  
* **Criterios de Aceptación:**
  - Los polígonos vectoriales deben servirse desde el backend en formato MVT o GeoJSON optimizado.
  - Debe haber una rampa de color (escala de colores coherente) de menor a mayor intensidad.
  - Si un municipio no tiene datos en el filtro, debe pintarse en un color neutro o transparente.

### HU-1.03: Tooltips con información detallada
**Como** usuario  
**Quiero** hacer hover (pasar el ratón) sobre un polígono del mapa  
**Para** leer un Tooltip emergente con el nombre de la región y la cantidad absoluta de delitos en la selección actual.  
* **Criterios de Aceptación:**
  - El tooltip debe tener renderizado de diseño Glassmorphism.
  - La respuesta al hover debe ser instantánea (basada en el tile vectorial pre-cargado).

### HU-1.04: Alternancia de Granularidad (Departamental vs Municipal)
**Como** analista de datos  
**Quiero** poder utilizar un interruptor (Toggle) en la interfaz para elegir si el mapa de calor muestra la división por Departamentos o por Municipios  
**Para** poder analizar los datos a nivel macro (Departamentos) o a nivel micro (Municipios) sin importar el nivel de zoom en el que me encuentre.  
* **Criterios de Aceptación:**
  - Debe haber un control claramente visible en el mapa o en los filtros para alternar entre ambos modos.
  - El cambio debe redibujar instantáneamente las geometrías (Vector Tiles) para reflejar la agregación delictiva al nivel seleccionado.

### HU-1.05: Selector de Mapa Base
**Como** analista de datos  
**Quiero** poder alternar el mapa base entre OpenStreetMap, Satelital y Oscuro mediante un control flotante sobre el mapa  
**Para** elegir el contexto geográfico (calles, imagen satelital o alto contraste) que mejor se ajuste a lo que estoy analizando.  
* **Criterios de Aceptación:**
  - Debe existir un control flotante (glassmorphism, junto al resto de controles de mapa) que muestre las 3 opciones y cuál está activa.
  - El mapa base por defecto es OpenStreetMap cuando la aplicación está en tema Light, y el mapa Oscuro cuando está en tema Dark.
  - Cambiar el tema de la aplicación (Light/Dark) reestablece el mapa base a su valor por defecto para ese tema, incluso si el usuario había seleccionado manualmente otro mapa base antes del cambio.
  - Cambiar de mapa base no debe afectar ni recargar la capa de choropleth/estadísticas — son capas independientes.
  - Debe mostrarse la atribución legal del proveedor activo (RNF-09).

---

## 🔍 Épica 2: Filtrado y Búsqueda Interactiva

### HU-2.01: Filtros de Rango Temporal
**Como** investigador  
**Quiero** seleccionar un rango de años (2020-2025) en un panel lateral  
**Para** analizar y comparar el comportamiento delictivo año a año.  
* **Criterios de Aceptación:**
  - El cambio en el filtro debe desencadenar una consulta asíncrona inmediata al backend en Rust.
  - El mapa y los gráficos deben actualizarse al recibir la nueva respuesta.

### HU-2.02: Filtro por Tipo de Delito
**Como** ciudadano curioso  
**Quiero** poder filtrar el mapa por categorías delictivas (Ej: Hurtos vs. Homicidios)  
**Para** ver cómo cambia la concentración de los delitos por cada naturaleza criminal.  
* **Criterios de Aceptación:**
  - El usuario debe ver un Selector (Dropdown) con los tipos de delitos (homologados).
  - Por defecto debe cargarse una vista "Todos" si así se configura.

### HU-2.03: Filtros Demográficos (Armas, Género, Edad)
**Como** analista de seguridad  
**Quiero** poder incluir variables demográficas (género, grupo de edad y arma/medio empleado)  
**Para** poder segmentar y perfilar las tendencias criminales.  
* **Criterios de Aceptación:**
  - Se debe poder cruzar "Filtro Temporal" + "Filtro Delito" + "Filtro Arma".
  - El conteo total de la interfaz debe coincidir fielmente con las reglas de negocio (agregando la columna `cantidad`).

---

## 📊 Épica 3: Gráficas y Métricas (Dashboarding)

### HU-3.01: Panel de KPIs de Alto Nivel
**Como** usuario  
**Quiero** ver paneles grandes (Tarjetas informativas) con el total de delitos, el mes de mayor impacto y la distribución por género  
**Para** tener un resumen gerencial sin esfuerzo.  
* **Criterios de Aceptación:**
  - El endpoint `/api/stats` debe suministrar los conteos agregados listos para mostrar.
  - Los números grandes deben ser formateados con separadores de miles para legibilidad.
  - Se debe incluir un KPI o indicador visual rápido (Ej. Donut chart pequeño o porcentaje) resaltando la afectación por género.

### HU-3.02: Gráfico de Series de Tiempo
**Como** analista estadístico  
**Quiero** ver un gráfico de líneas (Line Chart) histórico con la evolución mes a mes  
**Para** poder visualizar si la criminalidad aumentó o disminuyó, ignorando el mapa.  
* **Criterios de Aceptación:**
  - Se utilizará una librería de gráficos moderna (ej. Recharts o Nivo).
  - El eje X representa los meses/años y el eje Y representa la cantidad absoluta.
  - Debe responder reactivamente a los filtros globales del sidebar.

### HU-3.03: Gráfico de Barras Evolutivo por Región
**Como** analista territorial  
**Quiero** hacer clic en un departamento o municipio específico en el mapa (o seleccionarlo en el filtro)  
**Para** ver desplegado un gráfico de barras que me muestre cómo ha avanzado la criminalidad a lo largo de los años (2020-2025) en ese territorio particular.  
* **Criterios de Aceptación:**
  - Al aislar una región, el Dashboard debe mostrar un gráfico de barras (Bar Chart) donde cada barra representa un año.
  - Se debe permitir apreciar visualmente la tendencia ascendente o descendente de manera muy clara.
  - El título del gráfico debe actualizarse dinámicamente indicando la región seleccionada (Ej. "Evolución Anual - Antioquia").

### HU-3.04: Comparación Paralela de Regiones o Periodos (RF-09)
**Como** analista territorial  
**Quiero** activar un modo de comparación dentro del panel de evolución (HU-3.03) y elegir si comparo dos regiones o dos rangos de periodo  
**Para** contrastar visualmente dos series sin tener que memorizar o alternar entre pantallas.  
* **Criterios de Aceptación:**
  - Un control "Comparar" dentro del panel de evolución activa el modo comparación, con un selector "Por Región" / "Por Periodo".
  - **Por Región:** el usuario elige una segunda región (departamento o municipio); el resto de filtros (años, delito, género, etc.) se mantienen iguales para ambas series.
  - **Por Periodo:** el usuario elige un segundo rango de años; el resto de filtros se mantienen iguales para ambas series, region incluida.
  - El gráfico de evolución superpone ambas series (Serie A / Serie B) con colores distintos y una leyenda — no dos gráficos separados, para permitir comparación visual directa punto a punto.
  - No requiere cambios en el backend: cada serie se obtiene con una llamada independiente a `POST /api/v1/stats/evolution` (y opcionalmente `/stats/kpi`) con su propio `GlobalFilters` — el comparador vive enteramente en el frontend.
  - Los colores de Serie A/Serie B son fijos y reservados para este uso (no se reutilizan en otro contexto de la app) — ver `docs/design/00-design-system.md`.
