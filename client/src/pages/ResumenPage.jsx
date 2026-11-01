import { useState } from "react";
import { Link } from "react-router-dom";
import { getResumen } from "../api/tablero";
import { useApi } from "../hooks/useApi";
import { useTablero } from "../context/TableroContext";
import { Cargando, ErrorCarga } from "../components/EstadoCarga";
import { SelectorPeriodo, SelectorSucursal } from "../components/Filtros";
import { FilaLink, LinkFila } from "../components/FilaLink";
import { BarrasPorDia } from "../components/Graficos";
import Icon from "../components/Icon";
import { EstadoBadge, ReferenciasSemaforo } from "../components/Semaforo";
import {
  BarraPorcentaje,
  Card,
  KpiCard,
  PageHeader,
  Variacion,
} from "../components/Tablero";
import {
  MESES,
  formatFecha,
  formatMoneda,
  formatNumero,
  formatPeriodoMinuscula,
  formatPorcentaje,
  formatUbicacion,
  mesAnterior,
  rangoDelMes,
  variacion,
} from "../utils/format";
import { SEMAFOROS, claveConteo, estadoSemaforo } from "../utils/semaforo";

// Completa con 0 los días del mes sin ventas, para que el gráfico muestre el mes entero
function todosLosDias(ventasPorDia, periodo) {
  const porFecha = new Map(ventasPorDia.map((d) => [d.fecha, d]));
  const { desde } = rangoDelMes(periodo);
  const ultimoDia = new Date(periodo.anio, periodo.mes, 0).getDate();
  return Array.from({ length: ultimoDia }, (_, i) => {
    const fecha = `${desde.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
    return porFecha.get(fecha) ?? { fecha, ventas: 0, tickets: 0 };
  });
}

// Tarjeta con la cantidad de casos en cada estado de un semáforo (stock o clientes)
function ConteosPorEstado({ tipo, conteos, destino }) {
  return (
    <div className="conteos">
      {Object.entries(SEMAFOROS[tipo].estados).map(([estado, config]) => (
        <Link key={estado} className="conteo" to={`${destino}?estado=${estado}`}>
          <EstadoBadge tipo={tipo} estado={estado} />
          <strong>{formatNumero(conteos[claveConteo(estado)])}</strong>
          <span>{config.corta}</span>
        </Link>
      ))}
    </div>
  );
}

export default function ResumenPage() {
  const { periodo, fechaReferencia, sucursales } = useTablero();
  const [idSucursal, setIdSucursal] = useState("");
  const [verTabla, setVerTabla] = useState(false);
  const { data, error, loading, recargar } = useApi(
    () => getResumen({ ...periodo, idSucursal }),
    [periodo.anio, periodo.mes, idSucursal],
  );

  const sucursal = sucursales.find((s) => String(s.id) === idSucursal);
  const mesPrevio = MESES[mesAnterior(periodo).mes - 1];

  const header = (
    <PageHeader
      titulo={`Resumen de ${formatPeriodoMinuscula(periodo)}`}
      subtitulo={`${sucursal?.nombre ?? "Todas las sucursales"} · Datos actualizados al ${formatFecha(fechaReferencia)}`}
    >
      <SelectorPeriodo />
      <SelectorSucursal valor={idSucursal} onCambiar={setIdSucursal} />
    </PageHeader>
  );

  if (!data)
    return (
      <div className="pagina">
        {header}
        {error ? <ErrorCarga error={error} onReintentar={recargar} /> : <Cargando />}
      </div>
    );

  const { kpis } = data;
  const ticketPromedio = kpis.tickets ? kpis.ventas / kpis.tickets : 0;
  const ticketAnterior = kpis.ticketsAnterior
    ? kpis.ventasAnterior / kpis.ticketsAnterior
    : null;
  const estadoGeneral = estadoSemaforo("objetivo", kpis.estado);
  const dias = todosLosDias(data.ventasPorDia, periodo);

  return (
    <div className="pagina">
      {header}

      <div className={`pagina${loading ? " recargando" : ""}`}>
        <div className="grid-kpis">
          <KpiCard label="Ventas del mes" valor={formatMoneda(kpis.ventas)}>
            <Variacion
              valor={variacion(kpis.ventas, kpis.ventasAnterior)}
              referencia={mesPrevio}
            />
          </KpiCard>
          <KpiCard
            label="Cumplimiento del objetivo"
            valor={formatPorcentaje(kpis.cumplimiento)}
          >
            <EstadoBadge
              tipo="objetivo"
              estado={kpis.estado}
              etiqueta={estadoGeneral ? undefined : "Sin objetivo cargado"}
            />
            {kpis.objetivo !== null && (
              <span className="kpi-nota">
                objetivo {formatMoneda(kpis.objetivo)}
              </span>
            )}
          </KpiCard>
          <KpiCard label="Pares vendidos" valor={formatNumero(kpis.pares)}>
            <Variacion
              valor={variacion(kpis.pares, kpis.paresAnterior)}
              referencia={mesPrevio}
            />
          </KpiCard>
          <KpiCard label="Ticket promedio" valor={formatMoneda(ticketPromedio)}>
            <Variacion
              valor={variacion(ticketPromedio, ticketAnterior)}
              referencia={mesPrevio}
            />
          </KpiCard>
        </div>

        <div className="grid-principal">
          <Card
            titulo="Cumplimiento de objetivos por sucursal"
            subtitulo="Ventas del mes contra el objetivo mensual cargado para cada sucursal"
            accion={
              <Link className="btn-secondary" to="/ventas">
                Ver desglose
              </Link>
            }
          >
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th className="num">Ventas</th>
                    <th className="num">Objetivo</th>
                    <th>Cumplimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sucursales.map((s) => (
                    <FilaLink key={s.id} to={`/ventas/${s.id}`}>
                      <td>
                        <div className="celda-doble">
                          <LinkFila to={`/ventas/${s.id}`}>{s.nombre}</LinkFila>
                          <span>{formatUbicacion(s)}</span>
                        </div>
                      </td>
                      <td className="num">{formatMoneda(s.ventas)}</td>
                      <td className="num muted">
                        {s.objetivo !== null ? formatMoneda(s.objetivo) : "—"}
                      </td>
                      <td>
                        {/* Barra de avance hacia el objetivo, del color de su estado */}
                        <BarraPorcentaje
                          valor={s.cumplimiento}
                          tono={estadoSemaforo("objetivo", s.estado)?.tono ?? "neutro"}
                        />
                      </td>
                      <td>
                        <EstadoBadge tipo="objetivo" estado={s.estado} />
                      </td>
                    </FilaLink>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card titulo="Referencias del semáforo">
            <ReferenciasSemaforo tipo="objetivo" variante="tarjeta" />
          </Card>
        </div>

        <div className="grid-mitades">
          <Card
            titulo="Stock por talle"
            subtitulo="Combinaciones producto · talle · sucursal según su stock mínimo"
            accion={
              <Link className="btn-secondary" to="/stock">
                Ver stock
              </Link>
            }
          >
            <ConteosPorEstado tipo="stock" conteos={data.stock} destino="/stock" />
          </Card>
          <Card
            titulo="Actividad de clientes"
            subtitulo="Según los días desde su última compra"
            accion={
              <Link className="btn-secondary" to="/clientes">
                Ver clientes
              </Link>
            }
          >
            <ConteosPorEstado
              tipo="cliente"
              conteos={data.clientes}
              destino="/clientes"
            />
          </Card>
        </div>

        <Card
          titulo="Ventas por día"
          subtitulo={`Importe vendido cada día de ${formatPeriodoMinuscula(periodo)}. Pasá el mouse por una columna para ver el detalle.`}
          accion={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVerTabla((v) => !v)}
              aria-pressed={verTabla}
            >
              <Icon name={verTabla ? "grafico" : "tabla"} size={16} />
              {verTabla ? "Ver gráfico" : "Ver tabla"}
            </button>
          }
        >
          {verTabla ? (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="num">Tickets</th>
                    <th className="num">Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {dias.map((d) => (
                    <tr key={d.fecha}>
                      <td>{formatFecha(d.fecha)}</td>
                      <td className="num">{formatNumero(d.tickets)}</td>
                      <td className="num">{formatMoneda(d.ventas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <BarrasPorDia dias={dias} />
          )}
        </Card>
      </div>
    </div>
  );
}
