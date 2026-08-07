# API Contracts (Contratos de Interfaz)

Este documento define la interfaz de comunicación (contratos) entre el Frontend (React/MapLibre) y el Backend (Rust/Axum). Todas las respuestas exitosas devuelven un código HTTP `200 OK`, y los errores comunes retornan `400 Bad Request` o `500 Internal Server Error` con un cuerpo JSON descriptivo.

---

## 1. Tipos de Datos Compartidos (Filtros Globales)

Todas las peticiones (a excepción de las capas vectoriales estáticas puras) aceptarán un objeto de filtros (Query Parameters en GET o JSON Body en POST) estandarizado.

### Objeto `GlobalFilters`
```json
{
  "anio_inicio": 2020,        // (Opcional) Integer: Rango inicial
  "anio_fin": 2025,           // (Opcional) Integer: Rango final
  "departamento_id": 11,      // (Opcional) Integer: Código DANE Depto (sin ceros a la izquierda, ej. 5 para Antioquia)
  "municipio_id": 11001,      // (Opcional) Integer: Código DANE Municipio
  "delitos": ["HURTO"],       // (Opcional) Array<String>: Lista de delitos homologados
  "genero": "FEMENINO",       // (Opcional) String: 'MASCULINO', 'FEMENINO', 'NO_REPORTADO'
  "grupo_edad": "DE 18 ANOS Y MAS",  // (Opcional) String: uno de los 4 valores homologados (HU-2.03)
  "arma_medio": "ARMA DE FUEGO"      // (Opcional) String: uno de los valores homologados de /api/v1/metadata/filtros (HU-2.03)
}
```
*Nota: `grupo_edad` y `arma_medio` faltaban en versiones anteriores de este contrato pese a ser requeridos por HU-2.03 ("Filtros Demográficos") y ya estar presentes en los mockups de Figma — se agregan aquí antes de iniciar el Hito 2.1 del backend para que el Struct `GlobalFilters` nazca completo.*

---

## 2. Endpoints Analíticos

### 2.1 Obtener KPIs (Tarjetas Principales)
**Ruta:** `POST /api/v1/stats/kpi`  
**Propósito:** Proveer las métricas de alto nivel (HU-3.01) basadas en los filtros actuales.

**Request Body:** `GlobalFilters`

**Response (`200 OK`):**
```json
{
  "total_delitos": 450210,
  "variacion_porcentual": 5.4,      // % comparado con el periodo inmediato anterior, o null (ver nota)
  "delito_mas_comun": "HURTO A PERSONAS",
  "mes_mayor_impacto": "2023-07",   // (HU-3.01) Periodo YYYY-MM con mayor `cantidad` agregada dentro del rango filtrado
  "distribucion_genero": {
    "MASCULINO": 210000,
    "FEMENINO": 230000,
    "NO_REPORTADO": 10210
  }
}
```
*Nota: `mes_mayor_impacto` faltaba en versiones anteriores de este contrato pese a ser un criterio explícito de HU-3.01 ("el mes de mayor impacto") — se agrega aquí antes de iniciar el Hito 3.1 del backend.*

*Nota (corrección 2026-08-07): `variacion_porcentual` es `null` cuando el "periodo inmediato anterior" (mismo largo que el rango filtrado, desplazado hacia atrás) cae total o parcialmente fuera del rango real del dataset (RN-06, 2020-2025) — ej. al filtrar "todos los años" (sin acotar) o solo el primer año (2020), donde el periodo anterior calculado no tiene ningún dato real que comparar. Antes de esta corrección se reportaba `+100.0%` en ese caso (misma convención que "aparece desde cero"), lo cual era engañoso: no es que el periodo anterior haya tenido cero delitos, es que ese periodo no existe dentro del dataset. El frontend debe tratar `null` como "sin comparación disponible", no como 0% ni como un error.*

### 2.2 Obtener Evolución Temporal (Gráfico de Barras/Líneas)
**Ruta:** `POST /api/v1/stats/evolution`  
**Propósito:** Retornar los datos agrupados por tiempo para trazar el gráfico de evolución (HU-3.02 y HU-3.03). Si se filtra por `municipio_id`, agrupa la evolución de esa región.

**Request Body:**
```json
{
  "filters": { /* GlobalFilters */ },
  "agrupacion": "ANUAL" // "ANUAL" o "MENSUAL"
}
```

**Response (`200 OK`):**
```json
{
  "region_label": "BOGOTÁ, D.C.",
  "series": [
    { "periodo": "2020", "cantidad": 85000 },
    { "periodo": "2021", "cantidad": 91000 },
    { "periodo": "2022", "cantidad": 89000 }
  ]
}
```

### 2.3 Obtener Desglose de Delitos por Región (Tabla + Gráfica de Pastel)
**Ruta:** `POST /api/v1/stats/breakdown`  
**Propósito:** Retornar el desglose de delitos de una región al hacer clic sobre ella en el mapa (Fase 6, RN-04). El body es `GlobalFilters` directamente (igual que §2.1) — la región va en `municipio_id`/`departamento_id`; el selector de año local del panel, si el usuario elige uno, sobreescribe `anio_inicio`/`anio_fin` antes de enviar (omitirlos = "todos los años", el rango global activo).

**Request Body:** `GlobalFilters`

**Response (`200 OK`):**
```json
{
  "region_label": "ANTIOQUIA",
  "por_delito": [
    { "delito": "ARTICULO 239. HURTO PERSONAS", "categoria": "Delitos contra el Patrimonio Económico", "cantidad": 142031 },
    { "delito": "ARTICULO 103. HOMICIDIO", "categoria": "Delitos contra la Vida e Integridad Personal", "cantidad": 5210 }
  ],
  "por_categoria": [
    { "categoria": "Delitos contra el Patrimonio Económico", "cantidad": 198450 },
    { "categoria": "Delitos contra la Vida e Integridad Personal", "cantidad": 12030 }
  ]
}
```
*Nota (RN-04):* `por_delito` trae el detalle completo (hasta 47 delitos homologados) ordenado descendente por `cantidad`, para alimentar una tabla ordenable en el cliente. `por_categoria` ya viene agregado por categoría padre (máximo 8, ver `docs/plans/04-plan-desarrollo-funcionalidades-v2.md` Hito 7.1) y ordenado descendente — pensado para alimentar la gráfica de pastel directamente, sin que el cliente necesite conocer la taxonomía. La suma de `cantidad` en cualquiera de los dos arreglos es igual a `total_delitos` de §2.1 para los mismos filtros.

---

## 3. Endpoints Geoespaciales

> **Nota de diseño (ver [ADR 0002](../adr/0002-separacion-geometria-estadisticas.md)):** la geometría y las estadísticas se sirven en endpoints separados para maximizar la cacheabilidad. La geometría es estática (no depende de `GlobalFilters`) y se pide una única vez por granularidad; las estadísticas son dinámicas, livianas, y se unen a la geometría en el cliente por `codigo_dane`.

### 3.1 Obtener Geometría del Mapa (Estática, Cacheable)
*Nota: Si se decide implementar Mapbox Vector Tiles (MVT) nativos, este endpoint se reemplazará o complementará por una ruta de tiles GET `/api/v1/map/tiles/{granularidad}/{z}/{x}/{y}.pbf`.*

**Ruta:** `GET /api/v1/map/geometry/{granularidad}`  
**Parámetros de ruta:** `granularidad` = `DEPARTAMENTO` o `MUNICIPIO`.  
**Propósito:** Retornar únicamente los polígonos con sus identificadores, sin datos estadísticos. No acepta `GlobalFilters` — el resultado es idéntico para todos los usuarios y filtros.  
**Cache:** Debe responder con cabeceras `Cache-Control: public, max-age=86400` y `ETag`. El frontend la solicita una sola vez por granularidad y la conserva en memoria durante toda la sesión (HU-1.01, HU-1.04).

**Response (`200 OK`):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [ /* ... */ ]
      },
      "properties": {
        "codigo_dane": 11001,
        "nombre_region": "BOGOTÁ, D.C."
      }
    }
    // ... más features ...
  ]
}
```

### 3.2 Obtener Estadísticas por Región (Dinámico, Liviano)
**Ruta:** `POST /api/v1/map/stats`  
**Propósito:** Retornar el conteo de delitos (o, desde la Fase 6, la tasa por 100.000 habitantes) agregado por región, filtrado según `GlobalFilters`, listo para unirse en el cliente con la geometría ya cacheada (HU-1.02, HU-1.03, HU-1.04).

**Request Body:**
```json
{
  "filters": { /* GlobalFilters */ },
  "granularidad": "DEPARTAMENTO", // "DEPARTAMENTO" o "MUNICIPIO"
  "metrica": "ABSOLUTA" // (Opcional, default "ABSOLUTA") "ABSOLUTA" o "TASA" — Fase 6
}
```

**Response (`200 OK`):**
```json
{
  "granularidad": "DEPARTAMENTO",
  "data": {
    "11": 240832,
    "5": 583421.0,
    "76": 187654
    // ... un par codigo_dane -> valor por cada región con datos ...
  }
}
```
*Nota (RN-09 y ADR 0002): las regiones ausentes en `data` deben pintarse en el frontend con el color neutro/transparente definido en HU-1.02 — el backend no rellena ceros explícitos para regiones sin registros, para mantener el payload mínimo.*

*Nota (Fase 6, RN-12): `data` es siempre numérico (`f64` en el backend) independientemente de `metrica` — con `"ABSOLUTA"` los valores son enteros exactos representados como número (ej. `240832`), con `"TASA"` son decimales ("delitos por cada 100.000 habitantes", ej. `312.4`). Con `metrica: "TASA"`, una región sin población conocida para el rango de años filtrado (`anio_inicio`/`anio_fin`, o el rango completo del dataset si no se especifican) se omite de `data` igual que una región sin registros delictivos — nunca se divide por cero.*

*Nota de formato — crítica para el join en el cliente (evitar repetir el bug de `codigo_dane` ya corregido a nivel de base de datos):* cuando `granularidad = "DEPARTAMENTO"`, tanto esta clave como la propiedad `codigo_dane` de `GET /api/v1/map/geometry/DEPARTAMENTO` deben representar el código de **departamento** (1-2 dígitos, ej. `5` para Antioquia, `11` para Bogotá) **sin ceros a la izquierda** — no el código de municipio de 5 dígitos usado en `granularidad = "MUNICIPIO"`. Ambos endpoints deben producir exactamente el mismo valor/formato para la misma región, o el `setFeatureState` por `codigo_dane` en el cliente fallará silenciosamente (features sin match, choropleth vacío) exactamente como falló el join en la base de datos antes de la migración correctiva.

---

## 4. Endpoints Auxiliares (Filtros y Metadatos)

### 4.1 Obtener Diccionario de Filtros
**Ruta:** `GET /api/v1/metadata/filtros`  
**Propósito:** Poblar en una sola petición los 4 selectores de vocabulario fijo del panel de filtros (Delitos, Arma/Medio, Género, Grupo de Edad — RF-05, HU-2.02, HU-2.03), evitando 4 round-trips separados en el arranque de la app (favorece RNF-01, TTV<2s). Cacheable agresivamente igual que la geometría (Sección 3.1) — el vocabulario solo cambia si se re-ejecuta el ETL.

*(Nota: en una versión anterior de este contrato existían 4 endpoints separados por campo; se consolidan en uno solo porque los 4 valores se necesitan juntos al montar el sidebar y todos son `SELECT DISTINCT` igual de baratos de cachear.)*

**Response (`200 OK`):**
```json
{
  "delitos": [
    "HURTO A PERSONAS",
    "HOMICIDIO",
    "DELITOS SEXUALES",
    "VIOLENCIA INTRAFAMILIAR"
  ],
  "armas_medios": [
    "ARMA DE FUEGO",
    "ARMA BLANCA / CORTOPUNZANTE",
    "SIN EMPLEO DE ARMAS",
    "NO REPORTADO"
  ],
  "generos": ["MASCULINO", "FEMENINO", "NO_REPORTADO"],
  "grupos_edad": ["DE 0 A 14 ANOS", "DE 14 A 17 ANOS", "DE 18 ANOS Y MAS", "NO_REPORTADO"]
}
```
