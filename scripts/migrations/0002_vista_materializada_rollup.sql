-- =====================================================================
-- Migración 0002: Vista materializada de rollup para agregaciones
-- =====================================================================
-- Contexto: profiling de la Fase 5 del backend (Hito 5.2) midió los
-- endpoints /api/v1/stats/kpi y /api/v1/metadata/filtros contra datos
-- reales y encontró violaciones de RNF-03 (<300ms):
--   - POST /api/v1/stats/kpi (sin filtros): ~1.2s (5 queries secuenciales,
--     cada una un full scan de las 4,836,275 filas de estadistica_delictiva)
--   - EXPLAIN ANALYZE de una sola de esas queries (delito_mas_comun):
--     394ms de Execution Time — un índice B-Tree no ayuda aquí porque es
--     una agregación sin filtro (WHERE 1=1): se necesita tocar cada fila
--     sin importar qué índices existan.
-- Esto es exactamente el escenario que docs/plans/02-plan-desarrollo-backend.md
-- (Hito 3.1) ya anticipaba: "evaluar una vista materializada de rollup...
-- en vez de escanear siempre estadistica_delictiva".
--
-- Validado antes de construir: agrupar por todas las dimensiones que
-- GlobalFilters puede filtrar (anio, mes, codigo_dane, delitos, genero,
-- grupo_edad, arma_medio) reduce de 4,836,275 a 899,265 filas (~5.4x).
--
-- IMPORTANTE — esta vista NO se actualiza sola: si se vuelve a ejecutar el
-- ETL (migracion_db.py) o la migración correctiva 0001, hay que correr
-- `REFRESH MATERIALIZED VIEW estadistica_rollup;` después. No se configuró
-- refresco automático (triggers/cron) porque el dataset de este proyecto
-- es esencialmente estático entre corridas del ETL — agregar ese
-- mecanismo sería complejidad sin beneficio real en este contexto.
-- =====================================================================

BEGIN;

CREATE MATERIALIZED VIEW estadistica_rollup AS
SELECT
    anio,
    mes,
    codigo_dane,
    codigo_dane / 1000 AS dpto_codigo,
    delitos,
    genero,
    grupo_edad,
    arma_medio,
    SUM(cantidad) AS cantidad
FROM estadistica_delictiva
GROUP BY anio, mes, codigo_dane, delitos, genero, grupo_edad, arma_medio;

-- Mismos índices que ya existían en estadistica_delictiva, para que las
-- consultas dinámicas (WHERE con combinaciones de filtros) sigan
-- beneficiándose de ellos sobre la vista, no solo del rollup en sí.
CREATE INDEX idx_rollup_codigo_dane ON estadistica_rollup (codigo_dane);
CREATE INDEX idx_rollup_dpto_codigo ON estadistica_rollup (dpto_codigo);
CREATE INDEX idx_rollup_anio_mes    ON estadistica_rollup (anio, mes);
CREATE INDEX idx_rollup_delitos     ON estadistica_rollup (delitos);
CREATE INDEX idx_rollup_genero      ON estadistica_rollup (genero);

-- Verificación defensiva: el rollup debe sumar exactamente lo mismo que
-- la tabla original (ninguna fila perdida en la agregación).
DO $$
DECLARE
    total_original BIGINT;
    total_rollup BIGINT;
BEGIN
    SELECT SUM(cantidad) INTO total_original FROM estadistica_delictiva;
    SELECT SUM(cantidad) INTO total_rollup FROM estadistica_rollup;
    IF total_original != total_rollup THEN
        RAISE EXCEPTION 'Inconsistencia en el rollup: original=% rollup=%', total_original, total_rollup;
    END IF;
END $$;

COMMIT;

-- Para refrescar tras un nuevo ETL:
-- REFRESH MATERIALIZED VIEW estadistica_rollup;
