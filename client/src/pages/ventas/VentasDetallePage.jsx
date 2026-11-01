import { useState } from "react";
import { useParams } from "react-router-dom";
import { getDetalleModelo } from "../../api/tablero";
import { useApi } from "../../hooks/useApi";
import { useTablero } from "../../context/TableroContext";
import { LINEAS_POR_PAGINA } from "../../config";
import DrillNav from "../../components/DrillNav";
import { Cargando, ErrorCarga, SinDatos } from "../../components/EstadoCarga";
import { SelectorPeriodo } from "../../components/Filtros";
import { BarrasPorTalle } from "../../components/Graficos";
import Paginacion from "../../components/Paginacion";
import { Card, PageHeader } from "../../components/Tablero";
import {
  MEDIOS_PAGO,
  formatFecha,
  formatMoneda,
  formatNumero,
  formatPeriodo,
  formatPeriodoMinuscula,
  formatTalle,
} from "../../utils/format";

// Drill down, nivel 4 (último): cada línea de venta del modelo en la sucursal
export default function VentasDetallePage() {
  const { idSucursal, idMarca, idProducto } = useParams();
  const { periodo } = useTablero();
  // Al cambiar de modelo o de mes se vuelve a la primera página
  return (
    <DetalleModelo
      key={`${idSucursal}-${idProducto}-${periodo.anio}-${periodo.mes}`}
      idSucursal={idSucursal}
      idMarca={idMarca}
      idProducto={idProducto}
      periodo={periodo}
    />
  );
}

function DetalleModelo({ idSucursal, idMarca, idProducto, periodo }) {
  const [pagina, setPagina] = useState(1);
  const { data, error, loading, recargar } = useApi(
    () =>
      getDetalleModelo(idSucursal, idProducto, {
        ...periodo,
        pagina,
        porPagina: LINEAS_POR_PAGINA,
      }),
    [pagina],
  );

  const sucursal = data?.sucursal.nombre ?? "…";
  const marca = data?.marca ?? { id: idMarca, nombre: "…" };
  const modelo = data?.producto.modelo ?? "…";
  const ruta = [
    { label: "Todas las sucursales", to: "/ventas" },
    { label: sucursal, to: `/ventas/${idSucursal}` },
    { label: marca.nombre, to: `/ventas/${idSucursal}/${marca.id}` },
    { label: modelo, to: `/ventas/${idSucursal}/${marca.id}/${idProducto}` },
  ];

  const header = (
    <PageHeader
      titulo={data ? `${modelo} · detalle de ventas` : "Detalle de ventas del modelo"}
      subtitulo={
        data
          ? `${marca.nombre} · ${sucursal} · ${formatPeriodo(periodo)} · Último nivel de detalle`
          : formatPeriodo(periodo)
      }
    >
      <SelectorPeriodo />
    </PageHeader>
  );

  if (!data)
    return (
      <div className="pagina">
        {header}
        {error ? (
          <ErrorCarga
            error={error}
            onReintentar={error.status === 404 ? undefined : recargar}
            volver={{ to: `/ventas/${idSucursal}/${idMarca}`, label: "Volver a la marca" }}
          />
        ) : (
          <Cargando />
        )}
      </div>
    );

  const { producto, resumen, paresPorTalle, lineas } = data;

  return (
    <div className="pagina">
      {header}
      <DrillNav nivel={4} ruta={ruta} />

      <div className="grid-principal">
        <Card
          className={loading ? "recargando" : ""}
          titulo="Ventas del modelo"
          subtitulo="Cada fila es una línea de una venta (detalle_ventas)"
        >
          {lineas.total === 0 ? (
            <SinDatos
              texto={`No hubo ventas de ${modelo} en ${sucursal} en ${formatPeriodoMinuscula(periodo)}.`}
            />
          ) : (
            <>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>N° venta</th>
                      <th>Cliente</th>
                      <th className="num">Talle</th>
                      <th className="num">Cant.</th>
                      <th className="num">Precio unit.</th>
                      <th className="num">Subtotal</th>
                      <th>Medio de pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.items.map((l) => (
                      <tr key={l.idDetalle}>
                        <td className="nowrap">{formatFecha(l.fecha)}</td>
                        <td className="mono">{l.numero}</td>
                        <td>{l.cliente}</td>
                        <td className="num">{formatTalle(l.talle)}</td>
                        <td className="num">{formatNumero(l.cantidad)}</td>
                        <td className="num">{formatMoneda(l.precioUnitario)}</td>
                        <td className="num">{formatMoneda(l.subtotal)}</td>
                        <td>
                          <span className="etiqueta">
                            {MEDIOS_PAGO[l.medioPago] ?? l.medioPago}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion
                pagina={lineas.pagina}
                porPagina={lineas.porPagina}
                total={lineas.total}
                onCambiar={setPagina}
                unidad="líneas"
                detalle={`${formatNumero(resumen.pares)} pares · ${formatMoneda(resumen.ventas)}`}
              />
            </>
          )}
        </Card>

        <Card titulo="Pares vendidos por talle">
          {paresPorTalle.length > 0 ? (
            <BarrasPorTalle datos={paresPorTalle} />
          ) : (
            <SinDatos texto="Sin ventas en el período." />
          )}
          <div className="datos-modelo">
            <div>
              <p>Pares</p>
              <strong>{formatNumero(resumen.pares)}</strong>
            </div>
            <div>
              <p>Ventas</p>
              <strong>{formatMoneda(resumen.ventas)}</strong>
            </div>
            <div>
              <p>Precio outlet</p>
              <strong>{formatMoneda(producto.precioOutlet)}</strong>
            </div>
            <div>
              <p>Precio de lista</p>
              <strong>{formatMoneda(producto.precioLista)}</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
