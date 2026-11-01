// Los tres semáforos del tablero. El estado lo calcula el backend en SQL (docs/contrato-api.md):
// acá solo se define cómo se muestra cada uno y qué explica su referencia.
// El orden de cada objeto es el orden en el que aparecen en pantalla.
export const SEMAFOROS = {
  objetivo: {
    titulo: "Cumplimiento del objetivo mensual",
    estados: {
      cumple: {
        tono: "verde",
        etiqueta: "Cumple",
        descripcion: "Ventas iguales o mayores al 100% del objetivo mensual.",
        corta: "100% o más del objetivo",
      },
      atencion: {
        tono: "amarillo",
        etiqueta: "Atención",
        descripcion: "Entre el 80% y el 99,9% del objetivo. Requiere seguimiento.",
        corta: "80% a 99,9%",
      },
      critico: {
        tono: "rojo",
        etiqueta: "Crítico",
        descripcion: "Menos del 80% del objetivo. Requiere acción inmediata.",
        corta: "menos del 80%",
      },
    },
  },
  stock: {
    titulo: "Stock por producto, talle y sucursal",
    estados: {
      critico: {
        tono: "rojo",
        etiqueta: "Crítico",
        descripcion: "Stock igual o menor al mínimo (incluye sin stock).",
        corta: "en o bajo el mínimo",
      },
      atencion: {
        tono: "amarillo",
        etiqueta: "Atención",
        descripcion: "Stock mayor al mínimo y hasta el doble.",
        corta: "hasta el doble del mínimo",
      },
      normal: {
        tono: "verde",
        etiqueta: "Normal",
        descripcion: "Stock mayor al doble del mínimo.",
        corta: "stock suficiente",
      },
    },
  },
  cliente: {
    titulo: "Actividad de clientes",
    estados: {
      activo: {
        tono: "verde",
        etiqueta: "Activo",
        descripcion: "Última compra hace 30 días o menos.",
        corta: "compró en los últimos 30 días",
      },
      en_riesgo: {
        tono: "amarillo",
        etiqueta: "En riesgo",
        descripcion: "Última compra hace entre 31 y 90 días.",
        corta: "última compra hace 31 a 90 días",
      },
      inactivo: {
        tono: "rojo",
        etiqueta: "Inactivo",
        descripcion: "Sin compras hace más de 90 días o nunca compró.",
        corta: "sin compras hace más de 90 días",
      },
    },
  },
};

export const COLOR_POR_TONO = { verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" };

// Configuración de un estado, o null si el backend no lo informó (por ejemplo, sucursal sin objetivo)
export const estadoSemaforo = (tipo, estado) =>
  SEMAFOROS[tipo].estados[estado] ?? null;

// Los conteos del backend vienen en camelCase ("enRiesgo") y los estados en snake_case ("en_riesgo")
export const claveConteo = (estado) =>
  estado.replace(/_(\w)/g, (_, letra) => letra.toUpperCase());
