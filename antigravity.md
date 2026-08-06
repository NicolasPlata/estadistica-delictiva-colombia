# 🌌 Proyecto Antigravity: Dashboard de Estadística Delictiva

> **Memoria del Agente y Centro de Comando del Proyecto**
> Este documento centraliza el contexto, el estado de desarrollo y el índice arquitectónico del proyecto. Cualquier desarrollador o agente de Inteligencia Artificial que retome este repositorio **debe leer este archivo primero** para orientarse.

---

## 🎯 1. Visión y Misión del Proyecto
Construir un **Dashboard Interactivo y Geoespacial** de talla mundial para analizar estadísticas delictivas en Colombia (2020-2025). Diseñado específicamente para un portafolio profesional de alto impacto, el sistema debe ser capaz de filtrar millones de registros crudos cruzándolos con topologías departamentales y municipales en milisegundos, manteniendo un consumo de recursos mínimo (Free-Tier viable) y ofreciendo una experiencia UI/UX premium.

---

## 🛠️ 2. Arquitectura de Software y Stack
El sistema sigue un modelo desacoplado (API-First) utilizando las siguientes tecnologías:

*   **🗄️ Base de Datos (Data Layer):** `PostgreSQL` + `PostGIS`.
    *   *Misión:* Almacenar >4M de registros estadísticos estandarizados y realizar agrupaciones geoespaciales veloces sobre los shapefiles oficiales.
*   **⚙️ Backend (Logic Layer):** `Rust` (Axum/Actix-Web) + `SQLx`.
    *   *Misión:* Procesamiento asíncrono ultra-rápido, gestión segura de memoria y exposición de endpoints RESTful eficientes (incluyendo renderizado MVT/GeoJSON al vuelo).
*   **💻 Frontend (Presentation Layer):** `React` (Vite) + `MapLibre GL JS` + `TailwindCSS/Zustand`.
    *   *Misión:* Experiencia de usuario inmersiva (Dark Mode, Glassmorphism). Renderizado vectorial por GPU (WebGL) capaz de mover 60FPS sin sobrecargar el navegador.

---

## 📚 3. Directorio Maestro de Documentación (Lectura Obligatoria)
Toda la lógica profunda del proyecto ha sido extraída a la carpeta `docs/`. **Es mandatorio** revisar los documentos relevantes antes de añadir nuevo código:

### 🏛️ Arquitectura y Fundamentos
1. **[Visión del Proyecto](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/architecture/00-proyecto.md):** Presentación ejecutiva del desafío técnico y la solución.
2. **[Arquitectura del Sistema](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/architecture/01-arquitectura.md):** Fundamentos del Stack.
3. **[Contratos de API (Crucial)](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/architecture/02-api-contracts.md):** JSON Schemas obligatorios para la comunicación entre Frontend y Backend.
4. **[ADR 0001 (PostGIS vs GeoServer)](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/adr/0001-postgis-vs-geoserver.md):** Registro de decisión arquitectónica.
5. **[ADR 0002 (Separación Geometría/Estadísticas)](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/adr/0002-separacion-geometria-estadisticas.md):** Desacople de geometría estática (cacheable) y estadísticas dinámicas para cumplir los RNF de performance.

### 📋 Requerimientos y Reglas de Negocio
6. **[Requerimientos (RF y RNF)](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/requirements/requerimientos.md):** KPIs obligatorios, límites de TTV (<2s) y alcance.
7. **[Reglas de Negocio (Crucial)](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/requirements/reglas-negocio.md):** Cómo calcular agregaciones, tratar fechas nulas y el uso estricto del *Código DANE* como única Foreign Key.
8. **[Historias de Usuario](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/requirements/historias-usuario.md):** Épicas de UI/UX, filtros cruzados y mapas interactivos.

### 🎨 Diseño (Design System)
9. **[Sistema de Diseño (Índice)](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/design/00-design-system.md):** Cómo se relacionan los temas oscuro/claro y estrategia de theming vía CSS variables.
10. **[DESIGN-dark.md](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/design/DESIGN-dark.md):** Tokens y guía del tema oscuro (por defecto).
11. **[DESIGN-light.md](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/design/DESIGN-light.md):** Tokens y guía del tema claro.

### 🗺️ Roadmaps (Hoja de Ruta)
12. **[Plan de Desarrollo: Backend](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/plans/02-plan-desarrollo-backend.md)**
13. **[Plan de Desarrollo: Frontend](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/plans/03-plan-desarrollo-frontend.md)**

*(Nota: Los scripts usados para la limpieza inicial de los Excel y migración están en la carpeta `scripts/`)*.

---

## 🚀 4. Estado Actual y Hoja de Ruta (Tracker)

**Contexto Inmediato:** Toda la información estadística y geográfica ya ha sido limpiada, estandarizada y migrada a PostgreSQL (`estadistica_delictiva` y `municipios_geo`). El diseño documental está completado. Estamos listos para comenzar la escritura de código en el Backend.

- [x] **Fase 1: ETL y Estandarización de Datos** (Finalizada)
- [x] **Fase 2: Base de Datos, PostGIS y Arquitectura Documental** (Finalizada)
- [ ] **Fase 3: Desarrollo del Backend en Rust** 📍 *(<- ESTAMOS AQUÍ)*
  - [ ] **Hito 3.1:** Inicializar proyecto con `cargo new` y dependencias (`sqlx`, `axum`, `tokio`).
  - [ ] **Hito 3.2:** Conexión a PostgreSQL (PgPool) y Health Check.
  - [ ] **Hito 3.3:** Modelos de Datos (Structs) y endpoint `/api/v1/metadata/delitos`.
  - [ ] **Hito 3.4:** Endpoints de KPIs Analíticos y de Evolución (Barras).
  - [ ] **Hito 3.5:** Endpoint Geoespacial con PostGIS (MVT / GeoJSON).
- [ ] **Fase 4: Desarrollo del Frontend en React** (Pendiente)
- [ ] **Fase 5: Despliegue e Integración Final** (Pendiente)
