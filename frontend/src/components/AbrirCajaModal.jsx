import { useState } from 'react';
import { api } from '../api';
import Modal from './Modal';
import { formatoMoneda } from '../utils';

export default function AbrirCajaModal({ fondoSugerido, onAbierta, onCerrar }) {
  const [fondo, setFondo] = useState(String(fondoSugerido));
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api('/api/caja/abrir', { method: 'POST', body: { fondoInicial: Number(fondo) } });
      onAbierta();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Abrir caja" onCerrar={onCerrar}>
      <form onSubmit={enviar}>
        <p className="texto-suave">
          Indica con cuánto efectivo empiezas el día.
          {fondoSugerido > 0 && ` El último cierre dejó ${formatoMoneda(fondoSugerido)} de fondo.`}
        </p>

        <label>
          Fondo inicial
          <input
            type="number"
            min="0"
            step="0.01"
            value={fondo}
            onChange={(e) => setFondo(e.target.value)}
            required
            autoFocus
          />
        </label>

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <div className="formulario-acciones">
          <button className="boton boton-secundario" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="boton" type="submit" disabled={enviando}>
            {enviando ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </div>
      </form>
    </Modal>
  );
}