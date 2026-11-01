import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TableroProvider } from "../context/TableroProvider";
import { APP_NAME } from "../config";
import { iniciales } from "../utils/format";
import Icon from "./Icon";
import Logo from "./Logo";

const SECCIONES = [
  { to: "/resumen", label: "Resumen", icono: "resumen" },
  { to: "/ventas", label: "Ventas por sucursal", icono: "sucursal" },
  { to: "/stock", label: "Stock", icono: "stock" },
  { to: "/clientes", label: "Clientes", icono: "clientes" },
  { to: "/detalle-ventas", label: "Detalle de ventas", icono: "ventas" },
];

// Estructura de todas las pantallas del tablero: barra lateral con las secciones y el usuario
export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-contenido">
          <div className="sidebar-brand">
            <Logo size={34} />
            <span>{APP_NAME}</span>
          </div>

          <nav className="sidebar-nav" aria-label="Secciones del tablero">
            <p className="sidebar-titulo">Tablero</p>
            {SECCIONES.map((s) => (
              <NavLink key={s.to} to={s.to} className="sidebar-link">
                <Icon name={s.icono} />
                <span>{s.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-user">
            <div className="avatar" aria-hidden="true">
              {iniciales(user.nombre, user.apellido)}
            </div>
            <div className="sidebar-user-info">
              <strong>
                {user.nombre} {user.apellido}
              </strong>
              <span>{user.email}</span>
            </div>
            <button
              type="button"
              className="btn-icono"
              onClick={logout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <Icon name="salir" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <TableroProvider>
          <Outlet />
        </TableroProvider>
      </main>
    </div>
  );
}
