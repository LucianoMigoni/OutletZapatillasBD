import { createContext, useContext } from "react";

// Contexto de la sesión. Guarda el usuario y las funciones de sesion
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
}
