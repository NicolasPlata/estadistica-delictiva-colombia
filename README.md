# Estadística Delictiva Colombia

Dashboard geoespacial de alto rendimiento para explorar más de 4.8 millones de registros de delitos en Colombia (2020–2025), cruzados con la topología oficial de sus 1,122 municipios. Proyecto de portafolio enfocado en arquitectura limpia, performance (TTV < 2s, 60 FPS, API < 300ms) y viabilidad en infraestructura *free-tier*.

## Stack

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL + PostGIS |
| Backend | Rust (Axum + SQLx) |
| Frontend | React (Vite) + MapLibre GL JS + Zustand |
| Diseño | Sistema de diseño propio (Light/Dark) — [Figma](https://www.figma.com/design/NJXIriyDT674hHetseeX0B/estadistica_delicitva) |

## Por qué este stack (decisiones documentadas)

Este proyecto no solo implementa un dashboard — documenta el razonamiento detrás de cada decisión arquitectónica relevante:

*   **[ADR 0001](docs/adr/0001-postgis-vs-geoserver.md):** PostGIS + Rust en vez de un servidor GIS pesado (GeoServer), para minimizar costo de infraestructura.
*   **[ADR 0002](docs/adr/0002-separacion-geometria-estadisticas.md):** la geometría cartográfica (estática) se sirve desacoplada de las estadísticas delictivas (dinámicas) en endpoints separados, para maximizar cacheo HTTP/CDN y mantener las interacciones de filtrado livianas.
*   **[Migración correctiva de datos](scripts/migrations/0001_fix_codigo_dane_y_homologacion.sql):** una auditoría manual encontró que el cruce por Código DANE entre la tabla de hechos y la geometría municipal producía 0% de coincidencias — el proceso, causa raíz y corrección (99.9994% de coincidencia final) están documentados en el script y en `docs/plans/01-plan-estandarizacion-migracion.md`.
*   **[Sistema de diseño](docs/design/00-design-system.md):** tokens Light/Dark reconciliados (roles semánticos, rampa de choropleth validada con verificación programática de accesibilidad para daltonismo), no solo una paleta de colores.

## Estructura del repositorio

```
.
├── antigravity.md      # Memoria de agente / centro de comando del proyecto — leer primero
├── docs/               # Arquitectura, ADRs, requerimientos, historias de usuario, planes, diseño
├── scripts/            # ETL: estandarización y migración de los datos crudos a PostgreSQL
├── backend/            # API en Rust (Axum + SQLx) — Clean Architecture (ver docs/plans/02-...)
└── frontend/           # Cliente en React + MapLibre GL JS — estructura por features
```

`Data/` (los Excel crudos, ~300MB) no se versiona — ver `docs/plans/01-plan-estandarizacion-migracion.md` para el origen de los datos (Policía Nacional de Colombia, datos abiertos) y cómo regenerarlos.

## Desarrollo local

Guía completa (prerrequisitos, base de datos, backend, frontend) en [`docs/desarrollo-local.md`](docs/desarrollo-local.md). Con todo ya configurado, el día a día es:

```bash
cd backend && cargo run      # http://localhost:3000
cd frontend && npm run dev   # http://localhost:5173
```

## Documentación

Todo el conocimiento del producto vive en `docs/` y se indexa desde [`antigravity.md`](antigravity.md), el punto de entrada obligatorio del proyecto (para humanos y para cualquier agente de IA que lo retome):

*   **Arquitectura:** [Visión](docs/architecture/00-proyecto.md) · [Sistema](docs/architecture/01-arquitectura.md) · [Contratos de API](docs/architecture/02-api-contracts.md)
*   **Producto:** [Requerimientos](docs/requirements/requerimientos.md) · [Reglas de negocio](docs/requirements/reglas-negocio.md) · [Historias de usuario](docs/requirements/historias-usuario.md)
*   **Diseño:** [Sistema de diseño](docs/design/00-design-system.md)
*   **Roadmap:** [Plan Backend](docs/plans/02-plan-desarrollo-backend.md) · [Plan Frontend](docs/plans/03-plan-desarrollo-frontend.md)

## Estado

Backend y frontend completos de punta a punta (ver el tracker en [`antigravity.md`](antigravity.md) y el detalle granular en [`BACKLOG.md`](BACKLOG.md)). Queda pendiente el despliegue final.

## Licencia

[MIT](LICENSE)
