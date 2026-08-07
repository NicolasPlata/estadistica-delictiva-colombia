import type { Agrupacion } from "../../shared/api/types";

const MESES_ABREVIADOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/** ANUAL ya llega como el año solo (`"2020"`); MENSUAL llega como
 * `"YYYY-MM"` y se abrevia para que quepan hasta 72 puntos (6 años) en el
 * eje X sin solaparse. */
export function formatPeriodo(periodo: string, agrupacion: Agrupacion): string {
  if (agrupacion === "ANUAL") return periodo;

  const [anio, mesNumero] = periodo.split("-");
  return `${MESES_ABREVIADOS[Number(mesNumero) - 1]} ${anio}`;
}
