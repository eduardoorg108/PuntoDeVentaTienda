import { db } from '../config/firebase.js';
import { diaActual, esFechaValida, sumarDias, listarDias } from '../utils/fecha.js';

const MAX_DIAS = 366;
const METODOS = {
  efectivo: 'totalEfectivo',
  tarjeta: 'totalTarjeta',
  transferencia: 'totalTransferencia',
};

const redondear = (numero) => Math.round(numero * 100) / 100;
const gananciaDeItem = (item) =>
  (item.precioUnitario - (item.precioCompra ?? item.precioUnitario)) * item.cantidad;

function leerRango(query) {
  const hasta = query.hasta || diaActual();
  const desde = query.desde || sumarDias(hasta, -6);

  if (!esFechaValida(desde) || !esFechaValida(hasta)) {
    return { error: 'Las fechas deben ser reales y tener el formato AAAA-MM-DD' };
  }
  if (desde > hasta) {
    return { error: 'La fecha "desde" no puede ser posterior a "hasta"' };
  }
  if (listarDias(desde, hasta).length > MAX_DIAS) {
    return { error: `El rango no puede superar ${MAX_DIAS} días` };
  }
  return { desde, hasta };
}

async function ventasDelRango(desde, hasta) {
  const snapshot = await db
    .collection('ventas')
    .where('dia', '>=', desde)
    .where('dia', '<=', hasta)
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function ventasDiarias(req, res) {
  const rango = leerRango(req.query);
  if (rango.error) {
    return res.status(400).json({ error: rango.error });
  }

  try {
    const { desde, hasta } = rango;
    const ventas = await ventasDelRango(desde, hasta);

    const porDia = new Map(
      listarDias(desde, hasta).map((dia) => [
        dia,
        { dia, numeroVentas: 0, total: 0, totalEfectivo: 0, totalTarjeta: 0, totalTransferencia: 0, ganancia: 0 },
      ])
    );

    for (const venta of ventas) {
      const fila = porDia.get(venta.dia);
      fila.numeroVentas += 1;
      fila.total += venta.total;
      fila[METODOS[venta.metodoPago]] += venta.total;
      fila.ganancia += venta.items.reduce((suma, item) => suma + gananciaDeItem(item), 0);
    }

    const dias = [...porDia.values()].map((fila) => ({
      ...fila,
      total: redondear(fila.total),
      totalEfectivo: redondear(fila.totalEfectivo),
      totalTarjeta: redondear(fila.totalTarjeta),
      totalTransferencia: redondear(fila.totalTransferencia),
      ganancia: redondear(fila.ganancia),
    }));

    const suma = (campo) => redondear(dias.reduce((acumulado, fila) => acumulado + fila[campo], 0));
    const numeroVentas = dias.reduce((acumulado, fila) => acumulado + fila.numeroVentas, 0);
    const total = suma('total');

    res.json({
      desde,
      hasta,
      dias,
      resumen: {
        numeroVentas,
        total,
        ganancia: suma('ganancia'),
        ticketPromedio: numeroVentas > 0 ? redondear(total / numeroVentas) : 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron calcular las ventas diarias' });
  }
}

export async function masVendidos(req, res) {
  const rango = leerRango(req.query);
  if (rango.error) {
    return res.status(400).json({ error: rango.error });
  }

  const limite = req.query.limite === undefined ? 10 : Number(req.query.limite);
  if (!Number.isInteger(limite) || limite < 1 || limite > 50) {
    return res.status(400).json({ error: 'El límite debe ser un entero entre 1 y 50' });
  }

  try {
    const { desde, hasta } = rango;
    const ventas = await ventasDelRango(desde, hasta);

    const porProducto = new Map();
    for (const venta of ventas) {
      for (const item of venta.items) {
        const fila = porProducto.get(item.productoId) || {
          productoId: item.productoId,
          nombre: item.nombre,
          piezas: 0,
          ingresos: 0,
          ganancia: 0,
        };
        fila.piezas += item.cantidad;
        fila.ingresos += item.subtotal;
        fila.ganancia += gananciaDeItem(item);
        porProducto.set(item.productoId, fila);
      }
    }

    const productos = [...porProducto.values()]
      .sort((a, b) => b.piezas - a.piezas || b.ingresos - a.ingresos)
      .slice(0, limite)
      .map((fila) => ({
        ...fila,
        ingresos: redondear(fila.ingresos),
        ganancia: redondear(fila.ganancia),
      }));

    res.json({ desde, hasta, limite, productos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo calcular el ranking' });
  }
}