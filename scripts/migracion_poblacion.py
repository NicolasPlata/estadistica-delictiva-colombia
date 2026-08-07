import os

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Cargar variables de entorno
load_dotenv()

DB_USER = os.getenv('DB_USER', 'postgres').strip().strip("'").strip('"')
DB_PASS = os.getenv('DB_PASS', '').strip().strip("'").strip('"')
DB_HOST = os.getenv('DB_HOST', 'localhost').strip().strip("'").strip('"')
DB_PORT = os.getenv('DB_PORT', '5432').strip().strip("'").strip('"')
DB_NAME = os.getenv('DB_NAME', 'estadistica_delictiva').strip().strip("'").strip('"')

db_url = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(db_url)

ARCHIVO = 'Data/Población/Población.xlsx'
HOJA = 'PobMunicipalxÁrea'


def procesar_y_migrar():
    print(f"Leyendo {ARCHIVO} (hoja '{HOJA}')...")
    # Las otras 2 hojas del workbook (Índice, PPED) son portadas sin datos
    # tabulares — ver docs/plans/04-plan-desarrollo-funcionalidades-v2.md
    # Fase 6, "Hallazgos de la exploración del archivo fuente".
    df = pd.read_excel(ARCHIVO, sheet_name=HOJA)

    # Solo interesa el total por municipio/año — no se ingiere el desglose
    # Cabecera Municipal / Centros Poblados y Rural Disperso (RN-11, ver
    # reglas-negocio.md): la app no tiene ningún caso de uso que pida ese
    # desglose, y traerlo sería complejidad sin beneficio (YAGNI).
    df = df[df['ÁREA GEOGRÁFICA'] == 'Total'].copy()

    df = df.rename(columns={'MPIO': 'codigo_dane', 'AÑO': 'anio', 'TOTAL': 'poblacion'})
    df['codigo_dane'] = df['codigo_dane'].astype(int)
    df['anio'] = df['anio'].astype(int)
    df['poblacion'] = df['poblacion'].astype(int)
    df = df[['codigo_dane', 'anio', 'poblacion']]

    # Validaciones defensivas — fallar ruidosamente en vez de cargar datos
    # silenciosamente inconsistentes (mismo criterio que las verificaciones
    # DO $$ ... RAISE EXCEPTION de scripts/migrations/0001 y 0002).
    duplicados = df.duplicated(subset=['codigo_dane', 'anio']).sum()
    if duplicados > 0:
        raise ValueError(
            f"Se esperaba una única fila 'Total' por (codigo_dane, anio); "
            f"se encontraron {duplicados} duplicados."
        )
    if df['poblacion'].isna().any() or (df['poblacion'] < 0).any():
        raise ValueError("Se encontraron valores de población nulos o negativos.")
    # Nota: 0 SÍ es un valor legítimo del DANE, no se rechaza — investigado
    # a mano (2026-08-07, ver scripts/migrations/0003_...): 29 filas en 2
    # municipios, ambas explicables — 27493 "Nuevo Belén de Bajirá" (Chocó)
    # reporta 0 en 2018-2023 (municipio segregado de Mutatá recientemente,
    # sin población propia hasta 2024) y 94663 "Mapiripana (ANM)" (Guainía)
    # reporta 0 desde 2020 (es el mismo codigo_dane ya documentado en
    # scripts/migrations/0001 como "sin equivalente real en el shapefile").
    # RN-12 (reglas-negocio.md) trata 0 igual que "sin fila": no se calcula
    # tasa para ese codigo_dane/año, nunca se divide por cero.

    print(f"Insertando {len(df)} filas (municipios × años, área='Total') en poblacion_municipal...")
    df.to_sql('poblacion_municipal', con=engine, if_exists='replace', index=False, method='multi', chunksize=5000)

    print(f"Municipios distintos: {df['codigo_dane'].nunique()}")
    print(f"Rango de años: {df['anio'].min()}-{df['anio'].max()}")
    print("Éxito: población migrada correctamente.")
    print("Siguiente paso: correr scripts/migrations/0003_poblacion_indices_y_validacion.sql")


if __name__ == '__main__':
    try:
        procesar_y_migrar()
    except Exception as e:
        print(f"Error durante la migración: {e}")
        raise
