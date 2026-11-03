import { db } from '../config/firebase.js';

const coleccion = db.collection('productos');

const CAMPOS = [
  'nombre', 'codigoBarras', 'categoria', 'precioVenta', 'precioCompra',
  'cantidad', 'stockMinimo', 'proveedorId', 'fotoUrl', 'fechaCaducidad',
];

function validarProducto(datos, esEdicion) {
  const errores = [];
  const revisar = (campo) => !esEdicion || datos[campo] !== undefined;

  if (revisar('nombre') && (typeof datos.nombre !== 'string' || datos.nombre.trim() === '')) {
    errores.push('El nombre es obligatorio');
  }
  if (revisar('codigoBarras') && (typeof datos.codigoBarras !== 'string' || datos.codigoBarras.trim() === '')) {
    errores.push('El código de barras es obligatorio');
  }
  if (revisar('precioVenta') && !(typeof datos.precioVenta === 'number' && datos.precioVenta > 0)) {
    errores.push('El precio de venta debe ser un número mayor a 0');
  }
  if (revisar('precioCompra') && !(typeof datos.precioCompra === 'number' && datos.precioCompra >= 0)) {
    errores.push('El precio de compra debe ser un número igual o mayor a 0');
  }
  if (revisar('cantidad') && !(Number.isInteger(datos.cantidad) && datos.cantidad >= 0)) {
    errores.push('La cantidad debe ser un número entero igual o mayor a 0');
  }
  if (revisar('stockMinimo') && !(Number.isInteger(datos.stockMinimo) && datos.stockMinimo >= 0)) {
    errores.push('El stock mínimo debe ser un número entero igual o mayor a 0');
  }
  if (datos.fechaCaducidad && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaCaducidad)) {
    errores.push('La fecha de caducidad debe tener el formato AAAA-MM-DD');
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
  return limpio;
}

async function existeCodigo(codigo) {
  const snapshot = await coleccion
    .where('codigoBarras', '==', codigo)
    .where('activo', '==', true)
    .limit(1)
    .get();
  return !snapshot.empty;
}

export async function listarProductos(req, res) {
  try {
    const snapshot = await coleccion.where('activo', '==', true).get();
    const productos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron leer los productos' });
  }
}

export async function buscarPorCodigo(req, res) {
  try {
    const snapshot = await coleccion
      .where('codigoBarras', '==', req.params.codigoBarras)
      .where('activo', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'No existe un producto con ese código' });
    }
    const doc = snapshot.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo buscar el producto' });
  }
}

export async function crearProducto(req, res) {
  try {
    const errores = validarProducto(req.body, false);
    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }

    const datos = soloPermitidos(req.body);
    if (await existeCodigo(datos.codigoBarras)) {
      return res.status(409).json({ error: 'Ya existe un producto con ese código de barras' });
    }

    const ahora = new Date().toISOString();
    const nuevo = {
      categoria: 'General',
      proveedorId: null,
      fotoUrl: '',
      fechaCaducidad: null,
      ...datos,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    const ref = await coleccion.add(nuevo);
    res.status(201).json({ id: ref.id, ...nuevo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo crear el producto' });
  }
}

export async function actualizarProducto(req, res) {
  try {
    const ref = coleccion.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || !doc.data().activo) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const errores = validarProducto(req.body, true);
    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }

    const datos = soloPermitidos(req.body);
    const cambioCodigo = datos.codigoBarras && datos.codigoBarras !== doc.data().codigoBarras;
    if (cambioCodigo && (await existeCodigo(datos.codigoBarras))) {
      return res.status(409).json({ error: 'Ya existe un producto con ese código de barras' });
    }

    datos.actualizadoEn = new Date().toISOString();
    await ref.update(datos);
    res.json({ id: ref.id, ...doc.data(), ...datos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo actualizar el producto' });
  }
}

export async function eliminarProducto(req, res) {
  try {
    const ref = coleccion.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || !doc.data().activo) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await ref.update({ activo: false, actualizadoEn: new Date().toISOString() });
    res.json({ ok: true, mensaje: 'Producto desactivado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo eliminar el producto' });
  }
}