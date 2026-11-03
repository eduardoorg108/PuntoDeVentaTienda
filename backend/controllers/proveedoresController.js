import { db } from '../config/firebase.js';

const coleccion = db.collection('proveedores');
const CAMPOS = ['nombre', 'telefono', 'diasVisita', 'notas'];

function validarProveedor(datos, esEdicion) {
  const errores = [];
  const revisar = (campo) => !esEdicion || datos[campo] !== undefined;

  if (revisar('nombre') && (typeof datos.nombre !== 'string' || datos.nombre.trim() === '')) {
    errores.push('El nombre es obligatorio');
  }
  if (datos.telefono !== undefined && typeof datos.telefono !== 'string') {
    errores.push('El teléfono debe ser texto');
  }
  if (datos.notas !== undefined && typeof datos.notas !== 'string') {
    errores.push('Las notas deben ser texto');
  }
  if (datos.diasVisita !== undefined) {
    const validos =
      Array.isArray(datos.diasVisita) &&
      datos.diasVisita.every((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6);
    if (!validos) {
      errores.push('Los días de visita deben ser números del 0 (domingo) al 6 (sábado)');
    }
  }
  return errores;
}

function soloPermitidos(datos) {
  const limpio = {};
  for (const campo of CAMPOS) {
    if (datos[campo] !== undefined) {
      limpio[campo] = typeof datos[campo] === 'string' ? datos[campo].trim() : datos[campo];
    }
  }
  if (limpio.diasVisita) {
    limpio.diasVisita = [...new Set(limpio.diasVisita)].sort((a, b) => a - b);
  }
  return limpio;
}

export async function listarProveedores(req, res) {
  try {
    const snapshot = await coleccion.where('activo', '==', true).get();
    const proveedores = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre));
    res.json(proveedores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron leer los proveedores' });
  }
}

export async function crearProveedor(req, res) {
  try {
    const errores = validarProveedor(req.body, false);
    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }

    const ahora = new Date().toISOString();
    const nuevo = {
      telefono: '',
      diasVisita: [],
      notas: '',
      ...soloPermitidos(req.body),
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    const ref = await coleccion.add(nuevo);
    res.status(201).json({ id: ref.id, ...nuevo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo crear el proveedor' });
  }
}

export async function actualizarProveedor(req, res) {
  try {
    const ref = coleccion.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || !doc.data().activo) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const errores = validarProveedor(req.body, true);
    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }

    const datos = { ...soloPermitidos(req.body), actualizadoEn: new Date().toISOString() };
    await ref.update(datos);
    res.json({ id: ref.id, ...doc.data(), ...datos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo actualizar el proveedor' });
  }
}

export async function eliminarProveedor(req, res) {
  try {
    const ref = coleccion.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || !doc.data().activo) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    await ref.update({ activo: false, actualizadoEn: new Date().toISOString() });
    res.json({ ok: true, mensaje: 'Proveedor desactivado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo eliminar el proveedor' });
  }
}