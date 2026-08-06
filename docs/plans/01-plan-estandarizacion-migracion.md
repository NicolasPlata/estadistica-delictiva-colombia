# Plan de Estandarización y Migración a PostgreSQL

Este documento describe la estrategia y los pasos a seguir para unificar, limpiar, estandarizar y migrar los datos estadísticos delictivos (2020-2025) hacia la base de datos PostgreSQL.

## 1. Análisis del Esquema Actual
Tras inspeccionar los archivos Excel, se identificaron las siguientes columnas en común y sus variaciones:
*   `ARMAS MEDIOS` (en 2020, 2022-2025) vs `ARMA MEDIO` (en 2021).
*   `DEPARTAMENTO`
*   `MUNICIPIO`
*   `FECHA HECHO`
*   `GENERO`
*   `*AGRUPA EDAD PERSONA*` (Nombre poco amigable para bases de datos).
*   `CODIGO DANE` (Fundamental para luego enlazar con mapas GeoJSON).
*   `DELITOS`
*   `MES`
*   `CANTIDAD`

## 2. Plan de Estandarización de Datos (El Script en Python/Pandas)

Para asegurar la calidad de la información, el script de Python deberá realizar las siguientes tareas de limpieza:

### 2.1 Estandarización de Columnas
*   Renombrar `ARMA MEDIO` y `ARMAS MEDIOS` a un único nombre: `arma_medio`.
*   Renombrar `*AGRUPA EDAD PERSONA*` a `grupo_edad`.
*   Convertir todos los nombres de columnas restantes a minúsculas y reemplazar espacios por guiones bajos (ej. `fecha_hecho`, `codigo_dane`).

### 2.2 Estandarización de Filas (Valores)
Los registros suelen tener inconsistencias si son rellenados manualmente. Aplicaremos las siguientes transformaciones a las columnas de texto (`departamento`, `municipio`, `arma_medio`, `genero`, `delitos`, `grupo_edad`):
*   **Trimming:** Eliminar espacios en blanco al inicio y al final (`.strip()`).
*   **Mayúsculas:** Convertir absolutamente todo el texto a mayúsculas (o formato título) para evitar que "Bogotá" y "BOGOTÁ" sean dos entidades distintas en la base de datos.
*   **Remoción de tildes (Opcional pero recomendado):** Normalizar el texto para quitar acentos, lo cual facilita los filtros de búsqueda y las agrupaciones.

### 2.3 Tipos de Datos y Transformaciones
*   Convertir `fecha_hecho` a un formato estándar de fecha (ISO 8601 o `YYYY-MM-DD`).
*   Convertir `codigo_dane` a un valor numérico entero (a veces los Excel los leen como flotantes ej: `11001.0`).
*   Verificar que `cantidad` sea siempre numérico y rellenar valores nulos con `0` si existieran.

## 3. Plan de Migración a PostgreSQL

Dado que ya cuentas con PostgreSQL y el archivo `.env` configurado, el proceso de carga será el siguiente:

### 3.1 Diseño de la Tabla
Crearemos una tabla unificada (ej. `estadistica_delictiva`). 
```sql
CREATE TABLE estadistica_delictiva (
    id SERIAL PRIMARY KEY,
    fecha_hecho DATE,
    anio INTEGER, -- (Se puede extraer del nombre del archivo o de la fecha)
    mes INTEGER,
    codigo_dane INTEGER,
    departamento VARCHAR(100),
    municipio VARCHAR(100),
    delitos VARCHAR(255),
    arma_medio VARCHAR(100),
    genero VARCHAR(50),
    grupo_edad VARCHAR(50),
    cantidad INTEGER
);
```
*(Nota: Más adelante, en la Fase de mapas, se creará una tabla separada `municipios_geo` que relacione el `codigo_dane` con su polígono geográfico).*

### 3.2 Inserción de los Datos (Batch Insert)
El script en Python utilizará `SQLAlchemy` (junto con `python-dotenv` para leer tu `.env` automáticamente).
Debido al volumen de datos (6 archivos de ~30MB pueden ser millones de filas), utilizaremos la función `to_sql()` de Pandas con un método de inserción rápida (`method='multi'` o vía `copy_from`) para insertar los datos en bloques (chunks), de manera eficiente y sin saturar la memoria RAM.

---
**Siguiente Paso Accionable:** Crear el script unificado `migracion_db.py` que ejecute todo este plan utilizando tus credenciales de PostgreSQL.

## 4. Adenda — Migración Correctiva Post-Ejecución
Tras ejecutar el plan anterior y el de shapefiles (`migracion_shape.py`), una auditoría manual detectó que el join entre `estadistica_delictiva` y `municipios_geo` por `codigo_dane` producía **0 coincidencias sobre 4.8M de filas** — el plan de estandarización de este documento limpiaba formato (`.0` de floats) pero no detectó que: (1) `municipios_geo.codigo_dane` se cargó con el código municipal *local* al departamento en vez del código DANE nacional de 5 dígitos, y (2) ~16% de las filas de `estadistica_delictiva` traían el código real con un sufijo numérico adicional. Tampoco se aplicó la homologación semántica de categorías (RN-03) más allá de trim/mayúsculas/tildes — quedaron duplicados como `ADULTOS` vs. `DE 18 ANOS Y MAS`.

Ambos problemas se corrigieron con `scripts/migrations/0001_fix_codigo_dane_y_homologacion.sql` (tasa de join resultante: 99.9994%). Ver ese archivo para el detalle completo de causa raíz y la corrección. **Si se vuelve a ejecutar `migracion_db.py`/`migracion_shape.py` desde cero** (ej. para recargar datos), la migración correctiva debe volver a aplicarse después — no está incorporada a los scripts de ETL originales.
