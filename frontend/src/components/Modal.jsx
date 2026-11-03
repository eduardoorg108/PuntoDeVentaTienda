import { useEffect } from 'react';

export default function Modal({ titulo, onCerrar, children }) {
  useEffect(() => {
    function alPresionar(evento) {
      if (evento.key === 'Escape') {
        onCerrar();
      }
    }
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    <div className="modal-fondo">
      <div className="modal tarjeta" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-encabezado">
          <h2>{titulo}</h2>
          <button className="boton boton-secundario boton-pequeno" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}