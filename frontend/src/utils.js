const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function formatoMoneda(valor) {
  return moneda.format(valor);
}

export function formatoFecha(dia) {
  const [anio, mes, diaMes] = dia.split('-');
  return `${diaMes}/${mes}/${anio}`;
}

export function hoyLocal() {
  return new Date().toLocaleDateString('sv-SE');
}

export function diasParaCaducar(dia) {
  const unDia = 24 * 60 * 60 * 1000;
  const diferencia = Date.parse(`${dia}T00:00:00Z`) - Date.parse(`${hoyLocal()}T00:00:00Z`);
  return Math.round(diferencia / unDia);
}
export const NOMBRE_TIENDA = 'Mi Tienda';

export function redondear(numero) {
  return Math.round(numero * 100) / 100;
}

export function formatoFechaHora(iso) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}