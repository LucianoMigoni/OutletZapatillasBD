import { useParams } from "react-router-dom";
import { getVentasPorMarca } from "../../api/tablero";
import { useApi } from "../../hooks/useApi";
import { useTablero } from "../../context/TableroContext";
import DrillNav from "../../components/DrillNav";
import { Cargando, ErrorCarga, SinDatos } from "../../components/EstadoCarga";
import { SelectorPeriodo } from "../../components/Filtros";
import { FilaLink, LinkFila } from "../../components/FilaLink";
import Icon from "../../components/Icon";
import { EstadoBadge } from "../../components/Semaforo";
import {
  BarraPorcentaje,
  Card,
  KpiCard,
  PageHeader,
  Variacion,
} from "../../components/Tablero";
import {
  MESES,
  formatMoneda,
  formatNumero,
  formatPeriodo,
  formatPeriodoMinuscula,
  formatPorcentaje,
  mesAnterior,
  participacion,
  variacion,
} from "../../utils/format";

// Drill down, nivel 2: ventas por marca dentro de la sucursal elegida
export default function VentasMarcasPage() {
  const { idSucursal } = useParams();
  const { periodo } = useTablero();
  const { data, error, loading, recargar } = useApi(
    () => getVentasPorMarca(idSucursal, periodo),
    [idSucursal, periodo.anio, periodo.mes],
  );

  const nombre = data?.sucursal.nombre ?? "…";
  const mesPrevio = MESES[mesAnterior(periodo).mes - 1];
  const ruta = [
    { label: "Todas las sucursales", to: "/ventas" },
    { label: nombre, to: `/ventas/${idSucursal}` },
  ];

  const header = (
    <PageHeader
      titulo={data ? `${nombre} · ventas por marca` : "Ventas por marca"}
      subtitulo={`${formatPeriodo(periodo)} · Hacé clic en una marca para ver sus modelos`}
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
            volver={{ to: "/ventas", label: "Volver a sucursales" }}
          />
        ) : (
          <Cargando />
        )}
      </div>
    );

  const { sucursal, items } = data;
  const total = {
    ventas: items.reduce((s, m) => s + m.ventas, 0),
    pares: items.reduce((s, m) => s + m.pares, 0),
    anterior: items.reduce((s, m) => s + m.ventasAnterior, 0),
  };

  return (
    <div className="pagina">
      {header}
      <DrillNav nivel={2} ruta={ruta} />

      <div className={`pagina${loading ? " recargando" : ""}`}>
        <div className="grid-kpis">
          <KpiCard label="Ventas de la sucursal" valor={formatMoneda(sucursal.ventas)} />
          <KpiCard
            label="Objetivo mensual"
            valor={sucursal.objetivo !== null ? formatMoneda(sucursal.objetivo) : "—"}
          />
          <KpiCard label="Cumplimiento" valor={formatPorcentaje(sucursal.cumplimiento)}>
            <EstadoBadge tipo="objetivo" estado={sucursal.estado} />
          </KpiCard>
          <KpiCard label="Pares vendidos" valor={formatNumero(sucursal.pares)} />
        </div>

        <Card
          titulo={`Marcas en ${nombre}`}
          subtitulo={`${items.length} ${items.length === 1 ? "marca" : "marcas"} con ventas en el período`}
          accion={
            <span className="card-hint">
              <Icon name="abajo" size={16} />
              Drill down: clic en la marca
            </span>
          }
        >
          {items.length === 0 ? (
            <SinDatos
              texto={`No hubo ventas en ${nombre} en ${formatPeriodoMinuscula(periodo)}.`}
            />
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Marca</th>
                    <th className="num">Ventas</th>
                    <th className="num">Pares</th>
                    <th className="num">Precio promedio</th>
                    <th>% de la sucursal</th>
                    <th className="num">Var. vs. {mesPrevio}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => {
                    const to = `/ventas/${idSucursal}/${m.id}`;
                    return (
                      <FilaLink key={m.id} to={to}>
                        <td>
                          <LinkFila to={to}>{m.nombre}</LinkFila>
                        </td>
                        <td className="num">{formatMoneda(m.ventas)}</td>
                        <td className="num">{formatNumero(m.pares)}</td>
                        <td className="num">{formatMoneda(m.ventas / m.pares)}</td>
                        <td>
                          <BarraPorcentaje valor={participacion(m.ventas, total.ventas)} />
                        </td>
                        <td className="num">
                          <Variacion valor={variacion(m.ventas, m.ventasAnterior)} />
                        </td>
                      </FilaLink>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total {nombre}</td>
                    <td className="num">{formatMoneda(total.ventas)}</td>
                    <td className="num">{formatNumero(total.pares)}</td>
                    <td className="num">{formatMoneda(total.ventas / total.pares)}</td>
                    <td>100%</td>
                    <td className="num">
                      <Variacion valor={variacion(total.ventas, total.anterior)} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
