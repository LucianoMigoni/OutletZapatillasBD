import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResumenPage from "./pages/ResumenPage";
import VentasSucursalesPage from "./pages/ventas/VentasSucursalesPage";
import VentasMarcasPage from "./pages/ventas/VentasMarcasPage";
import VentasModelosPage from "./pages/ventas/VentasModelosPage";
import VentasDetallePage from "./pages/ventas/VentasDetallePage";
import StockPage from "./pages/StockPage";
import ClientesPage from "./pages/ClientesPage";
import DetalleVentasPage from "./pages/DetalleVentasPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/resumen" element={<ResumenPage />} />

              {/* Drill down */}
              <Route path="/ventas" element={<VentasSucursalesPage />} />
              <Route
                path="/ventas/:idSucursal"
                element={<VentasMarcasPage />}
              />
              <Route
                path="/ventas/:idSucursal/:idMarca"
                element={<VentasModelosPage />}
              />
              <Route
                path="/ventas/:idSucursal/:idMarca/:idProducto"
                element={<VentasDetallePage />}
              />

              <Route path="/stock" element={<StockPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/detalle-ventas" element={<DetalleVentasPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/resumen" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
