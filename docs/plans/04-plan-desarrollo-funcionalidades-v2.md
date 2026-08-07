# Plan de Desarrollo: Funcionalidades v2 (Tasa per Cápita, Desglose por Delito, Leyenda del Mapa)

Este documento detalla la hoja de ruta para 3 funcionalidades nuevas, solicitadas por el usuario el 2026-08-07, que se suman al alcance ya completo de Fases 1-4 (`00-...`/`02-...`/`03-...`). A diferencia de esos documentos (organizados por capa: backend, frontend), este se organiza **por funcionalidad** — cada Fase es una capacidad de punta a punta (datos/backend/Figma/frontend), porque las 3 son independientes entre sí y podrían implementarse y desplegarse por separado.

**Relación con `antigravity.md`:** estas fases se numeran 6-8, después de la Fase 5 (Despliegue e Integración Final) ya trackeada allí como pendiente. No dependen de que el despliegue esté hecho para desarrollarse, pero si se implementan antes, el despliegue final las incluye de una vez — es una decisión de secuencia del usuario, no técnica.

**Metodología:** se mantiene lo ya establecido en `02-...`/`03-...` — TDD estricto para toda lógica de negocio (cálculo de tasas, agrupación por categoría de delito, construcción de queries dinámicas), sin TDD para markup/estilos puros. Cada Hito termina con verificación end-to-end contra datos reales (no solo mocks), como en las Fases 1-5 ya completadas. Documentación (`docs/`, `BACKLOG.md`) se actualiza en el mismo commit que el código que la motiva, no después.

---

## Fase 6: Tasa de Criminalidad per Cápita (Población DANE)

**Objetivo:** permitir ver el choropleth (y potencialmente los KPIs) normalizados por población — "delitos por cada 100.000 habitantes" — en vez de solo el conteo absoluto, usando las proyecciones oficiales del DANE (`Data/Población/Población.xlsx`, PPED 2018-2042).

### Hallazgos de la exploración del archivo fuente
* El workbook tiene 3 hojas: `Índice` y `PPED` son portadas/metadata sin datos tabulares; **`PobMunicipalxÁrea`** es la única hoja con datos: 84.225 filas, columnas `DP` (depto, 2 dígitos), `DPNOM`, `MPIO` (código DANE municipio, 5 dígitos — mismo formato que `estadistica_delictiva.codigo_dane`/`municipios_geo.codigo_dane` tras la migración 0001), `DPMP`, `AÑO` (2018-2042, 25 valores), `ÁREA GEOGRÁFICA` (`Cabecera Municipal` / `Centros Poblados y Rural Disperso` / `Total`), `TOTAL` (población).
* Cobertura: 33 departamentos, **1.123 municipios** — el dataset de geometría/hechos actual tiene **1.122** (`map_geometry_endpoint_departamento_has_33_features` y el test análogo de Municipio en `routes.rs`). Hay que reconciliar ese desfase de 1 antes de dar por buena la carga (ver Hito 6.2) — mismo tipo de auditoría que ya se hizo en `scripts/migrations/0001_...` para `codigo_dane`, no se asume que "seguro es un caso raro sin importancia".
* Solo se necesitan las filas con `ÁREA GEOGRÁFICA = 'Total'` (28.075 de las 84.225) — la app no pidió desglose urbano/rural, y traer las 3 filas por municipio/año sería complejidad sin uso (YAGNI). El total departamental/nacional se deriva sumando municipios por `codigo_dane / 1000`, igual que ya hace `estadistica_delictiva.dpto_codigo` — no se ingiere una hoja separada a nivel departamento porque no existe en el archivo.
* Rango de años de la app (`ANIO_MIN`/`ANIO_MAX` en `backend/src/domain/filters.rs` = 2020-2025) está completamente cubierto por el rango de población (2018-2042) — sin gaps.

### Hito 6.1: ETL de Población
* Nuevo script `scripts/migracion_poblacion.py` (mismo patrón que `migracion_db.py`/`migracion_shape.py`: pandas + sqlalchemy `to_sql`, no un ORM nuevo).
* Leer solo `PobMunicipalxÁrea`, filtrar `ÁREA GEOGRÁFICA == 'Total'`, quedarse con `MPIO → codigo_dane`, `AÑO → anio`, `TOTAL → poblacion`. Cargar a una tabla nueva `poblacion_municipal (codigo_dane INTEGER, anio INTEGER, poblacion BIGINT)`.
* Validación defensiva en el propio script (falla ruidosamente, no en silencio): cada `codigo_dane` debe tener exactamente 1 fila `Total` por año; ningún `poblacion` nulo o negativo.

### Hito 6.2: Migración correctiva y de índices (`scripts/migrations/0003_poblacion_indices_y_validacion.sql`)
* Igual que 0001/0002: `PRIMARY KEY (codigo_dane, anio)`, `CREATE INDEX` sobre `codigo_dane` y `anio` para sostener RNF-03.
* Bloque `DO $$ ... RAISE EXCEPTION` que audite el desfase de 1.123 vs 1.122 municipios encontrado arriba: `SELECT codigo_dane FROM poblacion_municipal WHERE anio = 2024 AND codigo_dane NOT IN (SELECT codigo_dane FROM municipios_geo)` (y el inverso) para identificar el/los código(s) exacto(s) que no cruzan, y decidir con esa evidencia si es un caso análogo a los ya documentados en `reglas-negocio.md`/migración 0001 (ej. un código "sin municipio específico", o una división político-administrativa reciente tipo un nuevo municipio) — no adivinar antes de tener el dato real.
* Documentar el resultado de esa auditoría en el propio archivo de migración (mismo estilo narrativo que 0001) y en `reglas-negocio.md` si aplica una excepción nueva.

### Hito 6.3: Regla de negocio — cálculo de tasa (nueva RN, a agregar en `reglas-negocio.md`)
* **Fórmula:** `tasa = (SUM(cantidad) en el rango filtrado) / (AVG(poblacion) de los años del rango filtrado) × 100.000` — "delitos por cada 100.000 habitantes", la convención estándar en criminología/DANE/Policía Nacional (evita decimales ilegibles como `0.0031`).
* **Multi-año:** cuando el filtro cubre varios años (ej. 2020-2025), el denominador es el **promedio** de población de esos años, no la suma ni un solo año — es la convención demográfica estándar para una tasa acumulada de periodo (equivalente a "eventos totales / persona-años promedio"), y mantiene coherencia con que `total_delitos` (KPI ya existente) también es un acumulado del periodo, no un promedio anual.
* **Región sin población** (no debería ocurrir tras el Hito 6.2, pero por defensividad): tratar como "sin dato" (igual que HU-1.02 ya trata regiones sin registros de delitos), nunca dividir por cero ni mostrar `Infinity`.
* Este Hito es puramente de decisión/documentación — se resuelve antes de escribir código de backend (Hito 6.4) para que el test TDD nazca sabiendo qué fórmula debe cumplir.

### Hito 6.4: Backend — exponer la tasa
* Extender el contrato de `POST /api/v1/map/stats` (`02-api-contracts.md` §3.2) con un campo nuevo en el request, `metrica: "ABSOLUTA" | "TASA"` (default `"ABSOLUTA"` para no romper el contrato actual) — la respuesta sigue siendo `{ granularidad, data: {codigo: valor} }`, solo que `valor` es cantidad o tasa según `metrica`. Se evalúa esto contra la alternativa de devolver ambos valores siempre (`{cantidad, tasa}` por región) — más simple para el cliente pero duplica payload en el caso común donde solo se usa uno; decidir en el Hito según el tamaño real medido (mismo criterio que ya usó Hito 5.2 del backend: medir antes de optimizar).
* `PgStatsRepository::map_stats` gana una rama con `JOIN poblacion_municipal ... GROUP BY codigo/dpto_codigo` y `AVG(poblacion)` sobre los años del rango filtrado — mismo patrón `QueryBuilder` + `apply_filters` ya existente, sin introducir un mecanismo de queries nuevo.
* TDD: primero el test de `where_clause_tests` (SQL generado) y luego el de integración contra Postgres real (mismo patrón que `map_stats_bogota_departamento_equals_bogota_municipio`), confirmando la fórmula del Hito 6.3 con un caso conocido (ej. tasa de Bogotá 2023 calculada a mano contra el resultado del endpoint).
* Opcional (evaluar si el usuario lo quiere, no asumir): agregar `tasa_nacional` como KPI nuevo en `/api/v1/stats/kpi` — fuera del alcance mínimo de este pedido (que fue específicamente sobre el choropleth), se deja como ítem "Próximo" en `BACKLOG.md`, no como Hito obligatorio.

### Hito 6.5: Frontend — toggle "Ver por"
* Nuevo control segmentado "Cantidad Absoluta" / "Tasa (x100k hab.)" en el sidebar o junto a la Granularidad — mismo patrón visual que el segmented control de Granularidad ya construido (`Segmented Control — Granularidad`, no inventar un componente nuevo).
* Nuevo campo en `useAppStore` (ej. `metrica: "ABSOLUTA" | "TASA"`, default `"ABSOLUTA"`) — **no** se mete en `GlobalFilters` (no es un filtro de qué datos traer, es cómo se visualiza el mismo dato — mismo criterio ya aplicado a `granularidad`, que tampoco vive en `GlobalFilters`).
* `MapCanvas.tsx`: `fetchMapStats` pasa `metrica` en el body; `computeQuantileBreaks`/`buildChoroplethExpression` no cambian (ya son genéricos sobre `values: number[]`/`Record<string, number>`, sin asumir que el número es un conteo).
* `MapTooltip` y (si aplica) los KPIs deben reflejar la unidad activa ("1.204 delitos" vs. "312,4 por 100k hab.") — ajustar el formateo, no solo el número.

### Hito 6.6: Figma
* Agregar el segmented control "Ver por" a los Flow Screens relevantes (Desktop Dark/Light como mínimo) junto al de Granularidad — clonar el patrón ya usado para Granularidad/Género, no diseñar un control nuevo desde cero.
* Actualizar el mockup de tooltip/leyenda para mostrar ambas unidades como ejemplo (aunque el usuario elija una a la vez).

### Hito 6.7: Verificación end-to-end
* Con backend + Postgres reales: confirmar que el choropleth en modo "Tasa" resalta regiones distintas a "Cantidad Absoluta" en al menos un caso real (ej. un municipio pequeño con pocos delitos absolutos pero tasa alta) — es la prueba de que la funcionalidad aporta la lectura distinta que motivó el pedido, no solo que el número cambia.
* 70+/70+ tests en verde, `tsc --noEmit`/`cargo test` limpios, capturas Playwright de ambos modos en ambos temas (mismo estándar ya aplicado en los últimos hitos de este proyecto).

---

## Fase 7: Desglose de Delitos por Región (Tabla + Gráfica de Pastel)

**Objetivo:** al hacer clic en un departamento o municipio, mostrar el total de delitos cometidos **por tipo**, en una tabla y en una gráfica de pastel, filtrable por año con "todos los años" como default.

### Hallazgos de la exploración del código existente
* El clic en el mapa ya existe (`MapCanvas.handleClick` → `setSelectedRegion`) y ya alimenta un panel (`EvolutionPanel`, HU-3.03) — esta funcionalidad es **un panel nuevo y adicional**, no una modificación de ese panel, que ya está ocupado con la evolución temporal y no tiene espacio para una tabla + gráfica sin quedar apretado.
* Layout actual del mapa (`App.tsx`): `KpisPanel` ocupa la franja superior, `EvolutionPanel` la franja inferior completa (`absolute bottom-4 left-4 right-4`), `BasemapSwitcher` la esquina superior derecha. **El único cuadrante libre es el lateral derecho** — se recomienda un panel/drawer anclado a la derecha, que aparece al seleccionar región y no compite por espacio con los paneles existentes. Confirmar/ajustar esto en el Hito 7.3 (Figma), no es una decisión final todavía.
* El backend ya tiene el patrón exacto que este endpoint necesita: `distribucion_genero` en `postgres_stats_repository.rs` (`SELECT genero, SUM(cantidad) ... GROUP BY genero` sobre `estadistica_rollup`) — el nuevo endpoint es el mismo patrón agrupando por `delitos` en vez de `genero`.
* **RN-04 (`reglas-negocio.md`) ya anticipa este caso exacto:** "los delitos específicos podrán agruparse bajo categorías padre... (ej. 'Hurto a Personas', 'Hurto a Residencias', 'Hurto Automotores' pueden consolidarse en 'Delitos contra el Patrimonio')". Los 47 delitos homologados (confirmado contra la base real) son demasiados para una gráfica de pastel legible — la tabla puede mostrar el detalle completo (47 filas, ordenable), pero el pastel necesita las categorías padre de RN-04.

### Hito 7.1: Taxonomía de categorías padre — 🔴 decisión pendiente del usuario
Propuesta borrador (agrupación por título del Código Penal, contra los 47 valores reales de la base):

| Categoría padre | Artículos incluidos (ejemplos) |
|---|---|
| Delitos contra la Vida e Integridad Personal | 103 (Homicidio), 104A (Feminicidio), 109/110 (Homicidio culposo), 111-116/119/120 (Lesiones personales y variantes), 125/126 (Lesiones al feto), 136 (Lesiones en persona protegida) |
| Delitos Sexuales | 205-219B (acceso/acto carnal violento o abusivo, acoso, proxenetismo, pornografía, explotación sexual, omisión de denuncia) |
| Violencia Intrafamiliar | 229 |
| Delitos contra el Patrimonio Económico | 239 (7 variantes de hurto), 243 (Abigeato) |
| Secuestro | 168 (simple), 169 (extorsivo) |
| Extorsión | 244 |
| Terrorismo | 144, 343 |
| Amenazas | 347 |

8 categorías, tamaño legible para un pastel. **Este Hito es aprobar/ajustar esta tabla con el usuario antes de codificarla** — es contenido de dominio, no una decisión técnica que se pueda inferir sola.
* Una vez aprobada, se materializa como mapeo estático en `backend/src/domain/delito_categoria.rs` (`HashMap`/`match` de 47 entradas) — no una tabla nueva en la base de datos: son 47 valores fijos que ya viven homologados por `UPDATE` en `scripts/migrations/0001_...`, así que un mapeo estático en Rust sigue el mismo precedente y evita una migración + JOIN adicional para algo que no cambia en tiempo de ejecución.

### Hito 7.2: Backend — nuevo endpoint
* **Ruta:** `POST /api/v1/stats/breakdown` (nombre a confirmar contra el estilo de `02-api-contracts.md` — alternativa: extender `/api/v1/stats/kpi`, descartada porque el payload de detalle por delito no es un "KPI de alto nivel" y mezclaría responsabilidades).
* **Request:** `GlobalFilters` ya trae `municipio_id`/`departamento_id` (la región clicada) y opcionalmente `anio_inicio`/`anio_fin` — el selector de año local del panel (Hito 7.4) simplemente sobreescribe esos dos campos antes de llamar, replicando el patrón ya usado por `buildEvolutionFilters`/`buildComparisonFilters` en el frontend. "Todos los años" = no enviar override, se usa el rango global activo (mismo default que ya tiene toda la app).
* **Response propuesta:**
  ```json
  {
    "region_label": "ANTIOQUIA",
    "por_delito": [
      { "delito": "ARTICULO 239. HURTO PERSONAS", "categoria": "Delitos contra el Patrimonio Económico", "cantidad": 142031 }
    ],
    "por_categoria": [
      { "categoria": "Delitos contra el Patrimonio Económico", "cantidad": 198450 }
    ]
  }
  ```
  `por_delito` alimenta la tabla (detalle completo, ordenable en el cliente), `por_categoria` alimenta el pastel directamente ya agregado — evita que el frontend tenga que conocer la taxonomía del Hito 7.1 para volver a agrupar.
* TDD: `apply_filters` se reutiliza sin cambios; el `GROUP BY delitos` es idéntico en costo a `distribucion_genero` (ya validado <300ms en producción), así que no se espera necesidad de tocar `estadistica_rollup` — confirmar con `EXPLAIN ANALYZE` igual que se hizo en el Hito 5.2 original antes de asumirlo.

### Hito 7.3: Figma
* Diseñar el panel/drawer nuevo (ver hallazgo de layout arriba: candidato = lateral derecho) con: selector de año (default "Todos los años"), tabla (delito + cantidad, ordenable), y gráfica de pastel (por categoría, RN-04) — reutilizar el componente "Gender Donut" (`13:55`) como base visual/técnica para el pastel, ya que es exactamente el mismo tipo de gráfico con una paleta categórica distinta.
* Nueva paleta categórica de 8 colores (una por categoría padre del Hito 7.1) — validar con `validate_palette.js` igual que las paletas ya reconciliadas (comparación, género, límite departamental) en `00-design-system.md`, sin reutilizar tonos ya reservados (rojo=choropleth/status-critical, azul=selección, naranja/azul=comparación, verde/morado/ámbar=género).
* Definir el estado vacío (región sin delitos en el año elegido) y el de carga (skeleton, mismo patrón que `EvolutionPanelSkeleton`/`KpisPanelSkeleton`).

### Hito 7.4: Frontend
* Nuevo componente (ej. `features/breakdown/RegionBreakdownPanel.tsx`) + helper `buildBreakdownFilters.ts` (mismo patrón que `buildComparisonFilters.ts`/`buildEvolutionFilters.ts`) + `buildDelitoDonutData` en un `formatBreakdown.ts` (mismo patrón que `buildGeneroDonutData` en `features/kpis/formatKpis.ts`).
* Estado del selector de año local (no en `useAppStore` ni en `GlobalFilters` — vive en el propio componente, mismo criterio que otros estados "locales a un panel" ya establecidos en este proyecto, ej. el filtro de comparación).
* Se abre/cierra con la selección de región (`selectedRegion` de `useAppStore`, ya existente) — no requiere estado nuevo de store para visibilidad, solo para los datos propios del panel.
* Tabla: ordenable por columna al menos por `cantidad` (descendente por default). Recharts `PieChart`/`Pie`/`Cell` para el pastel, igual que el donut de género.

### Hito 7.5: Verificación end-to-end
* Con datos reales: click en Antioquia → tabla + pastel coherentes con `total_delitos` de los KPIs para los mismos filtros (la suma de `por_delito.cantidad` debe igualar el total, mismo tipo de aserción cruzada ya usado en `distribucion_genero_sums_to_the_same_total_as_total_delitos`).
* Selector de año probado con al menos 2 años distintos + "Todos los años", confirmando que cambia el resultado.
* Capturas Playwright en ambos temas.

---

## Fase 8: Leyenda del Mapa (Densidad Delictiva)

**Objetivo:** un elemento visual permanente en el mapa que indique la dirección de la rampa — "oscuro = peligroso, claro = seguro" — resolviendo la ambigüedad que un choropleth sin leyenda siempre tiene para un usuario nuevo.

### Hallazgo clave: esto ya está medio construido
* **El componente "Map Legend" ya existe en Figma** (`Components & Helpers`, nodo `17:74`, ver `estadistica_delicitva` fileKey `NJXIriyDT674hHetseeX0B`) — título "DENSIDAD DELICTIVA", barra de 5 tonos con etiquetas "Mínimo"/"Máximo". **Nunca se colocó en ningún Flow Screen** (no aparece en la lista de instancias de `Floating Map Control`/`Basemap Switcher` ya documentada) **y nunca se implementó en el frontend** (`grep` de "Leyenda\|legend\|Legend" sobre `frontend/src` no encuentra nada) — quedó diseñado pero nunca conectado a ningún lado.
* **Está desactualizado respecto al cambio de esta misma sesión:** la captura actual del nodo `17:74` muestra "Mínimo" del lado del tono oscuro y "Máximo" del lado del tono claro — exactamente la dirección que se **invirtió** en `frontend/src/shared/design-system/tokens.css` (commit `d316557`, "más oscuro = más peligroso"). Hay que corregir el gradiente del componente de Figma antes de usarlo, no solo copiarlo tal cual.
* Layout: con el Hito 7.3 (drawer derecho) y los paneles ya existentes (KPI arriba, Evolución abajo), el hueco natural para la leyenda es el **lateral izquierdo**, en la franja media del mapa (entre el borde inferior del panel de KPIs y el borde superior del panel de Evolución) — coincide con lo que pidió el usuario ("en la parte izquierda del mapa").

### Hito 8.1: Figma
* Corregir el gradiente de `17:74`: 5 swatches en el orden ya vigente en `tokens.css` (`--choropleth-1..5`, del más claro al más oscuro), y las etiquetas deben leerse "Menor densidad" (claro, izquierda) → "Mayor densidad" (oscuro, derecha) — evitar "Mínimo"/"Máximo" a secas, que no comunican la asociación con peligrosidad que pidió el usuario. Considerar agregar un rótulo corto explícito tipo "Más oscuro = más peligroso" si el espacio del componente lo permite, para que la lectura no dependa de inferir la dirección de la barra.
* Si la Fase 6 (tasa per cápita) ya está implementada para cuando se aborde esta fase, la leyenda debe soportar ambas unidades (cambiar su título/subtítulo según `metrica`: "Densidad Delictiva" vs. "Tasa x100k hab.") — coordinar el orden real de implementación entre fases antes de fijar el diseño final para no rediseñarlo dos veces.
* Colocar una instancia del componente corregido en los 5 Flow Screens, lateral izquierdo del área del mapa, en la franja media libre — mismo criterio de posicionamiento ya usado para el Basemap Switcher (evitar solaparse con Floating Map Control/paneles existentes).

### Hito 8.2: Frontend
* Nuevo componente `features/map/MapLegend.tsx` — estático (no depende de `GlobalFilters` ni de datos por región, solo del tema activo para leer `--choropleth-1..5` vía `readDesignTokens.ts`, ya existente) y, si la Fase 6 ya existe, del `metrica` activo para el título.
* Se monta como hijo de `MapCanvas` junto a `BasemapSwitcher`/`MapTooltip`, posicionado `absolute left-4` a media altura — sin lógica nueva de estado, es el componente más simple de las 3 fases.

### Hito 8.3: Verificación
* Captura Playwright en ambos temas confirmando que el gradiente mostrado en la leyenda coincide visualmente con los colores reales del choropleth en el mapa (mismo tipo de verificación visual ya hecha para el fix de la rampa esta sesión) — es la forma más directa de detectar si la leyenda quedó desincronizada de los tokens reales.

---

## Riesgos y decisiones pendientes (consolidado)

| # | Ítem | Fase | Tipo | Bloquea a |
|---|---|---|---|---|
| 1 | Desfase de 1 municipio entre población (1.123) y geometría/hechos (1.122) | 6 | Técnico, se resuelve con datos reales | Hito 6.2 |
| 2 | ¿`metrica` como parámetro en `/map/stats` o dos campos siempre presentes? | 6 | Técnico, se decide midiendo payload real | Hito 6.4 |
| 3 | ¿Agregar `tasa_nacional` a los KPIs? | 6 | Alcance — fuera del pedido original, opcional | — (no bloquea) |
| 4 | Taxonomía de 8 categorías padre de delitos (tabla propuesta arriba) | 7 | **Decisión del usuario**, contenido de dominio | Hito 7.2/7.3 |
| 5 | Nombre final del endpoint (`/stats/breakdown` u otro) | 7 | Técnico, cosmético | Hito 7.2 |
| 6 | Confirmar drawer lateral derecho como ubicación del panel de desglose | 7 | Diseño, se valida en Figma | Hito 7.3 |
| 7 | Orden de implementación Fase 6 vs. Fase 8 (la leyenda debe reflejar la unidad activa si la tasa ya existe) | 6/8 | Secuencia | Hito 8.1 |

## Orden recomendado
Fase 8 (Leyenda) es la más pequeña y no tiene dependencias de datos — candidata a ir primero si se quiere una victoria rápida. Fase 6 (Tasa) tiene la mayor carga de datos/ETL y debería preceder a un eventual ajuste de la leyenda (riesgo #7). Fase 7 (Desglose) es independiente de las otras dos y puede desarrollarse en paralelo por otra persona/agente sin conflicto de archivos (toca `features/breakdown/` y un endpoint nuevo, no toca `MapCanvas.tsx` ni `tokens.css`).
