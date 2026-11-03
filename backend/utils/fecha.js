const ZONA = process.env.ZONA_HORARIA || 'America/Mexico_City';

export function diaActual() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: ZONA });
}

