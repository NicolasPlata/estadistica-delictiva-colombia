/**
 * Tipos que reflejan docs/architecture/02-api-contracts.md — deben
 * mantenerse en sincronía con ese documento (y con los structs de dominio
 * del backend en backend/src/domain/).
 */

export type Genero = "MASCULINO" | "FEMENINO" | "NO_REPORTADO";

/** GlobalFilters — §1. Todos los campos son opcionales (sin filtrar). */
export interface GlobalFilters {
  anio_inicio?: number;
  anio_fin?: number;
  departamento_id?: number;
  municipio_id?: number;
  delitos?: string[];
  genero?: Genero;
  grupo_edad?: string;
  arma_medio?: string;
}

/** Respuesta de GET /api/v1/metadata/filtros — §4.1 */
export interface FiltrosVocabulario {
  delitos: string[];
  armas_medios: string[];
  generos: Genero[];
  grupos_edad: string[];
}

/** Respuesta de POST /api/v1/stats/kpi — §2.1 */
export interface Kpis {
  total_delitos: number;
  variacion_porcentual: number;
  delito_mas_comun: string | null;
  mes_mayor_impacto: string | null;
  distribucion_genero: Record<string, number>;
}

export type Agrupacion = "ANUAL" | "MENSUAL";

export interface EvolutionPoint {
  periodo: string;
  cantidad: number;
}

/** Respuesta de POST /api/v1/stats/evolution — §2.2 */
export interface Evolution {
  region_label: string;
  series: EvolutionPoint[];
}

export type Granularidad = "DEPARTAMENTO" | "MUNICIPIO";

/** Unidad de `MapStats.data` (Fase 6) — `ABSOLUTA` es el conteo de
 * delitos tal cual (default, sin cambios de contrato previos); `TASA` es
 * delitos por cada 100.000 habitantes (RN-12 de `reglas-negocio.md`). */
export type Metrica = "ABSOLUTA" | "TASA";

/** Respuesta de POST /api/v1/map/stats — §3.2. Claves sin ceros a la
 * izquierda (código de depto o de municipio según granularidad). El valor
 * es un conteo entero o una tasa decimal según la `metrica` pedida. */
export interface MapStats {
  granularidad: Granularidad;
  data: Record<string, number>;
}

/** Tema de la aplicación (RNF-04: Dark es el default). */
export type Theme = "dark" | "light";

/** Mapa base (RF-10, HU-1.05). */
export type Basemap = "osm" | "satelital" | "oscuro";
