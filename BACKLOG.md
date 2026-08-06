# Backlog

Backlog operativo del proyecto, mantenido por el agente y actualizado a medida que se ejecuta trabajo real (no es un plan aspiracional — para la hoja de ruta de alto nivel por Fases/Hitos, ver `docs/plans/`; para el estado narrativo del proyecto, ver `antigravity.md`).

Convención: cada entrada de "Hecho" lleva fecha y, cuando aplica, el doc/commit/nodo Figma afectado, para que quede auditable. Este archivo se commitea a git — es parte del historial visible del proyecto, no una nota privada.

---

## 🔴 Decisiones pendientes del usuario
- [ ] **RF-09 (comparación paralela de periodos/regiones):** el requerimiento pide poder comparar visualmente datos de diferentes periodos o regiones lado a lado. No está reflejado en los mockups de Figma ni en ningún Hito de `docs/plans/`. Pendiente decidir: ¿entra al alcance del MVP actual o se difiere a una fase futura? Bloquea diseñar la UI de comparación si se decide que sí entra.

## 🟡 En progreso
_(vacío — arrancando Fase 1 del backend)_

## 🔵 Próximo (en orden)
- [ ] Backend — Fase 1 (`docs/plans/02-plan-desarrollo-backend.md`): `cargo new`, dependencias, esqueleto de Clean Architecture (`domain/application/infrastructure/interfaces`), `PgPool`, health check.
- [ ] Backend — Fase 2: Struct `GlobalFilters` (ya incluye `grupo_edad`/`arma_medio`), endpoint `/api/v1/metadata/filtros` consolidado.
- [ ] Backend — Fase 3: `/api/v1/stats/kpi` (incluye `mes_mayor_impacto`) y `/api/v1/stats/evolution`.

## ✅ Hecho

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
