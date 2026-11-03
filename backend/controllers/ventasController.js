import { db } from '../config/firebase.js';
import { diaActual, esFechaValida } from '../utils/fecha.js';

const METODOS = ['efectivo', 'tarjeta', 'transferencia'];

const redondear = (numero) => Math.round(numero * 100) / 100;

class ErrorVenta extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

function validarVenta(datos) {
  const errores = [];

  if (!Array.isArray(datos.items) || datos.items.length === 0) {
    errores.push('La venta debe tener al menos un producto');
  } else {
    datos.items.forEach((item, i) => {
      if (typeof item.productoId !== 'string' || item.productoId === '') {
        errores.push(`El producto ${i + 1} no tiene id`);
      }
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        errores.push(`La cantidad del producto ${i + 1} debe ser un entero mayor a 0`);
      }
    });
  }

  if (!METODOS.includes(datos.metodoPago)) {
    errores.push('El método de pago debe ser efectivo, tarjeta o transferencia');
  }

  if (datos.metodoPago === 'efectivo' && !(typeof datos.montoRecibido === 'number' && datos.montoRecibido > 0)) {
    errores.push('En efectivo debes indicar el monto recibido');
  }

  return errores;
}

export async function registrarVenta(req, res) {
  const errores = validarVenta(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    const { metodoPago, montoRecibido } = req.body;
    const esEfectivo = metodoPago === 'efectivo';

    const pedidos = new Map();
    for (const item of req.body.items) {
      pedidos.set(item.productoId, (pedidos.get(item.productoId) || 0) + item.cantidad);
    }

    const dia = diaActual();
    const claveDia = dia.replaceAll('-', '');
    const refContador = db.collection('contadores').doc(`ventas-${claveDia}`);
    const refVenta = db.collection('ventas').doc();
    const refCorte = db.collection('cortes').doc(dia);

    const resultado = await db.runTransaction(async (tx) => {
      const docCorte = await tx.get(refCorte);
        if (!docCorte.exists || docCorte.data().estado !== 'abierto') {
        throw new ErrorVenta(409, 'La caja no está abierta. Ábrela antes de vender');
        }  
      const refsProductos = [...pedidos.keys()].map((id) => db.collection('productos').doc(id));
      const docsProductos = await tx.getAll(...refsProductos);
      const docContador = await tx.get(refContador);

      const items = [];
      const avisos = [];
      let total = 0;

      for (const doc of docsProductos) {
        if (!doc.exists || !doc.data().activo) {
          throw new ErrorVenta(404, `El producto ${doc.id} no existe o está desactivado`);
        }

        const producto = doc.data();
        const cantidad = pedidos.get(doc.id);
        const subtotal = redondear(producto.precioVenta * cantidad);
        const nuevaCantidad = producto.cantidad - cantidad;

        if (nuevaCantidad < 0) {
          avisos.push(`${producto.nombre}: quedó en ${nuevaCantidad} (había ${producto.cantidad})`);
        }

        items.push({
          productoId: doc.id,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
          cantidad,
          precioUnitario: producto.precioVenta,
          precioCompra: producto.precioCompra,
          subtotal,
        });
        total += subtotal;

        tx.update(doc.ref, { cantidad: nuevaCantidad, actualizadoEn: new Date().toISOString() });
      }

      total = redondear(total);

      let cambio = null;
      if (esEfectivo) {
        if (montoRecibido < total) {
          throw new ErrorVenta(400, `El monto recibido (${montoRecibido}) no cubre el total (${total})`);
        }
        cambio = redondear(montoRecibido - total);
      }

      const numero = (docContador.exists ? docContador.data().ultimo : 0) + 1;
      const folio = `${claveDia}-${String(numero).padStart(4, '0')}`;
      tx.set(refContador, { ultimo: numero });

      const venta = {
        folio,
        fecha: new Date().toISOString(),
        dia,
        items,
        total,
        metodoPago,
        montoRecibido: esEfectivo ? montoRecibido : null,
        cambio,
      };
      tx.set(refVenta, venta);

      return { id: refVenta.id, ...venta, avisos };
    });

    res.status(201).json(resultado);
  } catch (error) {
    if (error instanceof ErrorVenta) {
      return res.status(error.estado).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo registrar la venta' });
  }
}

export async function listarVentas(req, res) {
  try {
    const dia = req.query.dia || diaActual();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
      return res.status(400).json({ error: 'El día debe tener el formato AAAA-MM-DD' });
    }

    const snapshot = await db.collection('ventas').where('dia', '==', dia).get();
    const ventas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    ventas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    res.json(ventas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron leer las ventas' });
  }
}