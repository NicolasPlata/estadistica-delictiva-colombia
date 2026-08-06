# Plan de Desarrollo: Backend (Rust)

Este documento detalla la hoja de ruta estratégica para el desarrollo del Backend de la plataforma de Estadística Delictiva, construido en Rust. Se estructura en Fases (agrupaciones lógicas) e Hitos (entregables funcionales).

## Metodología: TDD (Test-Driven Development)
Todo el código de negocio de este backend se escribe con el ciclo **red-green-refactor**: primero el test que falla, luego el mínimo código para pasarlo, luego refactor si aplica. Esto incluye:
*   La capa `domain/` y `application/` (casos de uso), que por diseño de Clean Architecture no dependen de Axum ni SQLx, se testean como Rust puro con `#[test]` estándar.
*   Los handlers/rutas de `interfaces/http/` se testean con `tower::ServiceExt::oneshot` contra el `Router` de Axum, sin levantar un socket real (dev-dependencies: `tower` con feature `util`, `http-body-util`).
*   La capa `infrastructure/` (implementaciones SQLx reales) se cubre con tests de integración contra la base de datos de desarrollo cuando el caso lo amerita — no todo necesita mockearse, pero la lógica de negocio nunca debe requerir una base de datos real para testearse (por eso los traits de `application::ports`).

---

## Fase 1: Fundaciones y Configuración Inicial
**Objetivo:** Establecer el esqueleto del proyecto, la gestión de dependencias y la conexión estable y segura a la base de datos PostgreSQL + PostGIS.

*   **Hito 1.1: Inicialización del Proyecto**
    *   Crear proyecto con `cargo new`.
    *   Configurar dependencias clave en `Cargo.toml`: `axum` (o `actix-web`), `tokio` (runtime asíncrono), `sqlx` (queries seguras a BD), `serde` (serialización JSON), y `dotenvy` (variables de entorno — usar este fork mantenido, el crate `dotenv` original está sin mantenimiento desde 2021).
    *   **Estructura de módulos (Clean Architecture / Hexagonal):** un solo crate, sin necesidad de un workspace multi-crate para el tamaño de este proyecto, pero con separación estricta de capas por carpeta bajo `src/`:
        ```
        src/
          main.rs             # composition root: wiring de dependencias y arranque del servidor
          domain/              # entidades y reglas de negocio puras — sin dependencias de axum/sqlx
          application/          # casos de uso (GetKpis, GetEvolution, GetGeometry, GetStats) + traits de repositorio (ports)
          infrastructure/       # adaptadores: implementación SQLx de los traits, PgPool, carga de config/.env
          interfaces/http/      # rutas y handlers de Axum, DTOs de request/response, mapeo hacia/desde domain/
        ```
        Regla de dependencia: `domain` no importa nada de las otras capas; `application` solo depende de `domain` y de sus propios traits (nunca de `sqlx` directamente); `infrastructure` implementa esos traits; `interfaces/http` solo conoce `application`, nunca construye queries SQL directamente. Esto mantiene los handlers de Axum como una capa delgada y hace que la lógica de negocio (ej. el cálculo de `mes_mayor_impacto`, la elección de `codigo_dane` vs `dpto_codigo` como clave de agrupación) sea testeable sin una base de datos real (mockeando los traits de `application::ports`).
*   **Hito 1.2: Infraestructura de Base de Datos**
    *   Implementar el pool de conexiones asíncrono a PostgreSQL mediante `sqlx::PgPool`.
    *   Crear un módulo de configuración que inyecte las credenciales desde el archivo `.env`.
    *   Levantar un servidor HTTP básico (Health Check `/api/health`) para validar el setup.

---

## Fase 2: Modelado de Datos y Endpoints Base
**Objetivo:** Trasladar los Contratos de API (`02-api-contracts.md`) a estructuras (Structs) nativas de Rust y desarrollar endpoints estáticos.

*   **Hito 2.1: Modelos de Petición (Request)**
    *   Crear el Struct `GlobalFilters` implementando `Deserialize` para procesar los payloads del frontend (rango de años, códigos DANE, género, etc.).
*   **Hito 2.2: Endpoint de Metadatos (`/api/v1/metadata/filtros`)**
    *   Desarrollar un endpoint que ejecute 4 `SELECT DISTINCT` cacheados (delitos, arma_medio, genero, grupo_edad) y los retorne en un solo payload para alimentar los 4 selectores de vocabulario fijo del sidebar (RF-05, HU-2.02, HU-2.03).

---

## Fase 3: Motor Analítico (KPIs y Gráficos)
**Objetivo:** Implementar la lógica de negocio para las agregaciones estadísticas (COUNT, SUM, GROUP BY) con filtros dinámicos.

*   **Hito 3.1: Endpoint de KPIs (`/api/v1/stats/kpi`)**
    *   Crear la función constructora de SQL dinámico basada en `GlobalFilters`, usando `sqlx::QueryBuilder` con *bind parameters* (nunca concatenación de strings) para prevenir inyección SQL.
    *   Consultar totales, distribución por género, variaciones porcentuales, y `mes_mayor_impacto` (`GROUP BY anio, mes ORDER BY SUM(cantidad) DESC LIMIT 1` sobre el conjunto ya filtrado — HU-3.01).
    *   **Actualización post Hito 5.2:** el `EXPLAIN ANALYZE` sí reveló que las agregaciones sobre la tabla cruda no cumplían el RNF-03 (~1.2s sin filtros) — se implementó la vista materializada de rollup anticipada aquí. Ver Hito 5.2 para el detalle.
*   **Hito 3.2: Endpoint Evolutivo (`/api/v1/stats/evolution`)**
    *   Implementar agrupación temporal (ANUAL/MENSUAL) condicionada por territorio.
    *   Retornar estructuras JSON amigables para librerías de gráficos (ej. `[{ "periodo": "2020", "cantidad": 5000 }]`).

---

## Fase 4: Motor Geoespacial
**Objetivo:** Exponer la topología del país y las estadísticas delictivas asociadas, manteniéndolas desacopladas para maximizar la cacheabilidad (ver [ADR 0002](../adr/0002-separacion-geometria-estadisticas.md)).

*   **Hito 4.1: Endpoint de Geometría (`GET /api/v1/map/geometry/{granularidad}`)**
    *   Consultar únicamente `municipios_geo` (sin cruzar con `estadistica_delictiva`), agrupando geometrías a nivel Departamental o Municipal según el path param.
    *   Utilizar funciones nativas de PostGIS (`ST_AsGeoJSON` o `ST_AsMVT`) para que la base de datos retorne el formato directamente ensamblado, minimizando el procesamiento en Rust y el consumo de RAM.
    *   No acepta `GlobalFilters`. Configurar cabeceras `Cache-Control` y `ETag` para permitir cacheo agresivo en el navegador/CDN.
*   **Hito 4.2: Endpoint de Estadísticas por Región (`POST /api/v1/map/stats`)**
    *   **La clave de agrupación depende de `granularidad`, no siempre es `codigo_dane`:** `GROUP BY dpto_codigo` cuando `granularidad = DEPARTAMENTO`, `GROUP BY codigo_dane` cuando `granularidad = MUNICIPIO`. Usar la columna generada `dpto_codigo` (`codigo_dane / 1000`, ya creada en la migración correctiva) para el caso departamental — agrupar por `codigo_dane` en ese caso trataría cada municipio como su propia región.
    *   Ventaja lateral de usar `dpto_codigo`: las ~26 filas con código "sin municipio específico" (ej. `52000` para Nariño, ver `scripts/migrations/0001_fix_codigo_dane_y_homologacion.sql`) **sí** contribuyen correctamente al total departamental por esta vía, aunque no tengan polígono municipal propio (RN-02).
    *   Retornar únicamente el diccionario liviano `{codigo_dane: cantidad}` (el valor de la clave sigue el formato de `02-api-contracts.md` §3.2 — código de depto sin ceros a la izquierda o código de municipio de 5 dígitos, según `granularidad`), sin geometría — el join con los polígonos ocurre en el cliente.

---

## Fase 5: Refinamiento y Optimización
**Objetivo:** Asegurar que el sistema cumpla estrictamente los Requerimientos No Funcionales (RNF) antes del pase a producción.

*   **Hito 5.1: Middleware y Seguridad**
    *   Implementar CORS middleware para habilitar peticiones desde el frontend.
    *   Configurar manejo de errores estandarizado (respuestas HTTP 400 y 500 limpias).
*   **Hito 5.2: Profiling y Pruebas**
    *   Realizar pruebas de carga locales para validar que las peticiones respondan en < 300ms.
    *   Revisar planes de ejecución (`EXPLAIN ANALYZE`) en PostgreSQL y añadir índices B-Tree si las consultas dinámicas lo requieren.
    *   **Resultado real medido:** `EXPLAIN ANALYZE` de las queries de `/stats/kpi` mostró full scans de ~150-400ms cada una sobre las 4.8M filas de `estadistica_delictiva` — un índice B-Tree no ayuda a una agregación sin filtro (`WHERE 1=1`), ya que se necesita tocar cada fila sin importar el índice. La solución fue la vista materializada `estadistica_rollup` (`scripts/migrations/0002_vista_materializada_rollup.sql`, agrupada por todas las dimensiones filtrables: `anio, mes, codigo_dane, delitos, genero, grupo_edad, arma_medio`), que reduce de 4,836,275 a 899,265 filas. `PgStatsRepository` y `PgFiltrosRepository` consultan esta vista, no la tabla cruda.
    *   **Caché en memoria adicional** (no estaba en el plan original, pero se justificó con datos reales): `metadata/filtros` y `map/geometry/{granularidad}` son esencialmente estáticos (solo cambian si se re-ejecuta el ETL), así que se cachean en proceso con `tokio::sync::OnceCell` — el costo real de `map/geometry` (`ST_Union` + `ST_SimplifyPreserveTopology` sobre 1,122 polígonos, ~5-9s) se paga una sola vez al arrancar el servidor (precalentado en `main.rs`), nunca en una petición real de un usuario.
    *   **Números finales (release build, servidor con caché caliente):** `/stats/kpi` sin filtros 1.2s→0.2s, con filtro de año 0.95s→0.08s; `/stats/evolution` 0.31s→0.05s; `/map/stats` ~0.30s→0.05s; `/metadata/filtros` 0.94s→0.0004s (cache hit); `/map/geometry` 6-9s→0.03-0.05s (cache hit tras precalentamiento). Todos dentro de RNF-03 salvo la primera petición de geometría, que ahora ocurre en el arranque del servidor, no ante un usuario.
    *   **Recordatorio operativo:** `estadistica_rollup` no se actualiza sola — si se re-ejecuta el ETL o la migración correctiva, hay que correr `REFRESH MATERIALIZED VIEW estadistica_rollup;` después (ver el propio script de la migración 0002).
