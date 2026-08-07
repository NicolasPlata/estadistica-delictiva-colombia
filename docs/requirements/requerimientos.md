# Requerimientos del Sistema

## 1. Descripción General del Producto
El sistema es un **Dashboard Interactivo de Estadística Delictiva** enfocado en la visualización geoespacial de crímenes reportados en Colombia entre 2020 y 2025. Está diseñado como una herramienta analítica de alto desempeño que permite explorar la concentración delictiva a través de múltiples dimensiones (tiempo, territorio, demografía y tipo de delito).

## 2. Requerimientos Funcionales (RF)

### Visualización Cartográfica
*   **RF-01:** El sistema debe renderizar un mapa interactivo de Colombia.
*   **RF-02:** El mapa debe mostrar mapas de calor (Choropleth) basados en la densidad o el recuento absoluto de delitos. 
*   **RF-03:** El usuario debe poder alternar libremente la granularidad de la capa visible entre "Nivel Departamental" y "Nivel Municipal", incluso al tener una vista nacional completa.
*   **RF-04:** El usuario debe poder interactuar con las geometrías (hover, click) para obtener información detallada en Tooltips.
*   **RF-10:** El sistema debe ofrecer 3 mapas base intercambiables (OpenStreetMap, Satelital y Oscuro) mediante un control flotante sobre el mapa. El mapa base por defecto depende del tema activo de la aplicación (OpenStreetMap en Light, Oscuro en Dark) y se reestablece a ese valor por defecto cada vez que el usuario cambia de tema — el mapa base elegido manualmente no persiste entre cambios de tema. Ver [Mapas Base](../architecture/01-arquitectura.md#mapas-base-basemaps) para las fuentes técnicas.

### Filtrado y Búsqueda
*   **RF-05:** El sistema debe proveer un panel de filtros globales que incluyan:
    *   Rango temporal (Año).
    *   Filtro geográfico (Departamento y Municipio).
    *   Categoría del delito (Ej. Homicidios, Hurtos, Delitos Sexuales).
    *   Variables demográficas (Ej. Género).
*   **RF-06:** Los filtros deben aplicarse de manera cruzada y dinámica, actualizando instantáneamente tanto el mapa como los gráficos.

### Análisis y Gráficas
*   **RF-07:** El sistema debe mostrar métricas clave de alto nivel (KPIs) como total de delitos, variaciones porcentuales, el delito más común del contexto filtrado y distribución de víctimas por género.
*   **RF-08:** El sistema debe incluir gráficos estadísticos acordes a la selección actual. Específicamente, al seleccionar un departamento o municipio, debe desplegarse un gráfico de barras ilustrando la evolución anual de los delitos en dicha región.
*   **RF-09:** El usuario debe poder comparar visualmente datos de diferentes periodos o diferentes regiones de manera paralela.

## 3. Requerimientos No Funcionales (RNF)

### Desempeño (Performance)
*   **RNF-01:** El tiempo de carga inicial de la aplicación (TTV - Time to View) debe ser inferior a 2 segundos.
*   **RNF-02:** El renderizado de la capa cartográfica debe operar a un mínimo de 60 FPS (Frames Per Second) al realizar zoom o paneo continuo, aprovechando la GPU del cliente (WebGL).
*   **RNF-03:** Las respuestas de los endpoints analíticos de la API no deben exceder los 300 ms en promedio bajo condiciones normales.

### Experiencia de Usuario e Interfaz (UX/UI)
*   **RNF-04:** La aplicación debe exhibir un diseño vanguardista y "premium", con efectos de desenfoque (Glassmorphism) y animaciones fluidas (Microinteracciones). Debe soportar tema claro (Light Mode, por defecto) y tema oscuro (Dark Mode), ambos conmutables por el usuario, según los tokens definidos en [`docs/design/00-design-system.md`](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/design/00-design-system.md). *(Revisado 2026-08-07, pedido explícito del usuario: el default cambió de Dark a Light.)*
*   **RNF-05:** El diseño debe ser responsivo, adaptándose fluidamente desde resoluciones de escritorio hasta dispositivos móviles.

### Arquitectura e Infraestructura
*   **RNF-06:** El backend debe estar diseñado con un enfoque de muy bajo consumo de memoria (Rust) para garantizar viabilidad en hosts de bajo costo y capa gratuita (Free Tier), ya sean siempre-activos (ej. Fly.io, Render, Shuttle.rs) o serverless. En el caso de un `PgPool` persistente (modelo siempre-activo), su tamaño máximo debe respetar el límite de conexiones concurrentes del proveedor de PostgreSQL gratuito elegido.
*   **RNF-07:** El almacenamiento y cruce geoespacial debe delegarse íntegramente a una base de datos capacitada (PostGIS) en lugar de depender de motores GIS pesados y costosos.
*   **RNF-08:** La geometría cartográfica (estática) debe servirse desacoplada de las estadísticas delictivas (dinámicas) para permitir cacheo agresivo por HTTP/CDN y minimizar el payload transferido en cada interacción de filtrado (ver [ADR 0002](../adr/0002-separacion-geometria-estadisticas.md)).
*   **RNF-09:** Los tres mapas base (RF-10) usan servicios gratuitos de terceros (OpenStreetMap, Esri, CARTO) sujetos a políticas de uso propias — el mapa debe mostrar la atribución legal de cada proveedor mientras esté activo, y el tráfico esperado del portafolio debe mantenerse dentro del uso "bajo volumen" que esas políticas permiten sin arreglo comercial previo (ver [Mapas Base](../architecture/01-arquitectura.md#mapas-base-basemaps)).

## 4. Restricciones Técnicas
*   El backend debe construirse exclusivamente en **Rust** (con frameworks como Axum o Actix-web).
*   El frontend utilizará **React** (preferiblemente empaquetado con Vite) y **MapLibre GL JS** para el mapeo.
*   La base de datos será estrictamente **PostgreSQL + PostGIS**.
