import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getStock } from "../api/tablero";
import { useApi } from "../hooks/useApi";
import { useTablero } from "../context/TableroContext";
import { FILAS_POR_PAGINA } from "../config";
import { Cargando, ErrorCarga, SinDatos } from "../components/EstadoCarga";
import { Buscador, FiltroEstados, FiltroSelect } from "../components/Filtros";
import Paginacion from "../components/Paginacion";
import { EstadoBadge, ReferenciasSemaforo } from "../components/Semaforo";
import { Barra, Card, PageHeader } from "../components/Tablero";
import { formatFecha, formatNumero, formatTalle } from "../utils/format";
import { SEMAFOROS, estadoSemaforo } from "../utils/semaforo";

const ESTADOS = Object.keys(SEMAFOROS.stock.estados);

export default function StockPage() {
  const { sucursales, marcas, fechaReferencia } = useTablero();
  const [searchParams] = useSearchParams();
  // Desde el resumen se puede llegar con un estado ya elegido (/stock?estado=critico)
  const [filtros, setFiltros] = useState(() => ({
    busqueda: "",
    idSucursal: "",
    idMarca: "",
    estado: ESTADOS.includes(searchParams.get("estado")) ? searchParams.get("estado") : "",
  }));
  const [pagina, setPagina] = useState(1);

  const { data, error, loading, recargar } = useApi(
    () => getStock({ ...filtros, pagina, porPagina: FILAS_POR_PAGINA }),
    [filtros, pagina],
  );

  const cambiar = (campo) => (valor) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPagina(1);
  };

  const combinaciones = data
    ? data.conteos.critico + data.conteos.atencion + data.conteos.normal
    : null;

  return (
    <div className="pagina">
      <PageHeader
        titulo="Stock por talle"
        subtitulo={`${combinaciones !== null ? `${formatNumero(combinaciones)} combinaciones` : "Combinaciones"} producto · talle · sucursal · Datos al ${formatFecha(fechaReferencia)}`}
      />

      <Card>
        <div className="filtros">
          <Buscador
            label="Buscar"
            placeholder="Modelo o SKU"
            valor={filtros.busqueda}
            onBuscar={cambiar("busqueda")}
          />
          <FiltroSelect
            label="Sucursal"
            valor={filtros.idSucursal}
            onCambiar={cambiar("idSucursal")}
            todos="Todas las sucursales"
            opciones={sucursales.map((s) => ({ valor: String(s.id), texto: s.nombre }))}
          />
          <FiltroSelect
            label="Marca"
            valor={filtros.idMarca}
            onCambiar={cambiar("idMarca")}
            todos="Todas las marcas"
            opciones={marcas.map((m) => ({ valor: String(m.id), texto: m.nombre }))}
          />
          <FiltroEstados
            tipo="stock"
            conteos={data?.conteos}
            valor={filtros.estado}
            onCambiar={cambiar("estado")}
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
            <SinDatos texto="No hay stock que coincida con los filtros." />
          ) : (
            <>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Modelo</th>
                      <th>Marca</th>
                      <th>Sucursal</th>
                      <th className="num">Talle</th>
                      <th className="num">Stock</th>
                      <th className="num">Mínimo</th>
                      <th>Nivel</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((st) => (
                      <tr key={st.idStock}>
                        <td className="mono">
                          {st.sku}-{formatTalle(st.talle)}
                        </td>
                        <td className="principal">{st.modelo}</td>
                        <td>{st.marca}</td>
                        <td>{st.sucursal}</td>
                        <td className="num">{formatTalle(st.talle)}</td>
                        <td className="num">{formatNumero(st.cantidad)}</td>
                        <td className="num muted">{formatNumero(st.stockMinimo)}</td>
                        <td>
                          {/* La barra llena equivale a tres veces el stock mínimo */}
                          <Barra
                            valor={(st.cantidad / Math.max(1, st.stockMinimo * 3)) * 100}
                            tono={estadoSemaforo("stock", st.estado)?.tono ?? "neutro"}
                          />
                        </td>
                        <td>
                          <EstadoBadge
                            tipo="stock"
                            estado={st.estado}
                            etiqueta={st.cantidad === 0 ? "Sin stock" : undefined}
                          />
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
                detalle="ordenado por estado (más crítico primero)"
              />
            </>
          )}
        </Card>
      )}

      <ReferenciasSemaforo tipo="stock" />
    </div>
  );
}
