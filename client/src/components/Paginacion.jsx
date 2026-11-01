import { formatNumero } from "../utils/format";

// Páginas a mostrar
function paginasVisibles(actual, ultima) {
  const paginas = new Set([1, ultima, actual - 1, actual, actual + 1]);
  const lista = [...paginas]
    .filter((p) => p >= 1 && p <= ultima)
    .sort((a, b) => a - b);
  const conSaltos = [];
  lista.forEach((p, i) => {
    if (i > 0 && p - lista[i - 1] > 1) conSaltos.push(`salto-${p}`);
    conSaltos.push(p);
  });
  return conSaltos;
}

export default function Paginacion({
  pagina,
  porPagina,
  total,
  onCambiar,
  unidad = "",
  detalle,
  numeros = false,
}) {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);

  return (
    <div className="paginacion">
      <p>
        Mostrando {formatNumero(desde)} a {formatNumero(hasta)} de{" "}
        {formatNumero(total)}
        {unidad && ` ${unidad}`}
        {detalle && ` · ${detalle}`}
      </p>
      <nav className="paginacion-botones" aria-label="Paginación">
        <button
          type="button"
          className="btn-secondary"
          disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}
        >
          Anterior
        </button>
        {numeros &&
          paginasVisibles(pagina, ultima).map((p) =>
            typeof p === "string" ? (
              <span key={p} className="paginacion-salto" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`btn-secondary btn-pagina${p === pagina ? " btn-pagina-actual" : ""}`}
                aria-current={p === pagina ? "page" : undefined}
                onClick={() => onCambiar(p)}
              >
                {formatNumero(p)}
              </button>
            ),
          )}
        <button
          type="button"
          className="btn-secondary"
          disabled={pagina >= ultima}
          onClick={() => onCambiar(pagina + 1)}
        >
          Siguiente
        </button>
      </nav>
    </div>
  );
}
