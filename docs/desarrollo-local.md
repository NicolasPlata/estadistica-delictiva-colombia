# Comandos de Desarrollo Local

Guía práctica para levantar el proyecto completo en una máquina nueva y para el día a día una vez configurado. Para el *por qué* de cada pieza (arquitectura, decisiones, performance) ver `antigravity.md` y los docs enlazados desde ahí — este documento es solo el *cómo*.

---

## Prerrequisitos

Versiones con las que este proyecto se desarrolló y probó (versiones cercanas deberían funcionar igual):

| Herramienta | Versión usada | Para qué |
|---|---|---|
| Rust (`rustc`/`cargo`) | 1.97.1 (edition 2024 requiere ≥1.85) | Backend |
| Node.js | 22.16.0 | Frontend |
| PostgreSQL | 16.14 | Base de datos |
| Extensión PostGIS | — | Geometría (`CREATE EXTENSION postgis`, ya cubierto por el script de migración) |
| Python 3 + pip | — | Solo si se necesita re-ejecutar el ETL desde los Excel crudos (no hace falta para el día a día) |

---

## 1. Configuración inicial (una sola vez)

```bash
cp .env.example .env
# Editar .env con credenciales reales de Postgres (DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME)

cp frontend/.env.example frontend/.env
# Solo necesario si el backend no corre en el default http://localhost:3000
```

`SERVER_PORT` (backend) y `VITE_API_BASE_URL` (frontend) son opcionales — los defaults (`3000` y `http://localhost:3000` respectivamente) ya calzan entre sí. `CORS_ALLOWED_ORIGIN` (backend) por defecto es `http://localhost:5173`, el puerto estándar de `vite dev` — si el frontend corre en otro puerto (ej. `vite preview` en `4173`), hay que exportarlo explícitamente al levantar el backend (ver sección 5).

---

## 2. Base de datos (una sola vez, o al recargar los datos desde cero)

Con Postgres corriendo y `.env` ya configurado:

```bash
# 2.1 — Crear la base de datos vacía (si no existe)
createdb estadistica_delictiva   # o: psql -c "CREATE DATABASE estadistica_delictiva;"

# 2.2 — ETL: limpiar los Excel crudos y cargar los datos (requiere Data/ con los .xlsx originales)
python3 -m venv venv && source venv/bin/activate
pip install pandas sqlalchemy psycopg2-binary python-dotenv unidecode openpyxl geopandas
python3 scripts/clean_data.py        # estandariza los Excel crudos
python3 scripts/migracion_db.py      # carga estadistica_delictiva
python3 scripts/migracion_shape.py   # carga municipios_geo (shapefile) + habilita PostGIS

# 2.3 — Migraciones correctivas (SIEMPRE después del paso 2.2, no están fusionadas en los scripts de ETL)
psql -d estadistica_delictiva -f scripts/migrations/0001_fix_codigo_dane_y_homologacion.sql
psql -d estadistica_delictiva -f scripts/migrations/0002_vista_materializada_rollup.sql
```

**Si el proyecto ya tiene una base de datos poblada** (ej. clonaste el repo pero la base de datos vive aparte), el paso 2 completo no es necesario — solo asegurar que `0001` y `0002` ya se aplicaron.

Detalle de causa raíz y verificación de cada script en `docs/plans/01-plan-estandarizacion-migracion.md` (secciones 4 y 5).

---

## 3. Backend (Rust)

```bash
cd backend
cargo test    # 78 tests — requiere Postgres corriendo y ya migrado (varios son de integración contra datos reales)
cargo run     # sirve en http://localhost:3000 — precalienta el caché de geometría al arrancar (~10-15s antes del primer log "Servidor escuchando")
```

Para producción: `cargo build --release` y correr el binario en `target/release/estadistica-delictiva-api` (así se ejecuta en todas las verificaciones de performance de `BACKLOG.md`/RNF-03 — `cargo run` sin `--release` es notablemente más lento).

---

## 4. Frontend (React + Vite)

```bash
cd frontend
npm install
npm test          # Vitest — 74 tests, no requiere backend ni Postgres (todo mockeado)
npm run lint       # oxlint
npm run dev        # http://localhost:5173, con hot reload
npm run build      # build de producción a dist/ (tsc -b + vite build)
npm run preview    # sirve el build de producción localmente, http://localhost:4173 — usar esto (no `dev`) para medir performance real
```

---

## 5. Levantar el stack completo

Orden: Postgres (ya corriendo como servicio) → backend → frontend.

```bash
# Terminal 1
cd backend && cargo run

# Terminal 2
cd frontend && npm run dev
```

Abrir `http://localhost:5173`. Si en cambio se quiere medir contra el build de producción (más representativo de TTV/bundle real, ver `BACKLOG.md` Fase 5):

```bash
# Terminal 1
cd backend && CORS_ALLOWED_ORIGIN=http://localhost:4173 cargo run --release

# Terminal 2
cd frontend && npm run build && npm run preview
```

(El `CORS_ALLOWED_ORIGIN` explícito es necesario porque `vite preview` sirve en el puerto `4173`, distinto del default `5173` que el backend asume.)

---

## Referencia rápida

| Quiero... | Comando |
|---|---|
| Correr los tests del backend | `cd backend && cargo test` |
| Correr los tests del frontend | `cd frontend && npm test` |
| Levantar el backend en dev | `cd backend && cargo run` |
| Levantar el frontend en dev | `cd frontend && npm run dev` |
| Verificar tipos del frontend | `cd frontend && npx tsc -b` |
| Lint del frontend | `cd frontend && npm run lint` |
| Build de producción del frontend | `cd frontend && npm run build` |
| Refrescar la vista materializada tras recargar datos | `psql -d estadistica_delictiva -c "REFRESH MATERIALIZED VIEW estadistica_rollup;"` |
