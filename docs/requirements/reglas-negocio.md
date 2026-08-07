# Reglas de Negocio

Este documento rige la lógica central del tratamiento de los datos estadísticos, su integridad y su agregación en el sistema.

## 1. Definición y Estandarización de Geometrías (Single Source of Truth)
*   **RN-01 (Código DANE):** El Código DANE (territorial) de 5 dígitos para los municipios (e.g. `11001` para Bogotá) se consagra como la **única clave foránea** válida para cruzar información estadística con las capas geográficas (shapefiles o GeoJSON). No se utilizarán los nombres de los municipios para los cruces técnicos.
*   **RN-02 (Jerarquía Territorial):** Toda agrupación geográfica de primer nivel corresponderá al "Departamento", y la agregación de segundo nivel será el "Municipio". Se ignorarán áreas no municipalizadas salvo que posean un Código DANE asignado oficialmente.

## 2. Tratamiento y Estandarización de Delitos
*   **RN-03 (Homologación Penal):** Múltiples variaciones tipográficas en la tipificación de los delitos que aborden el mismo tipo penal (por ejemplo, diferencias en el fraseo de agravantes en delitos sexuales) **deben ser unificadas y consolidadas** bajo un título marco único. Las variantes como "ACCESO CARNAL O ACTO SEXUAL ABUSIVO CON INCAPAZ DE RESISTIR" se transforman hacia la nomenclatura base acordada previamente en los diccionarios de datos del backend.
*   **RN-04 (Categorías Superiores):** Los delitos específicos podrán agruparse bajo categorías padre para facilitar la lectura al usuario (ej. "Hurto a Personas", "Hurto a Residencias", "Hurto Automotores" pueden consolidarse en "Delitos contra el Patrimonio" según sea el requerimiento en el frontend).

## 3. Integridad Temporal y Fechas
*   **RN-05 (Periodos Nulos):** Cualquier registro delictivo donde la fecha exacta (`fecha_hecho`) no haya sido reportada pero que sí posea el mes y el año registrados (extraídos desde la estructura inicial del reporte) será incluido en las estadísticas agregadas mensuales y anuales, aunque el día exacto sea incierto.
*   **RN-06 (Restricción Histórica):** El sistema limitará su contexto analítico exclusivamente a los eventos ocurridos entre el 1 de Enero de 2020 y la última fecha registrada de 2025. Registros fuera de este rango se consideran outliers y deben descartarse.

## 4. Agregación Métrica
*   **RN-07 (Cálculo de Incidencia):** El conteo base siempre sumará la variable numérica (`cantidad`) del dataset original. No se asumirá que un registro individual equivale a 1 delito (pues los reportes suelen llegar pre-agregados en algunas celdas).
*   **RN-08 (Manejo de Nulos Numéricos):** Los valores de cantidad omitidos o no legibles en la fuente primaria (NaN / Null) se contabilizarán como 0 absoluto.

## 5. Topologías de Respuesta de la API
*   **RN-09 (Optimización Vectorial):** Para reducir latencia y payloads masivos en transferencias, el backend en Rust *siempre* deberá responder a peticiones espaciales estructurando los resultados en MVT (Mapbox Vector Tiles) o, en su defecto, en formato GeoJSON simplificado y cuantizado en memoria. Nunca se devolverán arreglos de millones de registros crudos (Raw JSON rows) para el trazado visual del mapa.
*   **RN-10 (Invariante de Geometría Cacheable):** La geometría de los polígonos (departamentos/municipios) es un dato **estático** y debe servirse desacoplada de cualquier valor estadístico dinámico (ver [ADR 0002](../adr/0002-separacion-geometria-estadisticas.md)). Ningún endpoint que reciba `GlobalFilters` debe devolver coordenadas geométricas; a la inversa, el endpoint de geometría nunca debe aceptar filtros ni incluir `cantidad_delitos`. La unión entre ambas fuentes (por `codigo_dane`) ocurre exclusivamente en el cliente.

## 6. Población y Tasas per Cápita (Fase 6, `docs/plans/04-plan-desarrollo-funcionalidades-v2.md`)
*   **RN-11 (Fuente y alcance de la población):** la única fuente válida de población es la proyección oficial del DANE (PPED, `Data/Población/Población.xlsx`, hoja `PobMunicipalxÁrea`), cargada por `scripts/migracion_poblacion.py` a la tabla `poblacion_municipal (codigo_dane, anio, poblacion)`. Se ingiere únicamente la fila `ÁREA GEOGRÁFICA = 'Total'` de cada municipio/año — el desglose Cabecera Municipal / Centros Poblados y Rural Disperso que trae la fuente **no** se carga, porque ningún requerimiento de la app lo necesita (evitar complejidad sin uso). El cruce con el resto del sistema es, igual que en el resto de la app (RN-01), exclusivamente por `codigo_dane` — nunca por nombre.
*   **RN-12 (Cálculo de tasa per cápita):** la tasa que se muestra en el choropleth y las estadísticas relacionadas se calcula como:

    ```
    tasa = (SUM(cantidad) en el rango de años filtrado) / (AVG(poblacion) de esos mismos años) × 100.000
    ```

    Se expresa como "delitos por cada 100.000 habitantes" (convención estándar en criminología/DANE, evita decimales ilegibles). Cuando el filtro cubre varios años, el denominador es el **promedio** de población de esos años — no la suma ni un único año — consistente con que `total_delitos` (el KPI ya existente) también es un acumulado del periodo completo, no un promedio anual. Una región sin fila en `poblacion_municipal` para los años filtrados se trata como "sin dato" (igual que HU-1.02 ya trata regiones sin registros delictivos) — nunca se divide por cero ni se muestra `Infinity`.
*   **RN-13 (Nivel departamental derivado):** `poblacion_municipal` solo tiene granularidad municipal (es lo único que expone la fuente DANE). La población departamental/nacional se deriva sumando `poblacion` agrupado por `codigo_dane / 1000` (`dpto_codigo`), exactamente igual a como `estadistica_delictiva.dpto_codigo` ya deriva el nivel departamental de los hechos delictivos — no existe ni se crea una tabla separada a nivel departamento.
