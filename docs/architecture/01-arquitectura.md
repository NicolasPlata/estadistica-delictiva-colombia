# Arquitectura del Sistema

Para lograr un sistema rápido, económico y eficiente sin sobrecargar la infraestructura, se utiliza una arquitectura moderna basada en **Vector Tiles** y una base de datos geoespacial.

## Base de Datos
**PostgreSQL + PostGIS**
En lugar de traer todos los datos al frontend (lo cual sería lentísimo), PostGIS permite hacer consultas espaciales, agrupar delitos por municipio/departamento y filtrar por año/mes en milisegundos directamente en la base de datos.

*   **Índices:** Además de los índices espaciales GiST estándar de PostGIS sobre `municipios_geo.geom`, la tabla `estadistica_delictiva` requiere índices B-Tree (simples o compuestos) sobre las columnas más usadas en los filtros dinámicos (`anio`, `mes`, `codigo_dane`, `delitos`, `genero`) para sostener el RNF-03 (<300ms) a medida que crecen las combinaciones de filtros.
*   **Pool de conexiones en free-tier:** Los proveedores gratuitos de Postgres (ej. Supabase, Neon) suelen limitar el número de conexiones concurrentes (~20-60). El `sqlx::PgPool` del backend debe configurarse con un tamaño máximo acorde, y si el proveedor lo requiere, conectarse en modo *transaction pooling* (pgbouncer) en vez de modo sesión.

## Backend (Lógica y API)
**Rust (con Axum o Actix-Web + SQLx)**
El backend recibirá los filtros del frontend, hará la consulta SQL a PostGIS, y devolverá los datos transformando la respuesta a MVT (Mapbox Vector Tiles) o GeoJSON.

*   **SQL dinámico seguro:** Dado que los filtros (`GlobalFilters`) son opcionales y combinables, las cláusulas `WHERE` se construyen en tiempo de ejecución. Esto **debe** hacerse con `sqlx::QueryBuilder` (o equivalente) usando *bind parameters*, nunca concatenando valores de usuario directamente en el string SQL, para eliminar el riesgo de inyección SQL.
*   **Modelo de despliegue:** El término "Free-Tier" no implica necesariamente *serverless* (funciones efímeras tipo Lambda), que encaja mal con un `PgPool` persistente. Se apunta a un host de bajo costo y siempre activo (ej. Fly.io, Render, Shuttle.rs) que mantenga el pool de conexiones vivo entre peticiones.

## Geometría vs. Estadísticas (Cacheabilidad)
Como se detalla en [ADR 0002](../adr/0002-separacion-geometria-estadisticas.md), la geometría de los polígonos (estática) y las estadísticas delictivas (dinámicas, dependientes de filtros) se sirven en endpoints separados. La geometría se cachea agresivamente (HTTP cache / CDN) y se solicita una sola vez por granularidad; solo el conteo por región (`{codigo_dane: cantidad}`) viaja en cada cambio de filtro, y el frontend une ambas fuentes en el cliente. Esto reduce drásticamente el volumen de datos transferido por interacción y favorece el cumplimiento de RNF-01/RNF-02/RNF-03.

**Simplificación de geometría — no es opcional, es obligatoria:** al implementar `GET /api/v1/map/geometry/MUNICIPIO` (Fase 4 del backend), armar el `FeatureCollection` de los 1,122 municipios a la resolución original del shapefile falló contra Postgres real con `total size of jsonb array elements exceeds the maximum of 268435455 bytes` — un solo valor `jsonb` no puede superar 256MB, y la geometría sin simplificar lo supera ampliamente. La corrección fue aplicar `ST_SimplifyPreserveTopology(geom, 0.001)` (tolerancia en grados, EPSG:4326, ~111m) antes de `ST_AsGeoJSON`, bajando el payload nacional completo a ~6.2MB. Esto es, en la práctica, la implementación de RN-09 ("GeoJSON simplificado y cuantizado") — la regla ya existía en el documento de reglas de negocio, pero el límite real de Postgres es lo que forzó a implementarla en este punto exacto en vez de posponerla. Cualquier cambio futuro a un nivel de detalle mayor (ej. para zoom muy cercano) debe volver a validar contra este límite.

## Frontend (Interfaz de Usuario)
**React (con Vite) + MapLibre GL JS**
El mapa utilizará MapLibre GL JS mediante WebGL para un renderizado ultra fluido de geometrías complejas. El recoloreo del choropleth ante cambios de filtro se realiza con técnicas de *data-driven styling* (`setFeatureState` + expresiones `match`/`case`) sobre la geometría ya cargada, evitando volver a pedir o re-parsear polígonos.

## Mapas Base (Basemaps)
El proyecto ofrece 3 mapas base intercambiables (RF-10, HU-1.05), todos servidos como fuentes **raster XYZ** independientes de la capa de choropleth (que sigue siendo vector/GeoJSON, ver sección anterior). Cambiar de mapa base solo reemplaza la fuente/capa raster de fondo; las capas de geometría y estadísticas nunca se recargan.

| Mapa base | Fuente | URL de tiles | Atribución requerida (RNF-09) |
|---|---|---|---|
| **OpenStreetMap** (default Light) | OSM Foundation | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | `© OpenStreetMap contributors` |
| **Satelital** | Esri World Imagery (gratuito) | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | `Esri, Maxar, Earthstar Geographics, and the GIS User Community` |
| **Oscuro** (default Dark) | CARTO Dark Matter (gratuito, sin API key) | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` | `© OpenStreetMap contributors © CARTO` |

*(La elección del proveedor "Oscuro" no fue especificada por el usuario más allá de "uno oscuro" — se documenta CARTO Dark Matter como default razonado: es exactamente el caso de uso para el que existe, es gratuito sin registro, y combina bien con el choropleth rojo sobre fondo oscuro ya definido en `00-design-system.md`. Cambiarlo es una edición de una sola URL si se prefiere otro proveedor.)*

**Uso gratuito — limitación a tener presente:** los tres son servicios de terceros con políticas de "bajo volumen" (ninguno está pensado para tráfico de producción sin acuerdo comercial o autohospedaje). Válido para el volumen de un portafolio; si el proyecto migra a producción con tráfico real, evaluar autohospedar tiles (ej. vía `tileserver-gl` desde extractos de OSM) o un proveedor pago (MapTiler, Stadia Maps).

**Lógica de estado (tema ↔ mapa base):** el mapa base y el tema de la aplicación son dos piezas de estado enlazadas pero independientes en el store de Zustand (ver `03-plan-desarrollo-frontend.md`):
- Cambiar el tema de la app (Light/Dark) **siempre reestablece** el mapa base a su default (`OpenStreetMap` en Light, `Oscuro` en Dark), descartando cualquier selección manual previa.
- El usuario puede alternar manualmente entre los 3 mapas base en cualquier momento vía el control flotante, independientemente del tema activo — esa selección manual persiste solo hasta el próximo cambio de tema.
- El mapa Satelital no tiene una "afinidad" de tema (no es ni claro ni oscuro por diseño) — solo se alcanza manualmente, nunca es default.
