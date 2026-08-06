# Plan de Desarrollo: Backend (Rust)

Este documento detalla la hoja de ruta estratégica para el desarrollo del Backend de la plataforma de Estadística Delictiva, construido en Rust. Se estructura en Fases (agrupaciones lógicas) e Hitos (entregables funcionales).

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
    *   Si el `EXPLAIN ANALYZE` del Hito 5.2 revela que las agregaciones sobre la tabla cruda (~4.5M filas) no cumplen el RNF-03, evaluar una vista materializada de rollup (`anio, mes, codigo_dane, delitos, genero`) refrescada periódicamente, en vez de escanear siempre `estadistica_delictiva`.
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
