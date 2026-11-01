import { request } from "./http";

// POST /api/auth/login { email, password } -> 200 { token, usuario }
export const loginRequest = (credentials) =>
  request("/auth/login", { method: "POST", body: credentials });

// POST /api/auth/register { nombre, apellido, email, password } -> 201 { token, usuario }
export const registerRequest = (data) =>
  request("/auth/register", { method: "POST", body: data });

// GET /api/auth/me (Authorization: Bearer <token>) -> 200 usuario
export const meRequest = () => request("/auth/me");

// usuario = { id, nombre, apellido, email, rol }
