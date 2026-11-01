import { request } from "./http";

// Endpoints del tablero. El formato de cada respuesta está en docs/contrato-api.md

// GET /api/tablero/catalogos -> { fechaReferencia, periodos, sucursales, marcas }
export const getCatalogos = () => request("/tablero/catalogos");

// GET /api/tablero/resumen?anio&mes&idSucursal -> { kpis, sucursales, stock, clientes, ventasPorDia }
export const getResumen = ({ anio, mes, idSucursal }) =>
  request("/tablero/resumen", { params: { anio, mes, idSucursal } });

// Drill down de ventas: nivel 1 (sucursales)
export const getVentasPorSucursal = ({ anio, mes }) =>
  request("/ventas/sucursales", { params: { anio, mes } });

// Nivel 2: marcas de una sucursal
export const getVentasPorMarca = (idSucursal, { anio, mes }) =>
  request(`/ventas/sucursales/${idSucursal}/marcas`, {
    params: { anio, mes },
  });

// Nivel 3: modelos de una marca en una sucursal
export const getVentasPorModelo = (idSucursal, idMarca, { anio, mes }) =>
  request(`/ventas/sucursales/${idSucursal}/marcas/${idMarca}/modelos`, {
    params: { anio, mes },
  });

// Nivel 4: líneas de venta de un modelo en una sucursal
export const getDetalleModelo = (idSucursal, idProducto, params) =>
  request(`/ventas/sucursales/${idSucursal}/productos/${idProducto}`, {
    params,
  });

// GET /api/stock?busqueda&idSucursal&idMarca&estado&pagina&porPagina
export const getStock = (params) => request("/stock", { params });

// GET /api/clientes?busqueda&idSucursal&estado&pagina&porPagina
export const getClientes = (params) => request("/clientes", { params });

// GET /api/ventas?desde&hasta&idSucursal&medioPago&busqueda&orden&pagina&porPagina
export const getVentas = (params) => request("/ventas", { params });
