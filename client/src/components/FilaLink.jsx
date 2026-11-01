import { Link, useNavigate } from "react-router-dom";
import Icon from "./Icon";

// Fila de tabla en la que se puede hacer clic para bajar un nivel (drill down).
export function FilaLink({ to, children }) {
  const navigate = useNavigate();
  return (
    <tr
      className="fila-link"
      onClick={(e) => {
        if (!e.target.closest("a, button")) navigate(to);
      }}
    >
      {children}
    </tr>
  );
}

export function LinkFila({ to, children }) {
  return (
    <Link className="link-fila" to={to}>
      {children}
      <Icon name="siguiente" size={16} />
    </Link>
  );
}
