-- =====================================================================
-- Migración correctiva 0001: Código DANE y Homologación de Categorías
-- =====================================================================
-- Contexto: auditoría manual detectó que el JOIN entre estadistica_delictiva
-- y municipios_geo por codigo_dane producía 0 coincidencias sobre 4,836,275
-- filas. Causas raíz identificadas:
--   1. municipios_geo.codigo_dane se cargó (migracion_shape.py) con el campo
--      MPIO_CCDGO del shapefile, que es el código MUNICIPAL LOCAL al
--      departamento (1-3 dígitos, no único a nivel nacional), no el código
--      DANE de 5 dígitos. El código real es dpto_codigo*1000 + codigo_dane.
--   2. estadistica_delictiva.codigo_dane trae, en ~773,950 filas (16%),
--      el código real con un sufijo adicional de 3 dígitos (ej. 11001000
--      en vez de 11001, o 5001014 -- comuna/corregimiento -- en vez de 5001).
--      La corrección universal es dividir entre 1000 cuando el valor supera
--      99999 (5 dígitos).
-- Validado contra el 100% de las filas antes de escribir esta migración:
-- tasa de coincidencia resultante = 4,836,248 / 4,836,275 (99.9994%).
-- Excepciones conocidas y aceptadas (no se "arreglan", son datos legítimos
-- o errores puntuales irrecuperables):
--   * codigo_dane 52000/54000 (26 filas): convención propia del DANE para
--     "sin municipio específico" a nivel departamental (Nariño, Norte de
--     Santander). No tienen polígono municipal y por RN-02 se excluyen de
--     los mapas a nivel municipio, pero siguen siendo válidas para
--     agregados departamentales/nacionales.
--   * codigo_dane 94663000 (1 fila, GUAINÍA): error de tipeo en la fuente
--     original sin equivalente real en el shapefile (códigos válidos de
--     Guainía: 94001, 94343, 94883-94888). Se deja sin match; representa
--     0.00002% del total y no amerita adivinar el valor correcto.
--
-- Ejecutar con: psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f 0001_fix_codigo_dane_y_homologacion.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Reconstruir el código DANE real en municipios_geo
-- ---------------------------------------------------------------------
-- Antes: codigo_dane = código municipal local (ej. 1 para toda capital)
-- Después: codigo_dane = dpto_codigo * 1000 + código local (ej. 5001)
UPDATE municipios_geo
SET codigo_dane = dpto_codigo * 1000 + codigo_dane;

-- Verificación defensiva: deben seguir siendo 1,122 códigos únicos.
DO $$
DECLARE
    total INTEGER;
    distintos INTEGER;
BEGIN
    SELECT count(*), count(DISTINCT codigo_dane) INTO total, distintos FROM municipios_geo;
    IF total != distintos THEN
        RAISE EXCEPTION 'Se esperaban % codigo_dane únicos tras la corrección, se encontraron %', total, distintos;
    END IF;
END $$;

-- Unificar tipo de dato con estadistica_delictiva (los valores caben en INTEGER).
ALTER TABLE municipios_geo ALTER COLUMN codigo_dane TYPE INTEGER;

-- ---------------------------------------------------------------------
-- 2. Normalizar el código DANE en estadistica_delictiva
-- ---------------------------------------------------------------------
-- Cualquier valor de más de 5 dígitos trae un sufijo de 3 dígitos
-- (relleno "000" o sub-código de comuna/corregimiento); se recupera
-- el código municipal real truncando esos 3 dígitos.
UPDATE estadistica_delictiva
SET codigo_dane = codigo_dane / 1000
WHERE codigo_dane > 99999;

-- ---------------------------------------------------------------------
-- 3. Columna derivada dpto_codigo (para filtros por departamento, RF-05)
-- ---------------------------------------------------------------------
-- GlobalFilters.departamento_id filtra por código DANE de 2 dígitos.
-- Sin esta columna, ese filtro requeriría una expresión (codigo_dane/1000)
-- no indexable directamente. Se agrega como columna generada y se indexa.
ALTER TABLE estadistica_delictiva
    ADD COLUMN IF NOT EXISTS dpto_codigo INTEGER GENERATED ALWAYS AS (codigo_dane / 1000) STORED;

-- ---------------------------------------------------------------------
-- 4. Homologación RN-03 / RN-04 adyacente: genero
-- ---------------------------------------------------------------------
-- El contrato de API (02-api-contracts.md) espera el bucket NO_REPORTADO;
-- la tabla usa '' para el mismo caso (255,202 filas).
UPDATE estadistica_delictiva
SET genero = 'NO_REPORTADO'
WHERE genero = '' OR genero IS NULL;

-- ---------------------------------------------------------------------
-- 5. Homologación RN-03: grupo_edad
-- ---------------------------------------------------------------------
-- Mismas franjas etarias etiquetadas de forma distinta según el año de origen.
UPDATE estadistica_delictiva SET grupo_edad = 'DE 18 ANOS Y MAS' WHERE grupo_edad = 'ADULTOS';
UPDATE estadistica_delictiva SET grupo_edad = 'DE 14 A 17 ANOS'  WHERE grupo_edad = 'ADOLESCENTES';
UPDATE estadistica_delictiva SET grupo_edad = 'DE 0 A 14 ANOS'   WHERE grupo_edad = 'MENORES';
UPDATE estadistica_delictiva SET grupo_edad = 'NO_REPORTADO'     WHERE grupo_edad = '' OR grupo_edad IS NULL;

-- ---------------------------------------------------------------------
-- 6. Homologación RN-03: delitos (variantes tipográficas del mismo tipo penal)
-- ---------------------------------------------------------------------
UPDATE estadistica_delictiva
SET delitos = 'ARTICULO 120. LESIONES CULPOSAS ( EN ACCIDENTE DE TRANSITO )'
WHERE delitos = 'ARTICULO 120 LESIONES CULPOSAS';

UPDATE estadistica_delictiva
SET delitos = 'ARTICULO 218. PORNOGRAFIA CON MENORES DE 14 ANOS'
WHERE delitos IN ('ARTICULO 218. PORNOGRAFIA CON DE 0 A 14 ANOS', 'ARTICULO 218. PORNOGRAFIA CON MENORES');

UPDATE estadistica_delictiva
SET delitos = 'ARTICULO 217. ESTIMULO A LA PROSTITUCION DE MENORES DE 14 ANOS'
WHERE delitos IN ('ARTICULO 217. ESTIMULO A LA PROSTITUCION DE DE 0 A 14 ANOS', 'ARTICULO 217. ESTIMULO A LA PROSTITUCION DE MENORES');

-- ---------------------------------------------------------------------
-- 7. Índices para sostener RNF-03 (<300ms) bajo filtros dinámicos
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_estadistica_codigo_dane ON estadistica_delictiva (codigo_dane);
CREATE INDEX IF NOT EXISTS idx_estadistica_dpto_codigo ON estadistica_delictiva (dpto_codigo);
CREATE INDEX IF NOT EXISTS idx_estadistica_anio_mes    ON estadistica_delictiva (anio, mes);
CREATE INDEX IF NOT EXISTS idx_estadistica_delitos     ON estadistica_delictiva (delitos);
CREATE INDEX IF NOT EXISTS idx_estadistica_genero      ON estadistica_delictiva (genero);

CREATE INDEX IF NOT EXISTS idx_municipios_geo_codigo_dane ON municipios_geo (codigo_dane);

COMMIT;

-- =====================================================================
-- Verificación post-migración (ejecutar manualmente para confirmar)
-- =====================================================================
-- SELECT count(*) FROM estadistica_delictiva e JOIN municipios_geo g
--   ON e.codigo_dane = g.codigo_dane;                    -- esperado: 4,836,248
-- SELECT genero, count(*) FROM estadistica_delictiva GROUP BY genero;
-- SELECT grupo_edad, count(*) FROM estadistica_delictiva GROUP BY grupo_edad;
-- SELECT count(DISTINCT delitos) FROM estadistica_delictiva;  -- esperado: 47 (50 - 3 fusiones)
