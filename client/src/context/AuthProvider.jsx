import { useCallback, useEffect, useMemo, useState } from "react";
import { loginRequest, meRequest, registerRequest } from "../api/auth";
import { SESION_EXPIRADA, tokenStorage } from "../api/http";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Solo hay que esperar la verificación si quedó un token guardado
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  // Al recargar la página se valida el token guardado contra el backend
  useEffect(() => {
    if (!tokenStorage.get()) return;
    meRequest()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const startSession = ({ token, usuario }) => {
    tokenStorage.set(token);
    setUser(usuario);
  };

  const login = useCallback(
    async (credentials) => startSession(await loginRequest(credentials)),
    [],
  );
  const register = useCallback(
    async (data) => startSession(await registerRequest(data)),
    [],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // Si el backend rechaza el token mientras se usa el tablero, se vuelve al login
  useEffect(() => {
    window.addEventListener(SESION_EXPIRADA, logout);
    return () => window.removeEventListener(SESION_EXPIRADA, logout);
  }, [logout]);

  const value = useMemo(
    () => ({ user, isAuth: Boolean(user), loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
