import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import { formatNumero, formatPeriodo } from "../utils/format";
import { SEMAFOROS, claveConteo } from "../utils/semaforo";
import { useTablero } from "../context/TableroContext";

// Controles de filtro de las pantallas del tablero

// Campo de búsqueda: avisa el texto recién cuando el usuario deja de escribir
export function Buscador({
  label,
  placeholder,
  valor,
  onBuscar,
  demora = 350,
}) {
  const id = useId();
  const [texto, setTexto] = useState(valor);
  const [valorAnterior, setValorAnterior] = useState(valor);
  const timer = useRef(null);

  // Si el filtro se limpia desde afuera, se vacía el campo
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (e) => {
    const nuevo = e.target.value;
    setTexto(nuevo);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onBuscar(nuevo.trim()), demora);
  };

  return (
    <div className="filtro filtro-busqueda">
      <label htmlFor={id}>{label}</label>
      <div className="control-con-icono">
        <Icon name="buscar" size={18} />
        <input
          id={id}
          type="search"
          className="control"
          placeholder={placeholder}
          value={texto}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

export function FiltroSelect({ label, valor, onCambiar, opciones, todos }) {
  const id = useId();
  return (
    <div className="filtro">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="control"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
      >
        <option value="">{todos}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FiltroFecha({ label, valor, onCambiar, min, max }) {
  const id = useId();
  return (
    <div className="filtro filtro-fecha">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="date"
        className="control"
        value={valor}
        min={min}
        max={max}
        onChange={(e) => onCambiar(e.target.value)}
      />
    </div>
  );
}

// Botones "Todos / Crítico / Atención / Normal" con la cantidad de cada estado
export function FiltroEstados({ tipo, conteos, valor, onCambiar }) {
  const estados = Object.entries(SEMAFOROS[tipo].estados);
  const total = estados.reduce(
    (suma, [estado]) => suma + (conteos?.[claveConteo(estado)] ?? 0),
    0,
  );

  return (
    <div className="filtro">
      <span className="filtro-label" id={`estados-${tipo}`}>
        Estado
      </span>
      <div className="chips" role="group" aria-labelledby={`estados-${tipo}`}>
        <button
          type="button"
          className={`chip${valor === "" ? " chip-activo" : ""}`}
          aria-pressed={valor === ""}
          onClick={() => onCambiar("")}
        >
          Todos <span className="chip-cantidad">{formatNumero(total)}</span>
        </button>
        {estados.map(([estado, config]) => (
          <button
            key={estado}
            type="button"
            className={`chip${valor === estado ? " chip-activo" : ""}`}
            aria-pressed={valor === estado}
            onClick={() => onCambiar(valor === estado ? "" : estado)}
          >
            <span className={`dot dot-${config.tono}`} aria-hidden="true" />
            {config.etiqueta}
            <span className="chip-cantidad">
              {formatNumero(conteos?.[claveConteo(estado)] ?? 0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Selector del mes, compartido por todas las pantallas que muestran ventas de un período
export function SelectorPeriodo() {
  const { periodos, periodo, setPeriodo } = useTablero();
  const valor = `${periodo.anio}-${periodo.mes}`;

  return (
    <label className="select-pill">
      <Icon name="calendario" size={18} />
      <span className="sr-only">Mes</span>
      <select
        value={valor}
        onChange={(e) => {
          const [anio, mes] = e.target.value.split("-").map(Number);
          setPeriodo({ anio, mes });
        }}
      >
        {periodos.map((p) => (
          <option key={`${p.anio}-${p.mes}`} value={`${p.anio}-${p.mes}`}>
            {formatPeriodo(p)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SelectorSucursal({ valor, onCambiar }) {
  const { sucursales } = useTablero();
  return (
    <label className="select-pill">
      <Icon name="sucursal" size={18} />
      <span className="sr-only">Sucursal</span>
      <select value={valor} onChange={(e) => onCambiar(e.target.value)}>
        <option value="">Todas las sucursales</option>
        {sucursales.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
