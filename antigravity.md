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

### 📌 Seguimiento Operativo
14. **[Backlog](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/BACKLOG.md):** qué se hizo, qué sigue, decisiones pendientes y deuda técnica — se actualiza con cada hito. El tracker de la Sección 4 abajo es solo el resumen ejecutivo; el Backlog es la fuente viva.

*(Nota: Los scripts usados para la limpieza inicial de los Excel y migración están en la carpeta `scripts/`)*.

---

## 🔗 Enlaces
*   **Repositorio:** [github.com/NicolasPlata/estadistica-delictiva-colombia](https://github.com/NicolasPlata/estadistica-delictiva-colombia) (rama `main`)
*   **Mockups (Figma):** [estadistica_delicitva](https://www.figma.com/design/NJXIriyDT674hHetseeX0B/estadistica_delicitva)

---

## 🚀 4. Estado Actual y Hoja de Ruta (Tracker)

**Contexto Inmediato:** ETL, base de datos (incluida una migración correctiva de `codigo_dane` tras una auditoría — ver `scripts/migrations/`), documentación y sistema de diseño (Figma completo: Cover, Foundations, Components & Helpers, Flow Screens, Archive) están terminados y reconciliados entre sí. El repositorio está inicializado y pusheado. Arrancamos la Fase 1 del Backend.

- [x] **Fase 1: ETL y Estandarización de Datos** (Finalizada)
- [x] **Fase 2: Base de Datos, PostGIS y Arquitectura Documental** (Finalizada, incluye migración correctiva post-auditoría)
- [x] **Fase 2.5: Sistema de Diseño y Mockups** (Finalizada — tokens Light/Dark reconciliados, 5 pantallas de Flow Screens en Figma)
- [x] **Fase 2.6: Repositorio Git** (Finalizada — monorepo inicializado, Clean Architecture documentada, `.gitignore`/`README`/`LICENSE`)
- [ ] **Fase 3: Desarrollo del Backend en Rust** 📍 *(<- ESTAMOS AQUÍ)* — detalle de Hitos en [`docs/plans/02-plan-desarrollo-backend.md`](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/plans/02-plan-desarrollo-backend.md), progreso granular en [`BACKLOG.md`](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/BACKLOG.md).
- [ ] **Fase 4: Desarrollo del Frontend en React** (Pendiente) — [`docs/plans/03-plan-desarrollo-frontend.md`](file:///home/nicolas/Personal_Projects/New%20Estadistica%20Delictiva/docs/plans/03-plan-desarrollo-frontend.md)
- [ ] **Fase 5: Despliegue e Integración Final** (Pendiente)

*(Se abandona la numeración detallada de Hitos 3.1-3.5 que vivía aquí — ya no coincidía con la estructura real de `docs/plans/02-...`. Ese documento y `BACKLOG.md` son ahora la única fuente de verdad para el detalle, evitando que este tracker se desactualice de nuevo.)*
