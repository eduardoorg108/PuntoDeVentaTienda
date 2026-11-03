import { db } from '../config/firebase.js';
import { diaActual, esFechaValida } from '../utils/fecha.js';

const TIPOS = ['gasto', 'retiro'];

const redondear = (numero) => Math.round(numero * 100) / 100;
const esMonto = (valor) => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
const leer = (consulta, tx) => (tx ? tx.get(consulta) : consulta.get());

class ErrorCaja extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

async function datosDelDia(dia, tx) {
  const [ventasSnap, movimientosSnap] = await Promise.all([
    leer(db.collection('ventas').where('dia', '==', dia), tx),
    leer(db.collection('movimientosCaja').where('dia', '==', dia), tx),
  ]);

  const ventas = ventasSnap.docs.map((doc) => doc.data());
  const movimientos = movimientosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { ventas, movimientos };
}

function resumir(ventas, movimientos, fondoInicial) {
  const totales = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  for (const venta of ventas) {
    totales[venta.metodoPago] += venta.total;
  }

  let gastos = 0;
  let retiros = 0;
  for (const mov of movimientos) {
    if (mov.tipo === 'gasto') gastos += mov.monto;
    if (mov.tipo === 'retiro') retiros += mov.monto;
  }

  const totalEfectivo = redondear(totales.efectivo);
  const totalTarjeta = redondear(totales.tarjeta);
  const totalTransferencia = redondear(totales.transferencia);

  return {
    numeroVentas: ventas.length,
    totalEfectivo,
    totalTarjeta,
    totalTransferencia,
    totalVentas: redondear(totalEfectivo + totalTarjeta + totalTransferencia),
    gastos: redondear(gastos),
    retiros: redondear(retiros),
    efectivoEsperado: redondear(fondoInicial + totalEfectivo - gastos - retiros),
  };
}

async function armarEstado(dia) {
  const doc = await db.collection('cortes').doc(dia).get();
  if (!doc.exists) return null;

  const corte = doc.data();
  const { ventas, movimientos } = await datosDelDia(dia);

  if (corte.estado === 'abierto') {
    return { ...corte, ...resumir(ventas, movimientos, corte.fondoInicial), movimientos };
  }
  return { ...corte, movimientos };
}

export async function estadoCaja(req, res) {
  try {
    const dia = diaActual();
    const estado = await armarEstado(dia);

    if (!estado) {
      const ajustes = await db.collection('ajustes').doc('caja').get();
      const fondoSugerido = ajustes.exists ? ajustes.data().fondoSugerido : 0;
      return res.json({ dia, estado: 'sinAbrir', fondoSugerido });
    }

    res.json(estado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo leer la caja' });
  }
}

export async function corteDelDia(req, res) {
  try {
    const { dia } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
      return res.status(400).json({ error: 'El día debe tener el formato AAAA-MM-DD' });
    }

    const estado = await armarEstado(dia);
    if (!estado) {
      return res.status(404).json({ error: 'No hay corte de caja para ese día' });
    }

    res.json(estado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo leer el corte' });
  }
}

export async function abrirCaja(req, res) {
  const { fondoInicial } = req.body;
  if (!esMonto(fondoInicial)) {
    return res.status(400).json({ error: 'El fondo inicial debe ser un número igual o mayor a 0' });
  }

  try {
    const dia = diaActual();
    const corte = {
      dia,
      estado: 'abierto',
      fondoInicial: redondear(fondoInicial),
      abiertoEn: new Date().toISOString(),
    };

    await db.collection('cortes').doc(dia).create(corte);
    res.status(201).json(corte);
  } catch (error) {
    if (error.code === 6) {
      return res.status(409).json({ error: 'La caja de hoy ya fue abierta (o cerrada)' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo abrir la caja' });
  }
}

export async function registrarMovimiento(req, res) {
  const { tipo, monto, concepto } = req.body;

  const errores = [];
  if (!TIPOS.includes(tipo)) errores.push('El tipo debe ser gasto o retiro');
  if (!(typeof monto === 'number' && Number.isFinite(monto) && monto > 0)) {
    errores.push('El monto debe ser un número mayor a 0');
  }
  if (typeof concepto !== 'string' || concepto.trim() === '') {
    errores.push('El concepto es obligatorio');
  }
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    const dia = diaActual();
    const doc = await db.collection('cortes').doc(dia).get();
    if (!doc.exists || doc.data().estado !== 'abierto') {
      return res.status(409).json({ error: 'La caja no está abierta' });
    }

    const movimiento = {
      dia,
      tipo,
      monto: redondear(monto),
      concepto: concepto.trim(),
      fecha: new Date().toISOString(),
    };
    const ref = await db.collection('movimientosCaja').add(movimiento);
    res.status(201).json({ id: ref.id, ...movimiento });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo registrar el movimiento' });
  }
}

export async function cerrarCaja(req, res) {
  const { efectivoContado, fondoSiguiente } = req.body;

  const errores = [];
  if (!esMonto(efectivoContado)) errores.push('El efectivo contado debe ser un número igual o mayor a 0');
  if (!esMonto(fondoSiguiente)) errores.push('El fondo para mañana debe ser un número igual o mayor a 0');
  if (errores.length === 0 && fondoSiguiente > efectivoContado) {
    errores.push('El fondo para mañana no puede ser mayor al efectivo contado');
  }
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    const dia = diaActual();
    const refCorte = db.collection('cortes').doc(dia);

    const corteCerrado = await db.runTransaction(async (tx) => {
      const doc = await tx.get(refCorte);
      if (!doc.exists) throw new ErrorCaja(409, 'La caja de hoy no se ha abierto');
      if (doc.data().estado === 'cerrado') throw new ErrorCaja(409, 'La caja de hoy ya está cerrada');

      const { ventas, movimientos } = await datosDelDia(dia, tx);
      const resumen = resumir(ventas, movimientos, doc.data().fondoInicial);

      const contado = redondear(efectivoContado);
      const diferencia = redondear(contado - resumen.efectivoEsperado);

      const corte = {
        ...doc.data(),
        ...resumen,
        estado: 'cerrado',
        efectivoContado: contado,
        diferencia,
        resultado: diferencia === 0 ? 'cuadrado' : diferencia > 0 ? 'sobrante' : 'faltante',
        fondoSiguiente: redondear(fondoSiguiente),
        efectivoARetirar: redondear(contado - fondoSiguiente),
        cerradoEn: new Date().toISOString(),
      };

      tx.set(refCorte, corte);
      tx.set(db.collection('ajustes').doc('caja'), { fondoSugerido: corte.fondoSiguiente });
      return corte;
    });

    res.json(corteCerrado);
  } catch (error) {
    if (error instanceof ErrorCaja) {
      return res.status(error.estado).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo cerrar la caja' });
  }
}