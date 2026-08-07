# Backend — Estadística Delictiva Colombia

API en Rust (Axum + SQLx) sobre PostgreSQL + PostGIS. **Completo** — los 6 endpoints del contrato de API funcionan de punta a punta contra datos reales, dentro de RNF-03 (<300ms). Ver [`docs/plans/02-plan-desarrollo-backend.md`](../docs/plans/02-plan-desarrollo-backend.md) para el roadmap completo y [`BACKLOG.md`](../BACKLOG.md) para el detalle granular.

```
src/
  main.rs               # composition root: config, PgPool, precalentado de caché, servidor
  domain/                # entidades y reglas de negocio puras (filters, kpis, evolution, granularidad, map_stats, vocabulario)
  application/            # casos de uso + traits de repositorio (ports)
  infrastructure/         # config.rs, db.rs, postgres_{filtros,stats,geometry}_repository.rs
  interfaces/http/        # routes.rs, handlers.rs, error.rs, extractors.rs, cors.rs
```

Regla de dependencia: `domain` no depende de nada; `application` solo de `domain` y sus propios traits; `infrastructure` implementa esos traits; `interfaces/http` solo conoce `application`.

## Endpoints
`GET /api/health` · `GET /api/v1/metadata/filtros` · `POST /api/v1/stats/kpi` · `POST /api/v1/stats/evolution` · `GET /api/v1/map/geometry/{granularidad}` · `POST /api/v1/map/stats` — contrato completo en [`docs/architecture/02-api-contracts.md`](../docs/architecture/02-api-contracts.md).

## Metodología: TDD
Todo el código de negocio se escribe test-first (red → green → refactor). Los handlers HTTP se testean con `tower::ServiceExt::oneshot` (sin socket real); la lógica de negocio pura (ej. `calcular_variacion_porcentual`, `periodo_anterior`) con `#[test]` estándar; el SQL dinámico se verifica inspeccionando `.sql()` del `QueryBuilder` sin tocar la base de datos. 78 tests, varios de integración contra Postgres real donde el valor de la prueba depende de datos reales (homologación, invariantes entre queries).

## Performance (Hito 5.2)
El profiling encontró que las agregaciones sin filtro sobre la tabla cruda (4.8M filas) violaban RNF-03. Se resolvió con una vista materializada de rollup (`estadistica_rollup`, ver `scripts/migrations/0002_...`) y caché en memoria (`tokio::sync::OnceCell`) para los datos esencialmente estáticos (`metadata/filtros`, `map/geometry`), precalentada al arrancar el servidor. Detalle completo en `docs/architecture/01-arquitectura.md` y `BACKLOG.md`.

## Correr localmente
```bash
cp ../.env.example ../.env   # si no existe ya — completar credenciales reales
cargo test                    # 78 tests, deben pasar en verde (requiere Postgres corriendo)
cargo run                     # sirve en http://localhost:3000 (precalienta caché de geometría al arrancar, ~10-15s)
```

Guía completa (base de datos desde cero, stack completo) en [`docs/desarrollo-local.md`](../docs/desarrollo-local.md).
