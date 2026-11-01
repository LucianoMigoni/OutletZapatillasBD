import { Link } from "react-router-dom";
import Icon from "./Icon";

// Estados de una pantalla o tarjeta mientras se piden los datos a la API
export function Cargando({ texto = "Cargando datos…" }) {
  return (
    <div className="estado-carga" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function ErrorCarga({ error, onReintentar, volver }) {
  return (
    <div className="estado-carga estado-error" role="alert">
      <Icon name="alerta" size={28} />
      <p>{error?.message || "No se pudieron cargar los datos."}</p>
      <div className="estado-acciones">
        {onReintentar && (
          <button type="button" className="btn-secondary" onClick={onReintentar}>
            Reintentar
          </button>
        )}
        {volver && (
          <Link className="btn-secondary" to={volver.to}>
            {volver.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function SinDatos({ texto }) {
  return <p className="sin-datos">{texto}</p>;
}
