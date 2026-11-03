import { db } from '../config/firebase.js';
import { diaActual, esFechaValida } from '../utils/fecha.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-\d{2}$/;

const redondear = (numero) => Math.round(numero * 100) / 100;

class ErrorVisita extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

export async function listarVisitas(req, res) {
  try {
    const mes = req.query.mes || diaActual().slice(0, 7);
    if (!MES.test(mes)) {
      return res.status(400).json({ error: 'El mes debe tener el formato AAAA-MM' });
    }

    const snapshot = await db
      .collection('visitas')
      .where('fecha', '>=', `${mes}-01`)
      .where('fecha', '<=', `${mes}-31`)
      .get();

    const visitas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    visitas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    res.json(visitas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron leer las visitas' });
  }
}

export async function programarVisita(req, res) {
  const { proveedorId, fecha, notas } = req.body;

  const errores = [];
  if (typeof proveedorId !== 'string' || proveedorId === '') errores.push('El proveedor es obligatorio');
  if (typeof fecha !== 'string' || !FECHA.test(fecha)) errores.push('La fecha debe tener el formato AAAA-MM-DD');
  if (notas !== undefined && typeof notas !== 'string') errores.push('Las notas deben ser texto');
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    const proveedor = await db.collection('proveedores').doc(proveedorId).get();
    if (!proveedor.exists || !proveedor.data().activo) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const visita = {
      proveedorId,
      proveedorNombre: proveedor.data().nombre,
      fecha,
      estado: 'pendiente',
      items: [],
      notas: (notas || '').trim(),
      creadoEn: new Date().toISOString(),
      recibidaEn: null,
    };

    const ref = await db.collection('visitas').add(visita);
    res.status(201).json({ id: ref.id, ...visita });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo programar la visita' });
  }
}

export async function recibirVisita(req, res) {
  const { items, notas } = req.body;

  const errores = [];
  if (!Array.isArray(items) || items.length === 0) {
    errores.push('Debes indicar al menos un producto recibido');
  } else {
    items.forEach((item, i) => {
      if (typeof item.productoId !== 'string' || item.productoId === '') {
        errores.push(`El producto ${i + 1} no tiene id`);
      }
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        errores.push(`La cantidad del producto ${i + 1} debe ser un entero mayor a 0`);
      }
      if (
        item.costoUnitario !== undefined &&
        !(typeof item.costoUnitario === 'number' && Number.isFinite(item.costoUnitario) && item.costoUnitario >= 0)
      ) {
        errores.push(`El costo del producto ${i + 1} debe ser un número igual o mayor a 0`);
      }
    });
  }
  if (notas !== undefined && typeof notas !== 'string') errores.push('Las notas deben ser texto');
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    const recibidos = new Map();
    for (const item of items) {
      const previo = recibidos.get(item.productoId) || { cantidad: 0 };
      recibidos.set(item.productoId, {
        cantidad: previo.cantidad + item.cantidad,
        costoUnitario: item.costoUnitario !== undefined ? redondear(item.costoUnitario) : previo.costoUnitario,
      });
    }

    const refVisita = db.collection('visitas').doc(req.params.id);

    const resultado = await db.runTransaction(async (tx) => {
      const docVisita = await tx.get(refVisita);
      if (!docVisita.exists) throw new ErrorVisita(404, 'Visita no encontrada');
      if (docVisita.data().estado === 'recibida') throw new ErrorVisita(409, 'Esta visita ya fue recibida');

      const refsProductos = [...recibidos.keys()].map((id) => db.collection('productos').doc(id));
      const docsProductos = await tx.getAll(...refsProductos);

      const ahora = new Date().toISOString();
      const itemsGuardados = [];

      for (const doc of docsProductos) {
        if (!doc.exists || !doc.data().activo) {
          throw new ErrorVisita(404, `El producto ${doc.id} no existe o está desactivado`);
        }

        const producto = doc.data();
        const { cantidad, costoUnitario } = recibidos.get(doc.id);

        const cambios = { cantidad: producto.cantidad + cantidad, actualizadoEn: ahora };
        if (costoUnitario !== undefined) cambios.precioCompra = costoUnitario;
        tx.update(doc.ref, cambios);

        itemsGuardados.push({
          productoId: doc.id,
          nombre: producto.nombre,
          cantidad,
          costoUnitario: costoUnitario ?? null,
        });
      }

      const cambiosVisita = {
        estado: 'recibida',
        items: itemsGuardados,
        recibidaEn: ahora,
        ...(notas ? { notas: notas.trim() } : {}),
      };
      tx.update(refVisita, cambiosVisita);

      return { id: refVisita.id, ...docVisita.data(), ...cambiosVisita };
    });

    res.json(resultado);
  } catch (error) {
    if (error instanceof ErrorVisita) {
      return res.status(error.estado).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo registrar la recepción' });
  }
}

export async function cancelarVisita(req, res) {
  try {
    const ref = db.collection('visitas').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }
    if (doc.data().estado === 'recibida') {
      return res.status(409).json({ error: 'No se puede cancelar una visita ya recibida' });
    }
    await ref.delete();
    res.json({ ok: true, mensaje: 'Visita cancelada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo cancelar la visita' });
  }
}