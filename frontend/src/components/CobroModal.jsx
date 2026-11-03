import { useState } from 'react';
import { api } from '../api';
import Modal from './Modal';
import { descargarTicket } from '../ticketPdf';
import { formatoMoneda, redondear } from '../utils';

const METODOS = [
  { valor: 'efectivo', texto: 'Efectivo' },
  { valor: 'tarjeta', texto: 'Tarjeta' },
  { valor: 'transferencia', texto: 'Transferencia' },
];
const BILLETES = [50, 100, 200, 500, 1000];

export default function CobroModal({ total, lineas, onVentaRegistrada, onCerrar }) {
  const [metodo, setMetodo] = useState('efectivo');
  const [recibido, setRecibido] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [venta, setVenta] = useState(null);

  const montoRecibido = Number(recibido);
  const diferencia = redondear(montoRecibido - total);
  const faltaDinero = metodo === 'efectivo' && diferencia < 0;

  async function confirmar(evento) {
    evento.preventDefault();
    if (faltaDinero || enviando) return;

    setError('');
    setEnviando(true);

    const cuerpo = {
      items: lineas.map((linea) => ({ productoId: linea.producto.id, cantidad: linea.cantidad })),
      metodoPago: metodo,
    };
    if (metodo === 'efectivo') {
      cuerpo.montoRecibido = montoRecibido;
    }

    try {
      const respuesta = await api('/api/ventas', { method: 'POST', body: cuerpo });
      setVenta(respuesta);
      onVentaRegistrada();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (venta) {
    return (
      <Modal titulo="Venta registrada" onCerrar={onCerrar}>
        <div className="resumen-venta">
          <p className="texto-suave">Folio {venta.folio}</p>
          <p className="resumen-total">{formatoMoneda(venta.total)}</p>
        </div>

        {venta.metodoPago === 'efectivo' && (
          <div className="cambio-caja">
            <span>Cambio</span>
            <strong className="texto-exito">{formatoMoneda(venta.cambio)}</strong>
          </div>
        )}

        {venta.avisos.length > 0 && (
          <div className="aviso aviso-amarillo">
            <div>
              Stock negativo:
              <ul>
                {venta.avisos.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="formulario-acciones">
          <button className="boton boton-secundario" onClick={() => descargarTicket(venta)}>
            Descargar ticket
          </button>
          <button className="boton" onClick={onCerrar} autoFocus>
            Nueva venta
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Cobrar" onCerrar={onCerrar}>
      <form onSubmit={confirmar}>
        <p className="resumen-total">{formatoMoneda(total)}</p>

        <div className="metodos">
          {METODOS.map((m) => (
            <button
              key={m.valor}
              type="button"
              className={`metodo ${metodo === m.valor ? 'activo' : ''}`}
              onClick={() => setMetodo(m.valor)}
            >
              {m.texto}
            </button>
          ))}
        </div>

        {metodo === 'efectivo' && (
          <>
            <label>
              Monto recibido
              <input
                type="number"
                min="0"
                step="0.01"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
                autoFocus
              />
            </label>

            <div className="billetes">
              <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setRecibido(String(total))}>
                Exacto
              </button>
              {BILLETES.map((billete) => (
                <button
                  key={billete}
                  type="button"
                  className="boton boton-secundario boton-pequeno"
                  onClick={() => setRecibido(String(billete))}
                >
                  {formatoMoneda(billete)}
                </button>
              ))}
            </div>

            <div className="cambio-caja">
              <span>{faltaDinero ? 'Faltan' : 'Cambio'}</span>
              <strong className={faltaDinero ? 'texto-alerta' : 'texto-exito'}>
                {formatoMoneda(Math.abs(diferencia))}
              </strong>
            </div>
          </>
        )}

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <div className="formulario-acciones">
          <button className="boton boton-secundario" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="boton" type="submit" disabled={enviando || faltaDinero}>
            {enviando ? 'Cobrando...' : 'Confirmar cobro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}