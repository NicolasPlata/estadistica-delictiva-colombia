# Backend — Estadística Delictiva Colombia

API en Rust (Axum + SQLx) sobre PostgreSQL + PostGIS. **Fase 1 (Fundaciones) completa** — ver [`docs/plans/02-plan-desarrollo-backend.md`](../docs/plans/02-plan-desarrollo-backend.md) para el roadmap completo y [`BACKLOG.md`](../BACKLOG.md) para el estado granular.

```
src/
  main.rs             # composition root: carga config, conecta PgPool, levanta el servidor
  domain/              # entidades y reglas de negocio puras (aún vacío — llega en Fase 2)
  application/          # casos de uso + traits de repositorio (ports) (aún vacío)
  infrastructure/       # config.rs (env), db.rs (PgPool)
  interfaces/http/      # routes.rs, handlers.rs — por ahora solo GET /api/health
```

Regla de dependencia: `domain` no depende de nada; `application` solo de `domain` y sus propios traits; `infrastructure` implementa esos traits; `interfaces/http` solo conoce `application`.

## Metodología: TDD
Todo el código de negocio se escribe test-first (red → green → refactor). Los handlers HTTP se testean con `tower::ServiceExt::oneshot` (sin socket real); la lógica de configuración/parseo con `#[test]` puro inyectando el "lookup" en vez de tocar `std::env` directamente. Ver ejemplos en `src/infrastructure/config.rs` y `src/interfaces/http/routes.rs`.

## Correr localmente
```bash
cp ../.env.example ../.env   # si no existe ya — completar credenciales reales
cargo test                    # 5 tests, deben pasar en verde
cargo run                     # sirve en http://localhost:3000, GET /api/health
```

Contrato de API que este servicio debe implementar: [`docs/architecture/02-api-contracts.md`](../docs/architecture/02-api-contracts.md).
