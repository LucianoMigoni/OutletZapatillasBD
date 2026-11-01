import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

// Solo deja pasar a usuarios autenticados y si no, vuelve al login
export default function ProtectedRoute() {
  const { isAuth, loading } = useAuth();
  if (loading) return <Spinner />;
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}
