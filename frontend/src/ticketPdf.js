import { jsPDF } from 'jspdf';
import { formatoMoneda, formatoFechaHora, NOMBRE_TIENDA } from './utils';

const ANCHO = 80;
const MARGEN = 4;
const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

function dibujar(doc, venta) {
  const centro = ANCHO / 2;
  const derecha = ANCHO - MARGEN;
  let y = 8;

  const linea = () => {
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(MARGEN, y, derecha, y);
    doc.setLineDashPattern([], 0);
    y += 4;
  };

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text(NOMBRE_TIENDA, centro, y, { align: 'center' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(`Folio: ${venta.folio}`, centro, y, { align: 'center' });
  y += 4;
  doc.text(formatoFechaHora(venta.fecha), centro, y, { align: 'center' });
  y += 4;
  linea();

  for (const item of venta.items) {
    const nombre = doc.splitTextToSize(item.nombre, ANCHO - MARGEN * 2);
    doc.text(nombre, MARGEN, y);
    y += nombre.length * 3.5;
    doc.text(`${item.cantidad} x ${formatoMoneda(item.precioUnitario)}`, MARGEN, y);
    doc.text(formatoMoneda(item.subtotal), derecha, y, { align: 'right' });
    y += 4.5;
  }
  linea();

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', MARGEN, y);
  doc.text(formatoMoneda(venta.total), derecha, y, { align: 'right' });
  y += 6;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(`Pago: ${METODOS[venta.metodoPago]}`, MARGEN, y);
  y += 4;

  if (venta.metodoPago === 'efectivo') {
    doc.text('Recibido', MARGEN, y);
    doc.text(formatoMoneda(venta.montoRecibido), derecha, y, { align: 'right' });
    y += 4;
    doc.text('Cambio', MARGEN, y);
    doc.text(formatoMoneda(venta.cambio), derecha, y, { align: 'right' });
    y += 4;
  }

  y += 2;
  linea();
  doc.text('¡Gracias por su compra!', centro, y, { align: 'center' });
  y += 4;

  return y;
}

export function descargarTicket(venta) {
  const medidor = new jsPDF({ unit: 'mm', format: [ANCHO, 600] });
  const alto = Math.max(dibujar(medidor, venta) + 4, ANCHO + 5);

  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, alto] });
  dibujar(doc, venta);
  doc.save(`ticket-${venta.folio}.pdf`);
}