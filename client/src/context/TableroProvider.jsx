import { useCallback, useMemo, useState } from "react";
import { getCatalogos } from "../api/tablero";
import { useApi } from "../hooks/useApi";
import { Cargando, ErrorCarga } from "../components/EstadoCarga";
import { TableroContext } from "./TableroContext";

const PERIODO_KEY = "outlet.periodo";

function leerPeriodoGuardado() {
  try {
    return JSON.parse(sessionStorage.getItem(PERIODO_KEY));
  } catch {
    return null;
  }
}

export function TableroProvider({ children }) {
  const { data: catalogos, error, recargar } = useApi(getCatalogos, []);
  const [periodoElegido, setPeriodoElegido] = useState(leerPeriodoGuardado);

  // Si no se eligió un mes se muestra el más nuevo
  const periodo = useMemo(() => {
    if (!catalogos) return null;
    const existe = catalogos.periodos.some(
      (p) => p.anio === periodoElegido?.anio && p.mes === periodoElegido?.mes,
    );
    return existe ? periodoElegido : (catalogos.periodos[0] ?? null);
  }, [catalogos, periodoElegido]);

  const setPeriodo = useCallback((nuevo) => {
    setPeriodoElegido(nuevo);
    sessionStorage.setItem(PERIODO_KEY, JSON.stringify(nuevo));
  }, []);

  const value = useMemo(
    () => (catalogos ? { ...catalogos, periodo, setPeriodo } : null),
    [catalogos, periodo, setPeriodo],
  );

  if (error && !catalogos)
    return <ErrorCarga error={error} onReintentar={recargar} />;
  if (!value) return <Cargando />;
  if (!periodo)
    return (
      <ErrorCarga
        error={{
          message: "Todavía no hay ventas cargadas en la base de datos.",
        }}
        onReintentar={recargar}
      />
    );

  return (
    <TableroContext.Provider value={value}>{children}</TableroContext.Provider>
  );
}
