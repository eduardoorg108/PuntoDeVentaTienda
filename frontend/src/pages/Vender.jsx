import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import AbrirCajaModal from '../components/AbrirCajaModal';
import CobroModal from '../components/CobroModal';
import { formatoMoneda, redondear } from '../utils';

export default function Vender() {
  const [productos, setProductos] = useState([]);
  const [caja, setCaja] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ticket, setTicket] = useState([]);
  const [modal, setModal] = useState(null);
  const entradaRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const [listaProductos, estadoCaja] = await Promise.all([
        api('/api/productos'),
        api('/api/caja/hoy'),
      ]);
      setProductos(listaProductos);
      setCaja(estadoCaja);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (modal === null) {
      entradaRef.current?.focus();
    }
  }, [modal]);

  const texto = busqueda.trim().toLowerCase();
  const sugerencias =
    texto === ''
      ? []
      : productos
          .filter((p) => p.nombre.toLowerCase().includes(texto) || p.codigoBarras.toLowerCase().includes(texto))
          .slice(0, 8);

  const total = redondear(ticket.reduce((suma, linea) => suma + linea.producto.precioVenta * linea.cantidad, 0));
  const cajaAbierta = caja?.estado === 'abierto';

  function agregar(producto) {
    setTicket((actual) => {
      const existe = actual.some((linea) => linea.producto.id === producto.id);
      if (existe) {
        return actual.map((linea) =>
          linea.producto.id === producto.id ? { ...linea, cantidad: linea.cantidad + 1 } : linea
        );
      }
      return [...actual, { producto, cantidad: 1 }];
    });
    setBusqueda('');
    entradaRef.current?.focus();
  }

  function alEnviarBusqueda(evento) {
    evento.preventDefault();
    if (texto === '') return;

    const exacto = productos.find((p) => p.codigoBarras.toLowerCase() === texto);
    if (exacto) {
      agregar(exacto);
    } else if (sugerencias.length === 1) {
      agregar(sugerencias[0]);
    }
  }

  function cambiarCantidad(id, nueva) {
    if (!Number.isInteger(nueva) || nueva < 1) return;
    setTicket((actual) =>
      actual.map((linea) => (linea.producto.id === id ? { ...linea, cantidad: nueva } : linea))
    );
  }

  function quitar(id) {
    setTicket((actual) => actual.filter((linea) => linea.producto.id !== id));
  }

  function vaciar() {
    if (window.confirm('¿Vaciar el ticket?')) {
      setTicket([]);
    }
  }

  return (
    <section>
      <div className="encabezado-pagina">
        <div>
          <h1>Vender</h1>
          <p className="texto-suave">Escanea o busca los productos y cobra.</p>
        </div>
        {cajaAbierta && (
          <span className="etiqueta etiqueta-exito">Caja abierta · Fondo {formatoMoneda(caja.fondoInicial)}</span>
        )}
      </div>

      {error && (
        <p className="mensaje-error" role="alert">
          {error}{' '}
          <button className="boton boton-secundario boton-pequeno" onClick={cargar}>
            Reintentar
          </button>
        </p>
      )}

      {caja?.estado === 'sinAbrir' && (
        <div className="aviso aviso-amarillo">
          <span>La caja de hoy no está abierta. Ábrela para poder cobrar.</span>
          <button className="boton boton-pequeno" onClick={() => setModal('abrirCaja')}>
            Abrir caja
          </button>
        </div>
      )}

      {caja?.estado === 'cerrado' && (
        <div className="aviso aviso-rojo">
          <span>La caja de hoy ya fue cerrada. No se pueden registrar más ventas hasta mañana.</span>
        </div>
      )}

      <div className="vender-grid">
        <div>
          <form className="buscador" onSubmit={alEnviarBusqueda}>
            <input
              ref={entradaRef}
              type="search"
              placeholder="Escanea el código o escribe el nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              disabled={cargando}
            />
          </form>

          {sugerencias.length > 0 && (
            <ul className="sugerencias tarjeta">
              {sugerencias.map((p) => (
                <li key={p.id}>
                  <button type="button" className="sugerencia" onClick={() => agregar(p)}>
                    <span>
                      <strong>{p.nombre}</strong>
                      <span className="codigo">
                        {p.codigoBarras} · Stock {p.cantidad}
                      </span>
                    </span>
                    <span>{formatoMoneda(p.precioVenta)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {texto !== '' && sugerencias.length === 0 && (
            <p className="vacio">Ningún producto coincide con «{busqueda}».</p>
          )}

          {texto === '' && !cargando && (
            <p className="vacio">
              {productos.length === 0
                ? 'No hay productos. Agrégalos en la sección Productos.'
                : 'Escanea un código de barras o escribe el nombre de un producto.'}
            </p>
          )}
        </div>

        <aside className="tarjeta ticket">
          <h2>Ticket</h2>

          {ticket.length === 0 && <p className="vacio">El ticket está vacío.</p>}

          <ul className="lineas">
            {ticket.map(({ producto, cantidad }) => (
              <li key={producto.id} className="linea">
                <div className="linea-nombre">
                  {producto.nombre}
                  {cantidad > producto.cantidad && (
                    <span className="etiqueta etiqueta-aviso">Stock {producto.cantidad}</span>
                  )}
                  <span className="codigo">{formatoMoneda(producto.precioVenta)} c/u</span>
                </div>

                <div className="linea-cantidad">
                  <button
                    type="button"
                    className="boton boton-secundario boton-pequeno"
                    onClick={() => cambiarCantidad(producto.id, cantidad - 1)}
                    aria-label="Quitar una pieza"
                  >
                    −
                  </button>
                  <input
                    className="cantidad-campo"
                    type="number"
                    min="1"
                    step="1"
                    key={`${producto.id}-${cantidad}`}
                    defaultValue={cantidad}
                    onBlur={(e) => {
                      const nueva = parseInt(e.target.value, 10);
                      if (Number.isInteger(nueva) && nueva >= 1) {
                        cambiarCantidad(producto.id, nueva);
                      } else {
                        e.target.value = cantidad;
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                    }}
                  />
                  <button
                    type="button"
                    className="boton boton-secundario boton-pequeno"
                    onClick={() => cambiarCantidad(producto.id, cantidad + 1)}
                    aria-label="Agregar una pieza"
                  >
                    +
                  </button>
                </div>

                <div className="linea-subtotal">{formatoMoneda(producto.precioVenta * cantidad)}</div>

                <button className="boton-icono" onClick={() => quitar(producto.id)} aria-label="Quitar del ticket">
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="total-fila">
            <span>TOTAL</span>
            <strong>{formatoMoneda(total)}</strong>
          </div>

          <div className="ticket-acciones">
            <button className="boton boton-secundario" onClick={vaciar} disabled={ticket.length === 0}>
              Vaciar
            </button>
            <button
              className="boton boton-grande"
              onClick={() => setModal('cobro')}
              disabled={ticket.length === 0 || !cajaAbierta}
              title={cajaAbierta ? '' : 'Abre la caja para cobrar'}
            >
              COBRAR
            </button>
          </div>
        </aside>
      </div>

      {modal === 'cobro' && (
        <CobroModal
          total={total}
          lineas={ticket}
          onVentaRegistrada={() => {
            setTicket([]);
            cargar();
          }}
          onCerrar={() => setModal(null)}
        />
      )}

      {modal === 'abrirCaja' && (
        <AbrirCajaModal
          fondoSugerido={caja?.fondoSugerido ?? 0}
          onAbierta={() => {
            setModal(null);
            cargar();
          }}
          onCerrar={() => setModal(null)}
        />
      )}
    </section>
  );
}