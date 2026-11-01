import { useParams } from "react-router-dom";
import { getVentasPorModelo } from "../../api/tablero";
import { useApi } from "../../hooks/useApi";
import { useTablero } from "../../context/TableroContext";
import DrillNav from "../../components/DrillNav";
import { Cargando, ErrorCarga, SinDatos } from "../../components/EstadoCarga";
import { SelectorPeriodo } from "../../components/Filtros";
import { FilaLink, LinkFila } from "../../components/FilaLink";
import Icon from "../../components/Icon";
import { EstadoBadge } from "../../components/Semaforo";
import { BarraPorcentaje, Card, PageHeader } from "../../components/Tablero";
import {
  formatMoneda,
  formatNumero,
  formatPeriodo,
  formatPeriodoMinuscula,
  participacion,
} from "../../utils/format";

// Drill down, nivel 3: modelos de una marca vendidos en la sucursal, con su estado de stock
export default function VentasModelosPage() {
  const { idSucursal, idMarca } = useParams();
  const { periodo } = useTablero();
  const { data, error, loading, recargar } = useApi(
    () => getVentasPorModelo(idSucursal, idMarca, periodo),
    [idSucursal, idMarca, periodo.anio, periodo.mes],
  );

  const sucursal = data?.sucursal.nombre ?? "…";
  const marca = data?.marca.nombre ?? "…";
  const ruta = [
    { label: "Todas las sucursales", to: "/ventas" },
    { label: sucursal, to: `/ventas/${idSucursal}` },
    { label: marca, to: `/ventas/${idSucursal}/${idMarca}` },
  ];

  const header = (
    <PageHeader
      titulo={data ? `${marca} en ${sucursal} · ventas por modelo` : "Ventas por modelo"}
      subtitulo={`${formatPeriodo(periodo)} · Hacé clic en un modelo para ver el detalle de cada venta`}
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
            volver={{ to: `/ventas/${idSucursal}`, label: "Volver a la sucursal" }}
          />
        ) : (
          <Cargando />
        )}
      </div>
    );

  const { items } = data;
  const total = {
    ventas: items.reduce((s, m) => s + m.ventas, 0),
    pares: items.reduce((s, m) => s + m.pares, 0),
    stock: items.reduce((s, m) => s + m.stock, 0),
  };

  return (
    <div className="pagina">
      {header}
      <DrillNav nivel={3} ruta={ruta} />

      <Card
        className={loading ? "recargando" : ""}
        titulo={`Modelos ${marca} vendidos en ${sucursal}`}
        subtitulo={`${items.length} ${items.length === 1 ? "modelo" : "modelos"} · ${formatMoneda(total.ventas)} · ${formatNumero(total.pares)} pares`}
        accion={
          <span className="card-hint">
            <Icon name="abajo" size={16} />
            Drill down: clic en el modelo
          </span>
        }
      >
        {items.length === 0 ? (
          <SinDatos
            texto={`No hubo ventas de ${marca} en ${sucursal} en ${formatPeriodoMinuscula(periodo)}.`}
          />
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th className="num">Precio outlet</th>
                  <th className="num">Pares</th>
                  <th className="num">Ventas</th>
                  <th>% de la marca</th>
                  <th className="num">Stock</th>
                  <th>Estado de stock</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => {
                  const to = `/ventas/${idSucursal}/${idMarca}/${m.id}`;
                  return (
                    <FilaLink key={m.id} to={to}>
                      <td>
                        <LinkFila to={to}>{m.modelo}</LinkFila>
                      </td>
                      <td className="mono">{m.sku}</td>
                      <td>
                        <span className="etiqueta">{m.categoria}</span>
                      </td>
                      <td className="num">{formatMoneda(m.precioOutlet)}</td>
                      <td className="num">{formatNumero(m.pares)}</td>
                      <td className="num">{formatMoneda(m.ventas)}</td>
                      <td>
                        <BarraPorcentaje valor={participacion(m.ventas, total.ventas)} />
                      </td>
                      <td className="num">{formatNumero(m.stock)}</td>
                      <td>
                        <EstadoBadge tipo="stock" estado={m.estadoStock} />
                      </td>
                    </FilaLink>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>
                    Total {marca} · {sucursal}
                  </td>
                  <td className="num">{formatNumero(total.pares)}</td>
                  <td className="num">{formatMoneda(total.ventas)}</td>
                  <td>100%</td>
                  <td className="num">{formatNumero(total.stock)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <p className="nota">
        Estado de stock: se toma el peor estado entre los talles del modelo en la
        sucursal (rojo: algún talle en o bajo el mínimo · amarillo: hasta el doble
        del mínimo · verde: suficiente).
      </p>
    </div>
  );
}
