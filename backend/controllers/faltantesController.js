import { db } from '../config/firebase.js';
import { diaActual } from '../utils/fecha.js';

export async function listarFaltantes(req, res) {
  try {
    const [productosSnap, proveedoresSnap, manualesSnap] = await Promise.all([
      db.collection('productos').where('activo', '==', true).get(),
      db.collection('proveedores').get(),
      db.collection('faltantesManuales').where('estado', '==', 'pendiente').get(),
    ]);

    const nombresProveedor = new Map(proveedoresSnap.docs.map((doc) => [doc.id, doc.data().nombre]));

    const automaticos = productosSnap.docs
      .filter((doc) => doc.data().cantidad < doc.data().stockMinimo)
      .map((doc) => {
        const producto = doc.data();
        return {
          productoId: doc.id,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
          categoria: producto.categoria,
          proveedorId: producto.proveedorId,
          proveedorNombre: nombresProveedor.get(producto.proveedorId) || 'Sin proveedor',
          cantidad: producto.cantidad,
          stockMinimo: producto.stockMinimo,
          sugerido: producto.stockMinimo * 2 - producto.cantidad,
        };
      })
      .sort((a, b) => a.proveedorNombre.localeCompare(b.proveedorNombre) || a.nombre.localeCompare(b.nombre));

    const manuales = manualesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    manuales.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));

    res.json({ automaticos, manuales });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron leer los faltantes' });
  }
}

export async function crearFaltante(req, res) {
  const { nombre, cantidad } = req.body;

  const errores = [];
  if (typeof nombre !== 'string' || nombre.trim() === '') errores.push('El nombre es obligatorio');
  if (!Number.isInteger(cantidad) || cantidad <= 0) errores.push('La cantidad debe ser un entero mayor a 0');
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    const faltante = {
      nombre: nombre.trim(),
      cantidad,
      estado: 'pendiente',
      dia: diaActual(),
      creadoEn: new Date().toISOString(),
    };
    const ref = await db.collection('faltantesManuales').add(faltante);
    res.status(201).json({ id: ref.id, ...faltante });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar el faltante' });
  }
}

export async function eliminarFaltante(req, res) {
  try {
    const ref = db.collection('faltantesManuales').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Faltante no encontrado' });
    }
    await ref.delete();
    res.json({ ok: true, mensaje: 'Faltante eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo eliminar el faltante' });
  }
}