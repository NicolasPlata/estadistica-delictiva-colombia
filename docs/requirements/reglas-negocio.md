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
