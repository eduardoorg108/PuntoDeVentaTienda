const ZONA = process.env.ZONA_HORARIA || 'America/Mexico_City';

export function diaActual() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: ZONA });
}

export function esFechaValida(dia) {
  if (typeof dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    return false;
  }
  const fecha = new Date(`${dia}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === dia;
}

export function sumarDias(dia, cantidad) {
  const fecha = new Date(`${dia}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + cantidad);
  return fecha.toISOString().slice(0, 10);
}

export function listarDias(desde, hasta) {
  const dias = [];
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
    dias.push(dia);
  }
  return dias;
}