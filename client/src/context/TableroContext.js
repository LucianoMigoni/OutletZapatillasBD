import { createContext, useContext } from "react";

// Datos compartidos por todas las pantallas del tablero
export const TableroContext = createContext(null);

export function useTablero() {
  const context = useContext(TableroContext);
  if (!context)
    throw new Error("useTablero debe usarse dentro de un TableroProvider");
  return context;
}
