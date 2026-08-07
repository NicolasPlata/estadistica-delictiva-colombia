import type { Genero } from "../../shared/api/types";

export interface VariacionFormateada {
  text: string;
  tone: "good" | "critical" | "neutral";
}

/** Más delitos que el periodo anterior es una mala noticia (tone
 * `critical`, reutiliza la paleta de estado) — menos es `good`.
 * `pct === null` (corrección 2026-08-07, reportado por el usuario): el
 * backend ya no inventa un +100% cuando el "periodo anterior" cae fuera
 * del rango real del dataset (ej. "todos los años" o solo el primer año)
 * — no hay nada real que comparar, así que se muestra un mensaje neutral
 * en vez de una cifra que parecería una comparación real. */
export function formatVariacion(pct: number | null): VariacionFormateada {
  if (pct === null) {
    return { text: "Sin periodo anterior para comparar", tone: "neutral" };
  }
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
