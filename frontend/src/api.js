import { auth } from './firebase';

const URL_BASE = import.meta.env.VITE_API_URL;

export async function api(ruta, opciones = {}) {
  const usuario = auth.currentUser;
  if (!usuario) {
    throw new Error('No has iniciado sesión');
  }

  const token = await usuario.getIdToken();

  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opciones.headers,
    },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje = datos?.error || datos?.errores?.join('. ') || 'Ocurrió un error';
    const error = new Error(mensaje);
    error.estado = respuesta.status;
    throw error;
  }

  return datos;
}