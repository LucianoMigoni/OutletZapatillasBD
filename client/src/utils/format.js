// Formato de números, importes y fechas en castellano (Argentina)

const enteros = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const talles = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const porcentajes = (decimales) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Valores de ventas.medio_pago (CHECK de la tabla) y cómo se muestran
export const MEDIOS_PAGO = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
  billetera: "Billetera virtual",
};

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// 1284 -> "1.284"
export const formatNumero = (n) => enteros.format(n ?? 0);

// 290026400 -> "$290.026.400"
export const formatMoneda = (n) => {
  const valor = Math.round(n ?? 0);
  return `${valor < 0 ? "-" : ""}$${enteros.format(Math.abs(valor))}`;
};

// 12500000 -> "$12,5 M" (ejes de los gráficos)
export function formatMonedaCorta(n) {
  if (Math.abs(n) >= 1_000_000)
    return `$${talles.format(n / 1_000_000)} M`;
  if (Math.abs(n) >= 1_000) return `$${enteros.format(n / 1_000)} mil`;
  return formatMoneda(n);
}

// 96 -> "96,0%" y null -> guion largo
export const formatPorcentaje = (n, decimales = 1) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : `${porcentajes(decimales).format(n)}%`;

// 40.5 -> "40,5"
export const formatTalle = (talle) => talles.format(talle);

// "38456120" -> "38.456.120"
export const formatDni = (dni) =>
  dni && /^\d+$/.test(dni) ? enteros.format(Number(dni)) : (dni ?? "—");

// "2026-09-29" o "2026-09-29T20:10:00" -> "29/09/2026" (sin pasar por Date para no correr el día)
export function formatFecha(iso) {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

// "2026-09-29T20:10:00" -> "29/09/2026 20:10"
export const formatFechaHora = (iso) =>
  iso ? `${formatFecha(iso)} ${iso.slice(11, 16)}` : "—";

// { anio: 2026, mes: 9 } -> "Septiembre 2026"
export const formatPeriodo = ({ anio, mes }) =>
  `${capitalizar(MESES[mes - 1])} ${anio}`;

// { anio: 2026, mes: 9 } -> "septiembre 2026"
export const formatPeriodoMinuscula = ({ anio, mes }) =>
  `${MESES[mes - 1]} ${anio}`;

export function mesAnterior({ anio, mes }) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

// Primer y último día del mes en formato "YYYY-MM-DD" (para los filtros de fecha)
export function rangoDelMes({ anio, mes }) {
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const mm = String(mes).padStart(2, "0");
  return {
    desde: `${anio}-${mm}-01`,
    hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

// Variación porcentual contra el período anterior (null si no hay base para comparar)
export const variacion = (actual, anterior) =>
  anterior ? ((actual - anterior) / anterior) * 100 : null;

// Participación de un valor sobre el total, en porcentaje
export const participacion = (valor, total) =>
  total ? (valor / total) * 100 : 0;

// { ciudad: "Rosario", provincia: "Santa Fe" } -> "Rosario, Santa Fe". "CABA" una sola vez
export const formatUbicacion = ({ ciudad, provincia }) =>
  !provincia || ciudad === provincia ? ciudad : `${ciudad}, ${provincia}`;

export const iniciales = (nombre = "", apellido = "") =>
  `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
