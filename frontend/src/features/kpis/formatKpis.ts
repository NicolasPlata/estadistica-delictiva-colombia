import type { Genero } from "../../shared/api/types";

export interface VariacionFormateada {
  text: string;
  tone: "good" | "critical" | "neutral";
}

/** Más delitos que el periodo anterior es una mala noticia (tone
 * `critical`, reutiliza la paleta de estado) — menos es `good`. La
 * convención de +100% cuando no hay periodo anterior con datos (ver
 * `docs/plans/02-...` Hito 3.1) se formatea igual que cualquier aumento,
 * a propósito: sigue siendo un aumento desde la perspectiva del usuario. */
export function formatVariacion(pct: number): VariacionFormateada {
  const sign = pct > 0 ? "+" : "";
  const tone = pct > 0 ? "critical" : pct < 0 ? "good" : "neutral";
  return { text: `${sign}${pct.toFixed(1)}%`, tone };
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** `mes_mayor_impacto` llega como `"YYYY-MM"` — se evita `Intl`/`Date` para
 * no depender de que el runtime tenga datos ICU completos para `es-CO`. */
export function formatMesMayorImpacto(mes: string | null): string {
  if (!mes) return "Sin datos";
  const [anio, mesNumero] = mes.split("-");
  return `${MESES[Number(mesNumero) - 1]} ${anio}`;
}

const ETIQUETAS_GENERO: Record<Genero, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  NO_REPORTADO: "No reportado",
};

/** Orden fijo (no el de iteración de `Object.entries`, que depende del
 * JSON de origen) — necesario para que el color categórico siga siempre a
 * la misma entidad, nunca a su posición en la respuesta. */
const ORDEN_GENERO: Genero[] = ["MASCULINO", "FEMENINO", "NO_REPORTADO"];

export function buildGeneroDonutData(
  distribucion: Partial<Record<Genero, number>>,
): { name: string; value: number }[] {
  return ORDEN_GENERO.filter((genero) => distribucion[genero] !== undefined).map((genero) => ({
    name: ETIQUETAS_GENERO[genero],
    value: distribucion[genero]!,
  }));
}
