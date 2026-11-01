import { useRef, useState } from "react";
import { useAncho } from "../hooks/useAncho";
import { Barra } from "./Tablero";
import {
  formatFecha,
  formatMoneda,
  formatMonedaCorta,
  formatNumero,
  formatTalle,
} from "../utils/format";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Divide el eje Y en 4 o 5 tramos redondos (0, 5 M, 10 M…)
function ticksEjeY(maximo) {
  const crudo = maximo / 4;
  const magnitud = 10 ** Math.floor(Math.log10(crudo));
  const normalizado = crudo / magnitud;
  const paso =
    (normalizado <= 1
      ? 1
      : normalizado <= 2
        ? 2
        : normalizado <= 2.5
          ? 2.5
          : normalizado <= 5
            ? 5
            : 10) * magnitud;
  const tope = Math.ceil(maximo / paso) * paso;
  const ticks = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) ticks.push(v);
  return ticks;
}

// Columna con las esquinas de arriba redondeadas y la base recta
function pathColumna(x, y, ancho, base) {
  const r = Math.min(4, ancho / 2, base - y);
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${base} Z`;
}

const ALTO_PLOT = 220;
const ALTO_EJE_X = 28;
const MARGEN = { arriba: 12, izquierda: 64, derecha: 8 };

// Ventas de cada día del mes
export function BarrasPorDia({ dias }) {
  const contenedor = useRef(null);
  const ancho = useAncho(contenedor);
  const [activo, setActivo] = useState(null);

  const maximo = Math.max(1, ...dias.map((d) => d.ventas));
  const ticks = ticksEjeY(maximo);
  const tope = ticks[ticks.length - 1];
  const base = MARGEN.arriba + ALTO_PLOT;
  const anchoPlot = Math.max(0, ancho - MARGEN.izquierda - MARGEN.derecha);
  const banda = anchoPlot / dias.length;
  const anchoBarra = Math.min(24, Math.max(2, banda * 0.62));
  const pasoEtiquetas = banda < 16 ? 5 : banda < 32 ? 2 : 1;
  const y = (valor) => MARGEN.arriba + ALTO_PLOT * (1 - valor / tope);
  const xCentro = (i) => MARGEN.izquierda + banda * i + banda / 2;

  const diaActivo = activo === null ? null : dias[activo];

  return (
    <div className="grafico" ref={contenedor}>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={base + ALTO_EJE_X}
          role="group"
          aria-label="Ventas por día del mes"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                className="grafico-grilla"
                x1={MARGEN.izquierda}
                x2={ancho - MARGEN.derecha}
                y1={y(t)}
                y2={y(t)}
              />
              <text
                className="grafico-eje"
                x={MARGEN.izquierda - 10}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
              >
                {t === 0 ? "$0" : formatMonedaCorta(t)}
              </text>
            </g>
          ))}
          <line
            className="grafico-base"
            x1={MARGEN.izquierda}
            x2={ancho - MARGEN.derecha}
            y1={base}
            y2={base}
          />

          {dias.map((d, i) => {
            const numeroDia = Number(d.fecha.slice(8, 10));
            const mostrarEtiqueta =
              numeroDia === 1 || numeroDia % pasoEtiquetas === 0;
            return (
              <g key={d.fecha}>
                {d.ventas > 0 && (
                  <path
                    className={`grafico-columna${activo === i ? " grafico-columna-activa" : ""}`}
                    d={pathColumna(
                      xCentro(i) - anchoBarra / 2,
                      y(d.ventas),
                      anchoBarra,
                      base,
                    )}
                  />
                )}
                {mostrarEtiqueta && (
                  <text
                    className="grafico-eje"
                    x={xCentro(i)}
                    y={base + 18}
                    textAnchor="middle"
                  >
                    {numeroDia}
                  </text>
                )}
                {/* Zona de hover más grande que la columna: toda la franja del día */}
                <rect
                  className="grafico-hit"
                  x={MARGEN.izquierda + banda * i}
                  y={MARGEN.arriba}
                  width={banda}
                  height={ALTO_PLOT}
                  tabIndex={0}
                  aria-label={`${formatFecha(d.fecha)}: ${formatMoneda(d.ventas)}, ${d.tickets} tickets`}
                  onPointerEnter={() => setActivo(i)}
                  onPointerLeave={() => setActivo(null)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                />
              </g>
            );
          })}
        </svg>
      )}

      {diaActivo && (
        <div
          className="grafico-tooltip"
          style={{
            left: Math.min(Math.max(xCentro(activo), 80), ancho - 80),
            top: Math.max(0, y(diaActivo.ventas) - 64),
          }}
          aria-hidden="true"
        >
          <strong>{formatMoneda(diaActivo.ventas)}</strong>
          <span>
            {DIAS_SEMANA[new Date(`${diaActivo.fecha}T12:00:00`).getDay()]}{" "}
            {formatFecha(diaActivo.fecha).slice(0, 5)} ·{" "}
            {formatNumero(diaActivo.tickets)} tickets
          </span>
        </div>
      )}
    </div>
  );
}

// Pares vendidos por talle: cada barra lleva su valor al final
export function BarrasPorTalle({ datos }) {
  const maximo = Math.max(1, ...datos.map((d) => d.pares));
  return (
    <ul className="barras-talle">
      {datos.map((d) => (
        <li key={d.talle}>
          <span className="barras-talle-talle">{formatTalle(d.talle)}</span>
          <Barra valor={(d.pares / maximo) * 100} />
          <span className="barras-talle-valor">{formatNumero(d.pares)}</span>
        </li>
      ))}
    </ul>
  );
}
