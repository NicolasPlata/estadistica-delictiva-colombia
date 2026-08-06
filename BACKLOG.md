# Backlog

Backlog operativo del proyecto, mantenido por el agente y actualizado a medida que se ejecuta trabajo real (no es un plan aspiracional — para la hoja de ruta de alto nivel por Fases/Hitos, ver `docs/plans/`; para el estado narrativo del proyecto, ver `antigravity.md`).

Convención: cada entrada de "Hecho" lleva fecha y, cuando aplica, el doc/commit/nodo Figma afectado, para que quede auditable. Este archivo se commitea a git — es parte del historial visible del proyecto, no una nota privada.

---

## 🔴 Decisiones pendientes del usuario
- [ ] **RF-09 (comparación paralela de periodos/regiones):** el requerimiento pide poder comparar visualmente datos de diferentes periodos o regiones lado a lado. No está reflejado en los mockups de Figma ni en ningún Hito de `docs/plans/`. Pendiente decidir: ¿entra al alcance del MVP actual o se difiere a una fase futura? Bloquea diseñar la UI de comparación si se decide que sí entra.

## 🟡 En progreso
_(vacío — arrancando Fase 1 del backend)_

## 🔵 Próximo (en orden)
- [ ] **Backend completo → arrancar Frontend** (`docs/plans/03-plan-desarrollo-frontend.md`, Fase 1: Vite + estructura por features).

## ✅ Hecho

**2026-08-06 — Backend Fase 5, Hito 5.2: Profiling y Optimización (RNF-03) — Backend completo**
- Medido con el servidor real (release build), no solo `EXPLAIN ANALYZE` aislado: `/api/v1/stats/kpi` sin filtros tardaba **1.2s** (4x el presupuesto de RNF-03), `/metadata/filtros` **0.94s**, `/map/geometry/MUNICIPIO` **6.3s** (peor aún para `DEPARTAMENTO`: 9.1s).
- **Causa raíz confirmada con `EXPLAIN ANALYZE`:** una sola query de KPI sin filtro tardaba 394ms en un full scan de las 4.8M filas — un índice B-Tree no ayuda a una agregación `WHERE 1=1` porque hay que tocar cada fila de todos modos. Exactamente el escenario que `docs/plans/02-...` ya anticipaba en el Hito 3.1.
- **Fix 1 — vista materializada `estadistica_rollup`** (`scripts/migrations/0002_vista_materializada_rollup.sql`): agregada por las 7 dimensiones filtrables, reduce 4,836,275 → 899,265 filas (~5.4x). Verificación defensiva en la propia migración: el `SUM(cantidad)` del rollup debe igualar exactamente al de la tabla original (lo hace). `PgStatsRepository` y `PgFiltrosRepository` migrados a consultarla. Bug encontrado en el camino: `SUM(bigint)` en Postgres devuelve `NUMERIC`, no `bigint` — como el rollup ya pre-sumaba `cantidad` a bigint, sumarlo de nuevo rompía la decodificación de `sqlx`; se corrigió con un cast explícito `::bigint`.
- **Fix 2 — caché en memoria** (`tokio::sync::OnceCell`, no estaba en el plan original) para `metadata/filtros` y `map/geometry/{granularidad}`, datos esencialmente estáticos entre corridas del ETL. Verificado con tests que miden tiempo (cache hit <50-100ms vs. cientos de ms/segundos en frío).
- **Fix 3 — precalentamiento al arrancar:** `main.rs` llama `get_geometry` para ambas granularidades antes de aceptar conexiones, para que el costo de 5-9s (ST_Union + ST_SimplifyPreserveTopology) lo pague el despliegue, nunca un usuario real. Verificado: primera petición real tras el arranque, 48ms.
- **Números finales:** `/stats/kpi` 1.2s→0.2s (sin filtro) / 0.95s→0.08s (con filtro); `/stats/evolution` 0.31s→0.05s; `/map/stats` ~0.30s→0.05s; `/metadata/filtros` 0.94s→0.0004s; `/map/geometry` 6-9s→0.03-0.05s. Todos dentro de RNF-03.
- 78/78 tests en verde (10 nuevos: cache-hit timing ×2, integración de la vista materializada vía los tests ya existentes que ahora corren contra ella).
- **Backend 100% completo** (Fases 1-5): los 6 endpoints funcionan de punta a punta, con TDD, Clean Architecture, seguridad (CORS, errores estandarizados, SQL parametrizado) y performance verificada contra RNF-03.

**2026-08-06 — Backend Fase 5, Hito 5.1: Middleware y Seguridad (TDD)**
- **Bug real encontrado y corregido:** los 5 handlers existentes devolvían `(StatusCode, String)` en caso de error, que Axum renderiza como **texto plano** — violaba lo que `02-api-contracts.md` promete desde su primera línea ("cuerpo JSON descriptivo"). Ningún test lo había detectado porque los tests de integración anteriores solo ejercitaban el camino feliz.
- `interfaces/http/error::AppError` (`BadRequest`/`Internal`) unifica el shape de error a `{"error": "..."}` en los 6 endpoints, con `From<RepositoryError>` para que los handlers usen `?` en vez de `.map_err(...)` repetido.
- `interfaces/http/extractors::{AppJson, AppPath}`: envuelven los extractores nativos de Axum para que un body JSON malformado o un parámetro de ruta inválido (ej. `/map/geometry/INVALIDO`) también respondan 400 con el mismo shape — antes cada uno fallaba con el texto plano por defecto de Axum, distinto entre sí.
- CORS restringido a un único origen configurable (`CORS_ALLOWED_ORIGIN`, default `http://localhost:5173`) vía `tower-http`. Deliberadamente **no** se usó `Any`: con un solo origen dinámico (`AllowOrigin::list`, no un valor "exact") el header solo se refleja cuando el `Origin` de la petición calza — verificado con un test que confirma que un origen no autorizado no recibe la cabecera.
- Verificado a mano con el servidor real: origen permitido/no autorizado, JSON malformado, y granularidad de ruta inválida — los 3 casos de error devuelven JSON limpio con el status correcto.
- 75/75 tests en verde (15 nuevos).

**2026-08-06 — Backend Fase 4: Motor Geoespacial (`GET /api/v1/map/geometry/{granularidad}`, `POST /api/v1/map/stats`) — TDD, Backend funcionalmente completo**
- `domain::granularidad::Granularidad` (DEPARTAMENTO/MUNICIPIO) y `domain::map_stats::MapStats`.
- **Hallazgo real durante el TDD, no anticipado en el plan:** la primera implementación de `GET /api/v1/map/geometry/MUNICIPIO` fallaba contra la base de datos real con `total size of jsonb array elements exceeds the maximum of 268435455 bytes` — los 1,122 polígonos municipales a resolución de levantamiento original superan el límite de 256MB por valor `jsonb` de Postgres al armarse en un solo `jsonb_agg`. Corregido aplicando `ST_SimplifyPreserveTopology(geom, 0.001)` antes de `ST_AsGeoJSON` — exactamente lo que RN-09 ya exigía ("geometría simplificada y cuantizada") pero que no se había implementado hasta chocar con el límite real. Payload final: ~6.2MB para el país completo (antes: >256MB, ni siquiera llegaba a responder).
- `PgGeometryRepository`: arma el `FeatureCollection` completo en SQL (`jsonb_build_object`/`jsonb_agg`/`ST_Union` para dissolver municipios en departamentos) — Rust solo pasa el JSON ya ensamblado, sin reserializar (decisión explícita del Hito 4.1). Nuevo trait `GeometryRepository`, separado de `StatsRepository` porque no depende de `GlobalFilters` (ADR 0002).
- `StatsRepository::map_stats`: reutiliza el `apply_filters` del Hito 3.1; agrupa por `dpto_codigo` o `codigo_dane` según `granularidad` (Hito 4.2). Test de integración usa que Bogotá, D.C. es su propio departamento Y su único municipio para verificar una invariante exacta entre ambas granularidades.
- Endpoint de geometría con cabeceras `Cache-Control: public, max-age=86400` y `ETag` (hash del contenido, no fijo) — RNF-08.
- **Verificado a mano el punto más delicado de todo ADR 0002:** los códigos de departamento que devuelve `map/geometry` (`5`, `8`, `11`...) coinciden en formato exacto con las claves de `map/stats` (`"5"`, `"8"`, `"11"`...) — el join por `codigo_dane` en el cliente funcionará sin repetir el bug de formato que se corrigió a nivel de base de datos al principio del proyecto.
- 63/63 tests en verde (14 nuevos). **Backend funcionalmente completo** — quedan solo refinamientos de Fase 5 (CORS, errores estandarizados, profiling) antes de pasar al frontend.

**2026-08-06 — Backend Fase 3, Hito 3.2: Endpoint de Evolución (`POST /api/v1/stats/evolution`) — TDD, Fase 3 completa**
- `domain::evolution`: `Agrupacion` (ANUAL/MENSUAL, deserializado desde mayúsculas), `EvolutionPoint`, `Evolution`.
- `application::get_evolution` añade una segunda pieza de lógica de negocio real (además de la de KPIs): resolución de `region_label` con precedencia explícita **municipio > departamento > "Nacional"**, con placeholder ("Región desconocida") si el código no resuelve a ningún nombre — 5 tests unitarios con repositorio falso cubren las 4 combinaciones más el caso de código inexistente.
- `StatsRepository` extendido con `municipio_nombre`/`departamento_nombre` (consultan `municipios_geo`, la tabla de referencia geográfica — no la tabla de hechos) y `evolution_series` (reutiliza el mismo `apply_filters` del Hito 3.1; el `SELECT`/`GROUP BY` cambia según `agrupacion` vía un `match`).
- 6 tests de integración nuevos contra Postgres real, incluyendo uno que verifica que la suma de la serie MENSUAL de un año coincide exactamente con el total de la serie ANUAL del mismo año (invariante de consistencia entre dos agregaciones distintas).
- Verificado a mano: evolución 2020-2025 de Bogotá y evolución mensual nacional de 2023, ambas con números creíbles.
- **Fase 3 (Motor Analítico) completa.** 49/49 tests en verde.

**2026-08-06 — Backend Fase 3, Hito 3.1: Endpoint de KPIs (`POST /api/v1/stats/kpi`) — TDD**
- Primera lógica de negocio real del backend (hasta ahora todo había sido passthrough): `application::get_kpis` calcula `variacion_porcentual` comparando el total del periodo filtrado contra el "periodo anterior" (mismo largo, desplazado hacia atrás). Ambas funciones puras (`calcular_variacion_porcentual`, `periodo_anterior`) tienen 8 tests unitarios cubriendo incremento/decremento/sin cambio/línea base en cero — casos donde no hay una respuesta matemáticamente "correcta" (división por cero) se documentan como convención explícita, no un accidente.
- `application::ports::StatsRepository` expone primitivas (`total_delitos`, `delito_mas_comun`, `mes_mayor_impacto`, `distribucion_genero`) en vez de un único método — así el caso de uso combina 2 llamadas a `total_delitos` (actual + anterior) sin que el repositorio sepa nada de "variación".
- `infrastructure::postgres_stats_repository::PgStatsRepository`: primer SQL dinámico real del proyecto vía `sqlx::QueryBuilder`. Incluye un test que verifica explícitamente que un intento de inyección SQL en un valor de filtro nunca aparece en el `.sql()` generado (siempre viaja como bind parameter) — la prueba de fuego del requisito de seguridad del plan. También confirma que el nivel departamental filtra por `dpto_codigo`, nunca `codigo_dane` (regla ya documentada en el Hito 4.2).
- 9 tests de integración contra Postgres real (sin mockear a propósito), incluyendo uno que verifica que `distribucion_genero` suma exactamente lo mismo que `total_delitos` — una invariante de consistencia entre dos queries distintas.
- Verificado a mano con el servidor real: filtrar por año da una variación creíble (+6.4% 2023 vs. 2022); sin filtro de año, el "periodo anterior" cae fuera del rango del dataset (2014-2019, sin datos) y correctamente dispara la convención de +100%.
- 35/35 tests en verde.

**2026-08-06 — Backend Fase 2: Modelado de Datos y Endpoints Base (Hito 2.1 y 2.2) — TDD**
- `domain::filters::GlobalFilters` (Hito 2.1): struct `Deserialize` con los 8 campos del contrato (incluye `grupo_edad`/`arma_medio` agregados en la revisión previa), todos opcionales. 3 tests de deserialización (completo/vacío/parcial) escritos antes de la implementación.
- `domain::vocabulario::FiltrosVocabulario` + `application::get_filtros::execute` (Hito 2.2): caso de uso *passthrough* sobre un trait `FiltrosRepository` (puerto), testeado con un repositorio falso — sin tocar la base de datos — para probar tanto el camino feliz como la propagación de errores.
- `infrastructure::postgres_filtros_repository::PgFiltrosRepository`: implementación real con 4 `SELECT DISTINCT`. Cubierta por un test de integración explícito contra Postgres real (no mockeado a propósito) que además confirma que la homologación de la migración correctiva (RN-03) sigue vigente (`NO_REPORTADO`, 3 géneros exactos, `DE 18 ANOS Y MAS`).
- `GET /api/v1/metadata/filtros` cableado end-to-end (router con estado vía `AppState`, pool "lazy" añadido en `db.rs` para que el test de `/api/health` siga sin depender de la base de datos). 13/13 tests en verde; verificado también a mano con el servidor real corriendo (`curl` a ambos endpoints con datos reales).

**2026-08-06 — Backend Fase 1: Fundaciones (Hito 1.1 y 1.2) — TDD desde el día uno**
- `cargo init` dentro de `backend/` (crate `estadistica-delictiva-api`, edition 2024). Dependencias: `axum`, `tokio` (rt-multi-thread, macros), `sqlx` 0.8 (runtime-tokio-rustls, postgres, chrono, macros — nota: 0.9.0 recién publicado renombró las features de runtime/TLS, se fijó 0.8 por estabilidad), `serde`/`serde_json`, `dotenvy`. Dev-deps para testear Axum sin socket real: `tower` (util), `http-body-util`.
- Esqueleto de Clean Architecture creado (`domain/`, `application/` vacíos por ahora — se llenan en Fase 2/3; `infrastructure/{config,db}.rs`; `interfaces/http/{routes,handlers}.rs`).
- **Adopción de metodología TDD** (pedido explícito del usuario), documentada en `docs/plans/02-...` y `03-...`. Aplicada de inmediato: `AppConfig::build` y el router de `/api/health` se escribieron test-first (rojo confirmado por compilación fallida → implementación mínima → verde, 5 tests). `AppConfig` inyecta el "lookup" de variables en vez de llamar a `std::env::var` directo, precisamente para poder testear el parseo sin tocar el entorno real.
- `.env` normalizado a formato estándar `KEY=value` (antes tenía comillas y espacios alrededor del `=`, que los scripts de Python compensaban a mano con `.strip()`) — ahora cualquier librería dotenv-compatible lo lee sin trucos. `.env.example` agregado en la raíz.
- Verificación end-to-end real (no solo tests): `cargo run` levantó el servidor, conectó a PostgreSQL de verdad, y `GET /api/health` respondió `{"status":"ok"}` con HTTP 200.

**2026-08-06 — Repositorio y arquitectura de código**
- Repo inicializado y pusheado: `git@github.com:NicolasPlata/estadistica-delictiva-colombia.git` (`main`), monorepo, `.gitignore`/`LICENSE`/`README.md` profesionales.
- Verificado antes del push: sin secretos en texto plano en los scripts de ETL; `.env`, `Data/` (300MB) y `venv/` (354MB) excluidos.
- Layout de Clean Architecture (backend) y estructura por *features* (frontend) documentados en `docs/plans/02-...` y `03-...`, con placeholders `backend/README.md` / `frontend/README.md`.

**2026-08-06 — Cierre de gaps de contrato de API (encontrados en revisión pre-Fase 3)**
- `GlobalFilters` no tenía `grupo_edad` ni `arma_medio` pese a que HU-2.03 y el mockup de Figma ya los requieren — agregados a `02-api-contracts.md`.
- KPI `mes_mayor_impacto` (HU-3.01) no existía en el contrato — agregado.
- 4 endpoints de metadatos separados consolidados en uno solo (`GET /api/v1/metadata/filtros`) — menos round-trips, mejor TTV.
- Bug de formato latente en `/api/v1/map/stats`: el ejemplo usaba código de municipio para el caso "Departamento" en vez del código de depto sin ceros a la izquierda — corregido antes de que se implementara mal en Rust.
- `docs/plans/02-...` Hito 4.2: clarificado que la agregación departamental debe usar `dpto_codigo`, no `codigo_dane` (o cada municipio contaría como región propia).
- `docs/plans/01-...`: agregada adenda documentando la migración correctiva (ver abajo) — no estaba incorporada al plan original.

**2026-08-06 — Selector de mapa base (HU-1.05, RF-10, RNF-09)**
- Decisión: 3 basemaps intercambiables — OpenStreetMap (default Light), Satelital Esri (gratuito), Oscuro vía CARTO Dark Matter (default Dark, propuesta razonada del agente ante "uno oscuro" sin especificar proveedor). Cambiar de tema resetea el basemap a su default.
- Documentado en `docs/architecture/01-arquitectura.md` (URLs de tiles + atribución legal) y como nueva HU-1.05.
- Construido en Figma: componente `Basemap Switcher` (`44:115`), insertado en las 4 pantallas desktop con atribución visible. Íconos Lucide nuevos (`map`, `satellite`) reconstruidos localmente por falta de red en el sandbox del agente — mismo resultado visual que vía Iconify, transparentado al usuario.

**2026-08-06 — Ajustes de diseño reportados por el usuario**
- Filtro de "Meses" removido del panel (año a año es lo relevante) — `RF-05`/`HU-2.01`/`GlobalFilters` y Figma actualizados; agregación mensual en gráficos (HU-3.01/3.02) deliberadamente intacta, es una feature distinta.
- Modo Light: sidebar/header dejaron de verse navy — se revirtió la decisión de "chrome oscuro en ambos temas", ahora `surface-panel` usa `surface-container-low` real en Light. Cambio de una sola variable de Figma, se propagó solo.
- Bug de proporción ícono/chip: causa raíz eran los 24 componentes maestros de ícono sin `constraints: SCALE` — corregido una vez, arregló todas las instancias del archivo.

**2026-08-06 — Sistema de diseño y mockups (Figma)**
- Reconciliación de tokens: rol de acento interactivo unificado entre temas (`*-container` = interactivo, base = sutil), rampa de choropleth cambiada de divergente (rosa↔verde, metodológicamente incorrecta para una magnitud) a secuencial de un tono, validada programáticamente con `validate_palette.js`. Paleta de estado agregada (no existía verde de éxito en ningún archivo original).
- Archivo Figma `estadistica_delicitva` construido completo: Cover, Foundations (variables Light/Dark, tipografía, spacing, 24+2 íconos Iconify/Lucide), Components & Helpers (12 componentes reales + Basemap Switcher), Flow Screens (5 pantallas), Archive.

**2026-08-06 — Migración correctiva de base de datos**
- Auditoría manual encontró 0% de coincidencias en el join `estadistica_delictiva` ↔ `municipios_geo` por `codigo_dane` (causa: `municipios_geo.codigo_dane` tenía el código municipal local al depto, no el código DANE nacional; ~16% de filas de la tabla de hechos traían el código real con sufijo extra).
- Corregido con `scripts/migrations/0001_fix_codigo_dane_y_homologacion.sql`: 99.9994% de coincidencia final, más homologación de `genero`/`grupo_edad`/`delitos` (RN-03) e índices nuevos.

**Fases previas (ver `antigravity.md` para el detalle):** ETL de los Excel crudos (2020-2025), diseño documental completo (arquitectura, ADRs, requerimientos, historias de usuario, reglas de negocio).

## ⚠️ Deuda técnica / limitaciones conocidas
- **Figma:** `Segmented Control` (Granularidad, Género) y `Nav Item` son `FRAME` sueltos, no `COMPONENT_SET` — componentizar si se necesitan más variantes o reutilización.
- **Basemaps gratuitos (OSM, Esri):** políticas de "bajo volumen" de los proveedores — no aptos para tráfico de producción real sin autohospedar tiles o migrar a un proveedor pago.
- **`Data/` no versionado:** si se pierde la carpeta local, hay que re-obtener los Excel crudos (fuente: datos abiertos de la Policía Nacional de Colombia) y re-ejecutar el ETL + la migración correctiva (no está fusionada en `migracion_db.py`/`migracion_shape.py` todavía).
- **Sin tests todavía:** ni en scripts de ETL ni (una vez exista) en el backend — evaluar cobertura mínima para el SQL builder dinámico (riesgo de inyección si se regresiona `sqlx::QueryBuilder`).
