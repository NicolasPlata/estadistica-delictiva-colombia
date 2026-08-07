-- =====================================================================
-- Migración 0003: poblacion_municipal — tipos, clave primaria, índices
-- y validación de integridad (Fase 6, RN-11/RN-12/RN-13 de
-- reglas-negocio.md — docs/plans/04-plan-desarrollo-funcionalidades-v2.md)
-- =====================================================================
-- Contexto: scripts/migracion_poblacion.py ya cargó
-- Data/Población/Población.xlsx (hoja PobMunicipalxÁrea, filtrando
-- ÁREA GEOGRÁFICA='Total') a `poblacion_municipal` vía pandas.to_sql
-- (if_exists='replace'), que infiere BIGINT para las 3 columnas sin PK
-- ni índices. Esta migración deja la tabla al mismo estándar que
-- estadistica_delictiva/municipios_geo (tipos consistentes, PK, índices
-- para sostener RNF-03) y documenta la auditoría de integridad hecha
-- contra los datos reales antes de dar la carga por buena — mismo
-- criterio que 0001/0002, ejecutar con:
--   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f 0003_poblacion_indices_y_validacion.sql
--
-- AUDITORÍA PREVIA (hecha a mano el 2026-08-07, resultados incorporados
-- aquí como los DO $$ de abajo, no solo en un comentario):
--
-- 1. Desfase de municipios: el archivo fuente trae 1.123 códigos DANE
--    municipales distintos; municipios_geo (la geometría real, cargada
--    por migracion_shape.py) tiene 1.122. Diff exacto calculado con
--    pandas: el único código en población que NO está en municipios_geo
--    es 94663 (Mapiripana, Guainía, etiquetado "(ANM)" = Área No
--    Municipalizada en la fuente) — y NINGÚN código de municipios_geo
--    falta en población (0 códigos). Este 94663 es el MISMO código ya
--    documentado en scripts/migrations/0001_fix_codigo_dane_y_homologacion.sql
--    como "94663000 (1 fila, GUAINÍA): error de tipeo en la fuente
--    original sin equivalente real en el shapefile" — confirmado aquí
--    de forma independiente por una fuente de datos distinta (población
--    DANE vs. hechos delictivos), lo que refuerza que es un código real
--    sin polígono asociado, no un error de captura de este proyecto.
--    No se "arregla": no tiene equivalente real conocido. RN-13 ya
--    documenta que las regiones sin polígono simplemente no aparecen en
--    el mapa (igual que las áreas "sin municipio específico" 52000/54000
--    de la migración 0001, que sí sirven para agregados departamentales
--    aunque no tengan mapa).
--
-- 2. 29 filas con población = 0 (no nulas, no negativas — se investigaron
--    a mano, NO se descartaron en el ETL porque son valores reales del
--    DANE, no errores):
--      * codigo_dane 27493 "Nuevo Belén de Bajirá" (Chocó): 0 en
--        2018-2023, población real desde 2024 (~29.812 habitantes) — es
--        un municipio segregado recientemente de Mutatá (disputa
--        territorial Chocó/Antioquia), sin población propia reportada
--        antes de su creación formal. SÍ tiene polígono en
--        municipios_geo (confirmado, 1 fila) y SÍ aparece en
--        estadistica_delictiva (1 fila) — es un municipio real y
--        utilizable, solo con población histórica igual a 0.
--      * codigo_dane 94663 "Mapiripana (ANM)" (Guainía): 0 desde 2020 en
--        adelante (población pequeña reportada solo en 2018-2019). Sin
--        polígono (ver punto 1) — nunca se va a pintar en el mapa de
--        todos modos, así que su población en 0 es inocua en la
--        práctica.
--    RN-12 ya establece la regla general: población = 0 se trata igual
--    que "sin fila" (no se calcula tasa, nunca se divide por 0) — no
--    hace falta una excepción de datos adicional, la regla de negocio
--    ya cubre este caso.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Tipos consistentes con estadistica_delictiva/municipios_geo
-- ---------------------------------------------------------------------
-- codigo_dane y anio son INTEGER en el resto del esquema (ver
-- estadistica_delictiva.codigo_dane/.anio, municipios_geo.codigo_dane);
-- poblacion cabe en INTEGER (el municipio más poblado, Bogotá, está en
-- el orden de 8 millones, muy por debajo del límite de ~2.147 millones...
-- realmente ~2.147 mil millones de INTEGER) — mismo criterio que
-- estadistica_delictiva.cantidad, que también es INTEGER pese a
-- agregarse con SUM()::bigint en las queries.
ALTER TABLE poblacion_municipal ALTER COLUMN codigo_dane TYPE INTEGER;
ALTER TABLE poblacion_municipal ALTER COLUMN anio TYPE INTEGER;
ALTER TABLE poblacion_municipal ALTER COLUMN poblacion TYPE INTEGER;

ALTER TABLE poblacion_municipal ALTER COLUMN codigo_dane SET NOT NULL;
ALTER TABLE poblacion_municipal ALTER COLUMN anio SET NOT NULL;
ALTER TABLE poblacion_municipal ALTER COLUMN poblacion SET NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Clave primaria e índices (RNF-03: JOIN barato en el endpoint de tasa)
-- ---------------------------------------------------------------------
ALTER TABLE poblacion_municipal ADD CONSTRAINT pk_poblacion_municipal PRIMARY KEY (codigo_dane, anio);

-- Índice adicional por anio solo: útil para el AVG(poblacion) por rango
-- de años sin acotar codigo_dane (agregación departamental/nacional,
-- RN-13), que la PK (codigo_dane, anio) no cubre eficientemente sola.
CREATE INDEX IF NOT EXISTS idx_poblacion_municipal_anio ON poblacion_municipal (anio);

-- ---------------------------------------------------------------------
-- 3. Verificación defensiva — confirma en la propia base de datos lo que
--    la auditoría manual de arriba encontró, para que quede validado de
--    forma reproducible y no solo como una nota de texto.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    total_filas INTEGER;
    municipios_distintos INTEGER;
    anios_distintos INTEGER;
    sin_geometria INTEGER;
BEGIN
    SELECT count(*), count(DISTINCT codigo_dane), count(DISTINCT anio)
        INTO total_filas, municipios_distintos, anios_distintos
        FROM poblacion_municipal;

    IF total_filas != 28075 THEN
        RAISE EXCEPTION 'Se esperaban 28.075 filas (1.123 municipios × 25 años), se encontraron %', total_filas;
    END IF;
    IF municipios_distintos != 1123 THEN
        RAISE EXCEPTION 'Se esperaban 1.123 municipios distintos, se encontraron %', municipios_distintos;
    END IF;
    IF anios_distintos != 25 THEN
        RAISE EXCEPTION 'Se esperaban 25 años distintos (2018-2042), se encontraron %', anios_distintos;
    END IF;

    -- Confirma que el único código sin polígono asociado sigue siendo
    -- exactamente 94663 (Guainía, ANM) — si este número cambia, algo
    -- más se rompió y hay que auditar de nuevo, no asumir que sigue
    -- siendo el mismo caso ya conocido.
    SELECT count(DISTINCT p.codigo_dane) INTO sin_geometria
        FROM poblacion_municipal p
        LEFT JOIN municipios_geo g ON p.codigo_dane = g.codigo_dane
        WHERE g.codigo_dane IS NULL;
    IF sin_geometria != 1 THEN
        RAISE EXCEPTION 'Se esperaba exactamente 1 codigo_dane de población sin geometría asociada (94663), se encontraron %', sin_geometria;
    END IF;
END $$;

COMMIT;

-- =====================================================================
-- Verificación post-migración (ejecutar manualmente para confirmar)
-- =====================================================================
-- SELECT codigo_dane FROM poblacion_municipal p
--   WHERE NOT EXISTS (SELECT 1 FROM municipios_geo g WHERE g.codigo_dane = p.codigo_dane);
--   -- esperado: una sola fila, codigo_dane = 94663
-- SELECT anio, SUM(poblacion) FROM poblacion_municipal GROUP BY anio ORDER BY anio;
--   -- población nacional estimada por año, sanity check contra cifras DANE públicas
