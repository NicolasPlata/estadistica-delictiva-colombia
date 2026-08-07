import type { CategoriaCantidad } from "../../shared/api/types";

/** Orden fijo (Fase 7) — igual que `ORDEN_GENERO` en `formatKpis.ts`, el
 * color categórico sigue siempre a la misma entidad, nunca a su posición
 * en la respuesta del backend. Debe calzar 1:1 con `CATEGORIA_COLORS` en
 * `RegionBreakdownPanel.tsx`. */
export const CATEGORIAS_ORDEN = [
  "Delitos contra el Patrimonio Económico",
  "Delitos contra la Vida e Integridad Personal",
  "Delitos Sexuales",
  "Amenazas",
  "Violencia Intrafamiliar",
  "Extorsión",
  "Secuestro",
  "Terrorismo",
] as const;

export interface CategoriaDonutPoint {
  name: string;
  value: number;
  pct: number;
}

/** Solo incluye categorías presentes en la respuesta (una región puede no
 * tener ninguna categoría poco común, ej. sin terrorismo registrado). */
export function buildCategoriaDonutData(porCategoria: CategoriaCantidad[]): CategoriaDonutPoint[] {
  const total = porCategoria.reduce((sum, c) => sum + c.cantidad, 0);
  const byName = new Map(porCategoria.map((c) => [c.categoria, c.cantidad]));

  return CATEGORIAS_ORDEN.filter((categoria) => byName.has(categoria)).map((categoria) => {
    const value = byName.get(categoria)!;
    return { name: categoria, value, pct: total > 0 ? (value / total) * 100 : 0 };
  });
}
