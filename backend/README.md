# Backend — Estadística Delictiva Colombia

API en Rust (Axum + SQLx) sobre PostgreSQL + PostGIS. **Completo** — los 7 endpoints del contrato de API funcionan de punta a punta contra datos reales (4.8M registros delictivos, 1.123 municipios con proyecciones de población DANE), dentro de RNF-03 (<300ms). Ver [`docs/plans/02-plan-desarrollo-backend.md`](../docs/plans/02-plan-desarrollo-backend.md) y [`docs/plans/04-plan-desarrollo-funcionalidades-v2.md`](../docs/plans/04-plan-desarrollo-funcionalidades-v2.md) para el roadmap completo, y [`BACKLOG.md`](../BACKLOG.md) para el detalle granular.

```
src/
  main.rs                 # composition root: config, PgPool, precalentado de caché, servidor
  domain/                  # entidades y reglas de negocio puras
    filters.rs              # GlobalFilters, rango histórico del dataset (ANIO_MIN/MAX)
    kpis.rs, evolution.rs, map_stats.rs, breakdown.rs, vocabulario.rs   # DTOs de respuesta
    granularidad.rs, metrica.rs   # DEPARTAMENTO/MUNICIPIO, ABSOLUTA/TASA
    delito_categoria.rs      # mapeo estático de los 47 delitos homologados a 8 categorías padre (RN-04/14)
  application/              # casos de uso (get_kpis, get_evolution, get_map_stats, get_breakdown, get_filtros, get_geometry) + traits de repositorio (ports)
  infrastructure/           # config.rs, db.rs, postgres_{filtros,stats,geometry}_repository.rs
  interfaces/http/          # routes.rs, handlers.rs, error.rs, extractors.rs, cors.rs
```

Regla de dependencia: `domain` no depende de nada; `application` solo de `domain` y sus propios traits; `infrastructure` implementa esos traits; `interfaces/http` solo conoce `application`.

## Endpoints

| Ruta | Método | Propósito |
|---|---|---|
| `/api/health` | `GET` | Liveness check |
| `/api/v1/metadata/filtros` | `GET` | Vocabulario homologado (delitos, armas/medio, género, grupo de edad) |
| `/api/v1/stats/kpi` | `POST` | Total de delitos, variación % vs. periodo anterior, delito más común, mes de mayor impacto, distribución por género |
| `/api/v1/stats/evolution` | `POST` | Serie temporal (mensual/anual), nacional o por región |
| `/api/v1/stats/breakdown` | `POST` | Desglose de delitos por tipo y por categoría padre, nacional o por región |
| `/api/v1/map/geometry/{granularidad}` | `GET` | Geometría cacheable (GeoJSON), sin estadísticas — ver [ADR 0002](../docs/adr/0002-separacion-geometria-estadisticas.md) |
| `/api/v1/map/stats` | `POST` | `{codigo_dane: valor}` por región — cantidad absoluta o tasa per cápita según `metrica` |

Contrato completo (shapes de request/response) en [`docs/architecture/02-api-contracts.md`](../docs/architecture/02-api-contracts.md).

## Metodología: TDD

Todo el código de negocio se escribe test-first (red → green → refactor). Los handlers HTTP se testean con `tower::ServiceExt::oneshot` (sin socket real); la lógica de negocio pura (ej. `calcular_variacion_porcentual`, `periodo_anterior`, la agregación por categoría en `get_breakdown`) con `#[test]` estándar; el SQL dinámico se verifica inspeccionando `.sql()` del `QueryBuilder` sin tocar la base de datos.

**107 tests**, varios de integración contra Postgres real donde el valor de la prueba depende de datos reales — ej. que la suma del desglose por delito coincida exactamente con el KPI de total, o que los 47 delitos homologados de la base mapeen todos a una categoría conocida (no solo que el código compile).

## Datos: tablas y migraciones

*   `estadistica_delictiva` — 4.8M registros delictivos crudos, `estadistica_rollup` (vista materializada) pre-agregada por todas las dimensiones filtrables para sostener RNF-03 sin filtro.
*   `municipios_geo` — geometría de los 1.122 municipios (PostGIS), simplificada con `ST_SimplifyPreserveTopology` antes de servirse.
*   `poblacion_municipal` — proyecciones DANE 2018-2042 (28.075 filas), usada para la tasa per cápita (RN-11/12/13).
*   `scripts/migrations/`: `0001` (corrección de Código DANE + homologación), `0002` (vista de rollup), `0003` (índices y validación de `poblacion_municipal`) — cada una documenta en el propio SQL la causa raíz del problema que resuelve, no solo el fix.

## Performance (Hito 5.2)

El profiling encontró que las agregaciones sin filtro sobre la tabla cruda (4.8M filas) violaban RNF-03. Se resolvió con una vista materializada de rollup (`estadistica_rollup`) y caché en memoria (`tokio::sync::OnceCell`) para los datos esencialmente estáticos (`metadata/filtros`, `map/geometry`), precalentada al arrancar el servidor. Detalle completo en [`docs/architecture/01-arquitectura.md`](../docs/architecture/01-arquitectura.md) y `BACKLOG.md`.

## Correr localmente

```bash
cp ../.env.example ../.env   # si no existe ya — completar credenciales reales
cargo test                    # 107 tests, deben pasar en verde (requiere Postgres corriendo)
cargo run                     # sirve en http://localhost:3000 (precalienta caché de geometría al arrancar, ~10-15s)
```

Guía completa (base de datos desde cero, stack completo) en [`docs/desarrollo-local.md`](../docs/desarrollo-local.md).
