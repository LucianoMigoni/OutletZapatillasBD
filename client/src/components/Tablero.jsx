import { formatPorcentaje } from "../utils/format";

// Piezas comunes en todas las pantallas del tablero

export function PageHeader({ titulo, subtitulo, children }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{titulo}</h1>
        {subtitulo && <p className="page-subtitle">{subtitulo}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Card({ titulo, subtitulo, accion, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {titulo && (
        <div className="card-header">
          <div>
            <h2 className="card-title">{titulo}</h2>
            {subtitulo && <p className="card-subtitle">{subtitulo}</p>}
          </div>
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

// Indicador numérico: nombre, valor y, opcionalmente, variación o estado
export function KpiCard({ label, valor, children }) {
  return (
    <div className="card kpi">
      <p className="kpi-label">{label}</p>
      <p className="kpi-valor">{valor}</p>
      {children && <div className="kpi-extra">{children}</div>}
    </div>
  );
}

// Verde si sube, rojo si baja
export function Variacion({ valor, referencia }) {
  if (valor === null || valor === undefined)
    return (
      <span className="delta delta-neutra">Sin datos de {referencia}</span>
    );
  const sube = valor > 0.05;
  const baja = valor < -0.05;
  const clase = sube ? "delta-sube" : baja ? "delta-baja" : "delta-neutra";
  const flecha = sube ? "▲" : baja ? "▼" : "=";
  return (
    <span className={`delta ${clase}`}>
      <span aria-hidden="true">{flecha}</span>
      <span className="sr-only">
        {sube ? "Subió" : baja ? "Bajó" : "Igual"}
      </span>
      {formatPorcentaje(Math.abs(valor))}
      {referencia && ` vs. ${referencia}`}
    </span>
  );
}

// Barra de avance (0 a 100).
export function Barra({ valor, tono = "acento" }) {
  const ancho = Math.max(0, Math.min(100, valor ?? 0));
  return (
    <span className={`barra barra-${tono}`} aria-hidden="true">
      <span className="barra-relleno" style={{ width: `${ancho}%` }} />
    </span>
  );
}

// Barra + porcentaje, para las columnas "% del total"
export function BarraPorcentaje({ valor, tono }) {
  return (
    <span className="barra-porcentaje">
      <Barra valor={valor} tono={tono} />
      <span>{formatPorcentaje(valor)}</span>
    </span>
  );
}
