import os
import glob
import pandas as pd
from sqlalchemy import create_engine
from unidecode import unidecode
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

DB_USER = os.getenv('DB_USER', 'postgres').strip().strip("'").strip('"')
DB_PASS = os.getenv('DB_PASS', '').strip().strip("'").strip('"')
DB_HOST = os.getenv('DB_HOST', 'localhost').strip().strip("'").strip('"')
DB_PORT = os.getenv('DB_PORT', '5432').strip().strip("'").strip('"')
DB_NAME = os.getenv('DB_NAME', 'estadistica_delictiva').strip().strip("'").strip('"')

# Crear conexión a la base de datos
db_url = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(db_url)

def limpiar_texto(texto):
    if pd.isna(texto):
        return texto
    # Convertir a string, quitar tildes, mayúsculas, y espacios a los lados
    return unidecode(str(texto)).strip().upper()

def procesar_y_migrar():
    archivos = sorted(glob.glob('Data/*.xlsx'))
    
    for archivo in archivos:
        print(f"Procesando {archivo}...")
        
        # Extraer año del nombre del archivo
        anio = os.path.basename(archivo).replace('.xlsx', '')
        
        # Leer excel
        df = pd.read_excel(archivo)
        
        # Estandarizar nombres de columnas
        columnas = []
        for col in df.columns:
            c = unidecode(str(col)).strip().upper()
            if c == 'ARMA MEDIO' or c == 'ARMAS MEDIOS':
                c = 'ARMA_MEDIO'
            elif c == '*AGRUPA EDAD PERSONA*':
                c = 'GRUPO_EDAD'
            c = c.replace(' ', '_').lower()
            columnas.append(c)
        df.columns = columnas
        
        # Agregar columna del año si no existe (la sacamos del archivo)
        df['anio'] = int(anio)
        
        # Eliminar filas basuras (ej. pie de página con fuentes)
        df = df.dropna(subset=['departamento', 'codigo_dane'], how='all')
        
        # Limpiar valores en columnas de texto
        columnas_texto = ['departamento', 'municipio', 'arma_medio', 'genero', 'grupo_edad', 'delitos', 'mes']
        for col in columnas_texto:
            if col in df.columns:
                df[col] = df[col].apply(limpiar_texto)
        
        # Asegurar formato de codigo_dane
        if 'codigo_dane' in df.columns:
            # A veces viene como flotante ej 11001.0, quitamos el decimal
            df['codigo_dane'] = df['codigo_dane'].apply(lambda x: str(int(x)) if pd.notna(x) and str(x).endswith('.0') else str(x) if pd.notna(x) else None)
            df['codigo_dane'] = df['codigo_dane'].apply(lambda x: x.strip() if pd.notna(x) else x)
        
        # Limpiar fecha
        if 'fecha_hecho' in df.columns:
            df['fecha_hecho'] = pd.to_datetime(df['fecha_hecho'], errors='coerce', dayfirst=True).dt.date
            
        # Asegurar que cantidad es numerico
        if 'cantidad' in df.columns:
            df['cantidad'] = pd.to_numeric(df['cantidad'], errors='coerce').fillna(0).astype(int)

        print(f"Insertando {len(df)} registros de {archivo} en la base de datos...")
        
        # Insertar a postgres en chunks
        df.to_sql('estadistica_delictiva', con=engine, if_exists='append', index=False, method='multi', chunksize=5000)
        
        print(f"Éxito: {archivo} migrado correctamente.\n")

if __name__ == '__main__':
    try:
        procesar_y_migrar()
        print("Migración completada con éxito.")
    except Exception as e:
        print(f"Error durante la migración: {e}")
