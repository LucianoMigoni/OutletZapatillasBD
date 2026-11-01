import { getVentasPorSucursal } from "../../api/tablero";
import { useApi } from "../../hooks/useApi";
import { useTablero } from "../../context/TableroContext";
import DrillNav from "../../components/DrillNav";
import { Cargando, ErrorCarga } from "../../components/EstadoCarga";
import { SelectorPeriodo } from "../../components/Filtros";
import { FilaLink, LinkFila } from "../../components/FilaLink";
import Icon from "../../components/Icon";
import { EstadoBadge, ReferenciasSemaforo } from "../../components/Semaforo";
import { BarraPorcentaje, Card, PageHeader } from "../../components/Tablero";
import {
  formatMoneda,
  formatNumero,
  formatPeriodo,
  formatPorcentaje,
  formatUbicacion,
  participacion,
} from "../../utils/format";

// Drill down, nivel 1: ventas de cada sucursal en el mes
export default function VentasSucursalesPage() {
  const { periodo } = useTablero();
  const { data, error, loading, recargar } = useApi(
    () => getVentasPorSucursal(periodo),
    [periodo.anio, periodo.mes],
  );

  return (
    <div className="pagina">
      <PageHeader
        titulo="Ventas por sucursal"
        subtitulo={`${formatPeriodo(periodo)} · Hacé clic en una sucursal para ver sus ventas por marca`}
      >
        <SelectorPeriodo />
      </PageHeader>

      <DrillNav nivel={1} ruta={[{ label: "Todas las sucursales", to: "/ventas" }]} />

      {!data ? (
        error ? (
          <ErrorCarga error={error} onReintentar={recargar} />
        ) : (
          <Cargando />
        )
      ) : (
        <Card
          className={loading ? "recargando" : ""}
          titulo="Sucursales"
          subtitulo={`${data.items.length} sucursales · ordenadas por ventas`}
          accion={
            <span className="card-hint">
              <Icon name="abajo" size={16} />
              Drill down: clic en el nombre
            </span>
          }
        >
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>Ciudad</th>
                  <th className="num">Ventas</th>
                  <th className="num">Tickets</th>
                  <th className="num">Pares</th>
                  <th>% del total</th>
                  <th className="num">Cumplimiento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <FilaLink key={s.id} to={`/ventas/${s.id}`}>
                    <td>
                      <LinkFila to={`/ventas/${s.id}`}>{s.nombre}</LinkFila>
                    </td>
                    <td className="muted">{formatUbicacion(s)}</td>
                    <td className="num">{formatMoneda(s.ventas)}</td>
                    <td className="num">{formatNumero(s.tickets)}</td>
                    <td className="num">{formatNumero(s.pares)}</td>
                    <td>
                      <BarraPorcentaje
                        valor={participacion(s.ventas, data.totales.ventas)}
                      />
                    </td>
                    <td className="num">{formatPorcentaje(s.cumplimiento)}</td>
                    <td>
                      <EstadoBadge tipo="objetivo" estado={s.estado} />
                    </td>
                  </FilaLink>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td />
                  <td className="num">{formatMoneda(data.totales.ventas)}</td>
                  <td className="num">{formatNumero(data.totales.tickets)}</td>
                  <td className="num">{formatNumero(data.totales.pares)}</td>
                  <td>100%</td>
                  <td className="num">
                    {formatPorcentaje(data.totales.cumplimiento)}
                  </td>
                  <td>
                    <EstadoBadge tipo="objetivo" estado={data.totales.estado} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <ReferenciasSemaforo tipo="objetivo" titulo="Semáforo de cumplimiento" />
    </div>
  );
}
