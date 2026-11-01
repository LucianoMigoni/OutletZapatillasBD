// Datos generales de la aplicación
export const APP_NAME = "Outlet de Zapatillas";

// Prefijo de la API. En desarrollo Vite lo redirige al backend (se puede ver en vite.config.js)
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Límites de los formularios: son los mismos que valida el backend (AuthController.cs)
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;
export const NAME_MAX_LENGTH = 60;
export const EMAIL_MAX_LENGTH = 120;

// Filas por página de las tablas del tablero
export const FILAS_POR_PAGINA = 10;
export const LINEAS_POR_PAGINA = 8;
