import { useState } from "react";
import { getVentas } from "../api/tablero";
import { useApi } from "../hooks/useApi";
import { useTablero } from "../context/TableroContext";
import { FILAS_POR_PAGINA } from "../config";
import { Cargando, ErrorCarga, SinDatos } from "../components/EstadoCarga";
import { Buscador, FiltroFecha, FiltroSelect } from "../components/Filtros";
import Icon from "../components/Icon";
import Paginacion from "../components/Paginacion";
import { Card, PageHeader } from "../components/Tablero";
import {
  MEDIOS_PAGO,
  formatFechaHora,
  formatMoneda,
  formatNumero,
  rangoDelMes,
} from "../utils/format";

// Encabezado de columna que ordena la tabla (primer clic: de mayor a menor)
function ColumnaOrdenable({ campo, orden, onOrdenar, children, className }) {
  const activo = orden.startsWith(campo);
  const descendente = orden === `${campo}_desc`;
  return (
    <th
      className={className}
      aria-sort={activo ? (descendente ? "descending" : "ascending") : "none"}
    >
      <button
        type="button"
        className="tabla-th-boton"
        onClick={() => onOrdenar(activo && descendente ? `${campo}_asc` : `${campo}_desc`)}
      >
        {children}
        {activo && <Icon name={descendente ? "ordenAbajo" : "ordenArriba"} size={14} />}
      </button>
    </th>
  );
}

export default function DetalleVentasPage() {
  const { periodo, sucursales } = useTablero();
  // Por defecto se muestran las ventas del mes elegido en el tablero
  const filtrosIniciales = { busqueda: "", ...rangoDelMes(periodo), idSucursal: "", medioPago: "" };
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [orden, setOrden] = useState("fecha_desc");
  const [pagina, setPagina] = useState(1);

  const { data, error, loading, recargar } = useApi(
    () => getVentas({ ...filtros, orden, pagina, porPagina: FILAS_POR_PAGINA }),
    [filtros, orden, pagina],
  );

  const cambiar = (campo) => (valor) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPagina(1);
  };
  const ordenar = (nuevo) => {
    setOrden(nuevo);
    setPagina(1);
  };
  const limpiar = () => {
    setFiltros(filtrosIniciales);
    setOrden("fecha_desc");
    setPagina(1);
  };

  return (
    <div className="pagina">
      <PageHeader
        titulo="Detalle de ventas"
        subtitulo="Todas las ventas registradas en las sucursales"
      />

      <Card>
        <div className="filtros">
          <Buscador
            label="Buscar"
            placeholder="N° de venta o cliente"
            valor={filtros.busqueda}
            onBuscar={cambiar("busqueda")}
          />
          <FiltroFecha
            label="Desde"
            valor={filtros.desde}
            max={filtros.hasta || undefined}
            onCambiar={cambiar("desde")}
          />
          <FiltroFecha
            label="Hasta"
            valor={filtros.hasta}
            min={filtros.desde || undefined}
            onCambiar={cambiar("hasta")}
          />
          <FiltroSelect
            label="Sucursal"
            valor={filtros.idSucursal}
            onCambiar={cambiar("idSucursal")}
            todos="Todas las sucursales"
            opciones={sucursales.map((s) => ({ valor: String(s.id), texto: s.nombre }))}
          />
          <FiltroSelect
            label="Medio de pago"
            valor={filtros.medioPago}
            onCambiar={cambiar("medioPago")}
            todos="Todos"
            opciones={Object.entries(MEDIOS_PAGO).map(([valor, texto]) => ({ valor, texto }))}
          />
          <button type="button" className="btn-secondary btn-limpiar" onClick={limpiar}>
            Limpiar filtros
          </button>
        </div>
      </Card>

      {!data ? (
        error ? (
          <ErrorCarga error={error} onReintentar={recargar} />
        ) : (
          <Cargando />
        )
      ) : (
        <Card className={loading ? "recargando" : ""}>
          {data.total === 0 ? (
            <SinDatos texto="No hay ventas que coincidan con los filtros." />
          ) : (
            <>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>N° venta</th>
                      <ColumnaOrdenable campo="fecha" orden={orden} onOrdenar={ordenar}>
                        Fecha
                      </ColumnaOrdenable>
                      <th>Sucursal</th>
                      <th>Cliente</th>
                      <th>Productos</th>
                      <th className="num">Pares</th>
                      <th>Medio de pago</th>
                      <ColumnaOrdenable
                        campo="total"
                        orden={orden}
                        onOrdenar={ordenar}
                        className="num"
                      >
                        Total
                      </ColumnaOrdenable>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((v) => (
                      <tr key={v.id}>
                        <td className="mono">{v.numero}</td>
                        <td className="nowrap">{formatFechaHora(v.fecha)}</td>
                        <td>{v.sucursal}</td>
                        <td>{v.cliente}</td>
                        <td className="muted">
                          {v.producto}
                          {v.otrosProductos > 0 && ` + ${v.otrosProductos}`}
                        </td>
                        <td className="num">{formatNumero(v.pares)}</td>
                        <td>
                          <span className="etiqueta">
                            {MEDIOS_PAGO[v.medioPago] ?? v.medioPago}
                          </span>
                        </td>
                        <td className="num">{formatMoneda(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="totales">
                <span>
                  Ventas filtradas <strong>{formatNumero(data.totales.ventas)}</strong>
                </span>
                <span>
                  Pares <strong>{formatNumero(data.totales.pares)}</strong>
                </span>
                <span>
                  Importe total <strong>{formatMoneda(data.totales.importe)}</strong>
                </span>
                <span>
                  Ticket promedio{" "}
                  <strong>
                    {formatMoneda(
                      data.totales.ventas ? data.totales.importe / data.totales.ventas : 0,
                    )}
                  </strong>
                </span>
              </div>
              <Paginacion
                pagina={data.pagina}
                porPagina={data.porPagina}
                total={data.total}
                onCambiar={setPagina}
                detalle={`Filas por página: ${data.porPagina}`}
                numeros
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
