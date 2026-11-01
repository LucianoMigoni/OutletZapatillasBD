import { Link } from "react-router-dom";
import Icon from "./Icon";

const NIVELES = ["Sucursal", "Marca", "Modelo", "Detalle"];

// Navegación del desglose de ventas: botón para subir un nivel (drill up), ruta recorrida
// y en qué nivel se está. ruta tiene un elemento por nivel: [{ label, to }]
export default function DrillNav({ nivel, ruta }) {
  const anterior = ruta[nivel - 2];

  return (
    <nav className="card drill-nav" aria-label="Desglose de ventas">
      {anterior && (
        <Link className="btn-secondary btn-volver" to={anterior.to}>
          <Icon name="volver" size={16} />
          Volver a {nivel === 2 ? "sucursales" : anterior.label}
        </Link>
      )}

      <ol className="breadcrumb">
        {ruta.map((item, i) => (
          <li key={item.to}>
            {i < ruta.length - 1 ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>

      <ol className="drill-steps" aria-label="Nivel de detalle">
        {NIVELES.map((nombre, i) => {
          const numero = i + 1;
          const texto = `${numero} · ${nombre}`;
          if (numero < nivel)
            return (
              <li key={nombre}>
                <Link className="drill-step drill-step-hecho" to={ruta[i].to}>
                  {texto}
                </Link>
              </li>
            );
          return (
            <li key={nombre}>
              <span
                className={`drill-step${numero === nivel ? " drill-step-actual" : ""}`}
                aria-current={numero === nivel ? "step" : undefined}
              >
                {texto}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
