import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getClientes } from "../api/tablero";
import { useApi } from "../hooks/useApi";
import { useTablero } from "../context/TableroContext";
import { FILAS_POR_PAGINA } from "../config";
import { Cargando, ErrorCarga, SinDatos } from "../components/EstadoCarga";
import { Buscador, FiltroSelect } from "../components/Filtros";
import Paginacion from "../components/Paginacion";
import { EstadoBadge, ReferenciasSemaforo } from "../components/Semaforo";
import { Card, PageHeader } from "../components/Tablero";
import {
  formatDni,
  formatFecha,
  formatMoneda,
  formatNumero,
  iniciales,
} from "../utils/format";
import { SEMAFOROS, claveConteo } from "../utils/semaforo";

const ESTADOS = Object.entries(SEMAFOROS.cliente.estados);

export default function ClientesPage() {
  const { sucursales, fechaReferencia } = useTablero();
  const [searchParams] = useSearchParams();
  const [filtros, setFiltros] = useState(() => ({
    busqueda: "",
    idSucursal: "",
    estado: ESTADOS.some(([e]) => e === searchParams.get("estado"))
      ? searchParams.get("estado")
      : "",
  }));
  const [pagina, setPagina] = useState(1);

  const { data, error, loading, recargar } = useApi(
    () => getClientes({ ...filtros, pagina, porPagina: FILAS_POR_PAGINA }),
    [filtros, pagina],
  );

  const cambiar = (campo) => (valor) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPagina(1);
  };

  const registrados = data
    ? data.conteos.activo + data.conteos.enRiesgo + data.conteos.inactivo
    : null;

  return (
    <div className="pagina">
      <PageHeader
        titulo="Clientes"
        subtitulo={`${registrados !== null ? `${formatNumero(registrados)} clientes registrados · actividad` : "Actividad"} según días desde la última compra (al ${formatFecha(fechaReferencia)})`}
      />

      {/* Cada tarjeta también filtra la tabla por ese estado */}
      <div className="grid-kpis grid-kpis-3">
        {ESTADOS.map(([estado, config]) => (
          <button
            key={estado}
            type="button"
            className="card kpi kpi-estado"
            aria-pressed={filtros.estado === estado}
            onClick={() => cambiar("estado")(filtros.estado === estado ? "" : estado)}
          >
            <div>
              <p className="kpi-valor">
                {data ? formatNumero(data.conteos[claveConteo(estado)]) : "…"}
              </p>
              <p>{config.corta}</p>
            </div>
            <EstadoBadge tipo="cliente" estado={estado} />
          </button>
        ))}
      </div>

      <Card>
        <div className="filtros">
          <Buscador
            label="Buscar"
            placeholder="Nombre, DNI o email"
            valor={filtros.busqueda}
            onBuscar={cambiar("busqueda")}
          />
          <FiltroSelect
            label="Sucursal habitual"
            valor={filtros.idSucursal}
            onCambiar={cambiar("idSucursal")}
            todos="Todas las sucursales"
            opciones={sucursales.map((s) => ({ valor: String(s.id), texto: s.nombre }))}
          />
          <FiltroSelect
            label="Estado"
            valor={filtros.estado}
            onCambiar={cambiar("estado")}
            todos="Todos los estados"
            opciones={ESTADOS.map(([estado, config]) => ({
              valor: estado,
              texto: config.etiqueta,
            }))}
          />
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
            <SinDatos texto="No hay clientes que coincidan con los filtros." />
          ) : (
            <>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>DNI</th>
                      <th>Sucursal habitual</th>
                      <th className="num">Compras (12 meses)</th>
                      <th className="num">Total gastado</th>
                      <th>Última compra</th>
                      <th className="num">Días</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="celda-cliente">
                            <span className="avatar avatar-sm" aria-hidden="true">
                              {iniciales(c.nombre, c.apellido)}
                            </span>
                            <div className="celda-doble">
                              <span className="principal">
                                {c.nombre} {c.apellido}
                              </span>
                              <span>{c.email ?? "Sin email"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="nowrap">{formatDni(c.dni)}</td>
                        <td>{c.sucursalHabitual ?? "—"}</td>
                        <td className="num">{formatNumero(c.compras12Meses)}</td>
                        <td className="num">{formatMoneda(c.totalGastado)}</td>
                        <td className="nowrap">{formatFecha(c.ultimaCompra)}</td>
                        <td className="num">{c.dias ?? "—"}</td>
                        <td>
                          <EstadoBadge tipo="cliente" estado={c.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion
                pagina={data.pagina}
                porPagina={data.porPagina}
                total={data.total}
                onCambiar={setPagina}
                unidad="clientes"
                detalle="ordenado por última compra"
              />
            </>
          )}
        </Card>
      )}

      <ReferenciasSemaforo tipo="cliente" />
    </div>
  );
}
