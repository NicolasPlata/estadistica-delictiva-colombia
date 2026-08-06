import os
import geopandas as gpd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = f"postgresql+psycopg2://{os.getenv('DB_USER')}:{os.getenv('DB_PASS')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
engine = create_engine(db_url)

print("Habilitando PostGIS (si no existe)...")
with engine.begin() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))

print("Leyendo shapefile...")
shape_path = "Data/Municipios/MGN_ADM_MPIO_GRAFICO.shp"
gdf = gpd.read_file(shape_path)

print("SRID original:", gdf.crs)
if gdf.crs is None or gdf.crs.to_epsg() != 4326:
    print("Reproyectando a EPSG:4326...")
    gdf = gdf.to_crs(epsg=4326)

print("Seleccionando y renombrando columnas...")
# Mapear los nombres de las columnas que mencionó el usuario
# Asegurarse de que las columnas están presentes en mayúsculas o minúsculas.
cols_lower = {col.lower(): col for col in gdf.columns}

# Extraemos con get para no fallar si cambian ligeramente el nombre
dpto_ccdgo = cols_lower.get('dpto_ccdgo')
mpio_ccdgo = cols_lower.get('mpio_ccdgo')
dpto_cnmbr = cols_lower.get('dpto_cnmbr')
mpio_cnmbr = cols_lower.get('mpio_cnmbr')

# Crear el nuevo GeoDataFrame
gdf_clean = gpd.GeoDataFrame()
gdf_clean['codigo_dane'] = gdf[mpio_ccdgo].astype(int)
gdf_clean['dpto_codigo'] = gdf[dpto_ccdgo].astype(int)
gdf_clean['departamento'] = gdf[dpto_cnmbr].astype(str)
gdf_clean['municipio'] = gdf[mpio_cnmbr].astype(str)
gdf_clean['geom'] = gdf['geometry']

# A veces los geometrías son Polygons y otras MultiPolygons, 
# forzamos todo a MultiPolygon para evitar errores de tipo en PostGIS
from shapely.geometry import MultiPolygon
def force_multipolygon(geom):
    if geom.geom_type == 'Polygon':
        return MultiPolygon([geom])
    return geom

gdf_clean['geom'] = gdf_clean['geom'].apply(force_multipolygon)
gdf_clean = gdf_clean.set_geometry('geom')

print("Subiendo a PostgreSQL...")
gdf_clean.to_postgis(
    name="municipios_geo",
    con=engine,
    if_exists="replace",
    index=False,
    dtype={"geom": "Geometry"} # GeoAlchemy2 se encarga
)

print("¡Carga exitosa! Creando clave primaria...")
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE municipios_geo ADD COLUMN id SERIAL PRIMARY KEY;"))

print("Migración del shapefile terminada.")
