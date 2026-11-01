import { API_BASE_URL } from "../config";

const TOKEN_KEY = "outlet.token";

// Evento que se dispara cuando el backend rechaza el token (sesión vencida)
export const SESION_EXPIRADA = "outlet:sesion-expirada";

export const tokenStorage = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Arma "?anio=2026&mes=9" salteando los parámetros vacíos
function queryString(params) {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "")
      query.set(key, value);
  }
  const texto = query.toString();
  return texto ? `?${texto}` : "";
}

async function fetchBackend(url, method, body) {
  const headers = { "Content-Type": "application/json" };
  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Intentá de nuevo en unos minutos.",
      0,
    );
  }

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

// Envuelve fetch: agrega el token JWT y traduce los errores del backend a mensajes legibles
export async function request(path, { method = "GET", body, params } = {}) {
  const url = `${path}${queryString(params)}`;
  const { status, data } = await fetchBackend(url, method, body);

  if (status >= 200 && status < 300) return data;

  // En el tablero un 401 significa que el token venció: se cierra la sesión
  const esAuth = path.startsWith("/auth/");
  if (status === 401 && !esAuth)
    window.dispatchEvent(new Event(SESION_EXPIRADA));

  const message =
    data?.message ||
    data?.title ||
    (status === 401
      ? esAuth
        ? "Email o contraseña incorrectos."
        : "Tu sesión expiró. Volvé a iniciar sesión."
      : "Ocurrió un error inesperado.");
  throw new ApiError(message, status);
}
