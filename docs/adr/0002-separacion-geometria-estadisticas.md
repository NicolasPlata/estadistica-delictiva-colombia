# ADR 0002: Separación de Geometría Estática y Estadísticas Dinámicas

## Contexto
El contrato inicial (`02-api-contracts.md` v1) exponía un único endpoint `POST /api/v1/map/geojson` que devolvía, en cada petición filtrada, tanto la geometría de los polígonos (departamentos o municipios) como la propiedad `cantidad_delitos` ya calculada para esos filtros.

Esto acopla dos cosas de naturaleza muy distinta:
*   **Geometría:** ~1,122 polígonos municipales (o 33 departamentales). Es **estática** — no cambia según los filtros del usuario, solo según la granularidad.
*   **Estadísticas:** el conteo de delitos por región. Es **dinámica** — cambia con cada combinación de año, mes, delito, género, etc.

Al servir ambas juntas:
1.  Cada cambio de filtro obliga a retransmitir y re-parsear geometría idéntica (potencialmente pesada) que el cliente ya tiene.
2.  Es imposible cachear la respuesta en el backend, CDN o navegador de forma efectiva, porque la clave de cache tendría que incluir todos los filtros posibles.
3.  Contradice parcialmente el espíritu de RNF-01/RNF-02/RNF-03 (TTV < 2s, 60 FPS, respuestas < 300ms), ya que se paga el costo de transferencia de geometría en el camino crítico de cada interacción de filtrado.

## Decisión
Se separa el endpoint geoespacial en dos:

1.  **`GET /api/v1/map/geometry/{granularidad}`** — Devuelve únicamente la geometría (GeoJSON o MVT) con propiedades mínimas de identificación (`codigo_dane`, `nombre_region`). No acepta `GlobalFilters`. Es cacheable de forma agresiva (`Cache-Control: public, max-age=86400` o superior, más `ETag`), ya que el contenido solo cambia si se actualiza el shapefile fuente. El frontend la solicita **una sola vez** por granularidad y la mantiene en memoria/caché del navegador.
2.  **`POST /api/v1/map/stats`** — Devuelve un diccionario ligero `{ codigo_dane: cantidad }` calculado a partir de `GlobalFilters`. No contiene geometría. El payload es órdenes de magnitud más pequeño (miles de pares clave-valor vs. miles de polígonos con coordenadas).

El frontend une ambas fuentes en el cliente mediante `codigo_dane`, usando las capacidades de *data-driven styling* de MapLibre GL JS (`setFeatureState` + expresiones `match`/`case`) para recolorear el choropleth sin volver a pedir ni re-renderizar geometría.

## Consecuencias
*   **Positivas:**
    *   La geometría se transfiere y parsea una única vez por sesión de usuario (o se sirve desde caché de CDN/navegador en visitas repetidas).
    *   Cada cambio de filtro solo mueve un payload pequeño, favoreciendo el cumplimiento de RNF-02 y RNF-03.
    *   El toggle Departamento/Municipio (HU-1.04) se vuelve trivial: se cachean ambas geometrías por separado y se alterna la fuente activa en el cliente.
    *   Habilita el uso de un CDN o cache HTTP estándar para el endpoint de geometría sin necesidad de infraestructura adicional.
*   **Negativas / Trade-offs:**
    *   Se añade lógica de "join" en el cliente (unir stats con features por `codigo_dane`) que antes vivía en el backend.
    *   Existen dos round-trips en la carga inicial en lugar de uno (mitigado porque ambos se pueden disparar en paralelo, y la geometría se cachea tras la primera carga).

## Documentos Afectados
Esta decisión reemplaza la Sección 3 de `02-api-contracts.md`, la RN-09 de `reglas-negocio.md`, y el Hito 4.2 de `02-plan-desarrollo-backend.md` / Hito 3.2 de `03-plan-desarrollo-frontend.md`.
