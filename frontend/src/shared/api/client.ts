/**
 * Base URL del backend — configurable vía `VITE_API_BASE_URL` (ver
 * `.env.example`), con el puerto default del backend en desarrollo local
 * como fallback para que `npm run dev` funcione sin configuración extra.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** `fetch` con manejo de error uniforme — nunca deja pasar un body
 * malformado o un status de error como si fuera una respuesta válida. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `La API respondió ${response.status} en ${path}`,
    );
  }

  return response.json() as Promise<T>;
}
