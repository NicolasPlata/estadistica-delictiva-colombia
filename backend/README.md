# Backend — Estadística Delictiva Colombia

API en Rust (Axum + SQLx) sobre PostgreSQL + PostGIS. Pendiente de inicializar (`cargo new`) — ver [Hito 1.1](../docs/plans/02-plan-desarrollo-backend.md#fase-1-fundaciones-y-configuración-inicial) para el detalle completo, incluyendo el layout de módulos de Clean Architecture que debe seguir este crate:

```
src/
  main.rs             # composition root
  domain/              # entidades y reglas de negocio puras
  application/          # casos de uso + traits de repositorio (ports)
  infrastructure/       # adaptadores SQLx, PgPool, config
  interfaces/http/      # rutas y handlers de Axum, DTOs
```

Regla de dependencia: `domain` no depende de nada; `application` solo de `domain` y sus propios traits; `infrastructure` implementa esos traits; `interfaces/http` solo conoce `application`.

Contrato de API que este servicio debe implementar: [`docs/architecture/02-api-contracts.md`](../docs/architecture/02-api-contracts.md).
