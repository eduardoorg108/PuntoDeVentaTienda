import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import ProductoForm from '../components/ProductoForm';
import { formatoMoneda, formatoFecha, diasParaCaducar } from '../utils';

const DIAS_AVISO = 7;

function estadoProducto(producto) {
  const dias = producto.fechaCaducidad ? diasParaCaducar(producto.fechaCaducidad) : null;
  return {
    dias,
    stockBajo: producto.cantidad < producto.stockMinimo,
    vencido: dias !== null && dias < 0,
    porVencer: dias !== null && dias >= 0 && dias <= DIAS_AVISO,
  };
}

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [modal, setModal] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [listaProductos, listaProveedores] = await Promise.all([
        api('/api/productos'),
        api('/api/proveedores'),
      ]);
      setProductos(listaProductos);
      setProveedores(listaProveedores);
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

  async function eliminar(producto) {
    const confirmado = window.confirm(
      `¿Eliminar "${producto.nombre}"?\n\nSe quitará de la lista; las ventas anteriores se conservan.`
    );
    if (!confirmado) return;

    try {
      await api(`/api/productos/${producto.id}`, { method: 'DELETE' });
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const nombresProveedor = new Map(proveedores.map((p) => [p.id, p.nombre]));

  const texto = busqueda.trim().toLowerCase();
  const visibles = productos.filter((p) => {
    const coincideTexto =
      texto === '' || p.nombre.toLowerCase().includes(texto) || p.codigoBarras.toLowerCase().includes(texto);
    const coincideCategoria = categoria === '' || p.categoria === categoria;
    return coincideTexto && coincideCategoria;
  });

  return (
    <section>
      <div className="encabezado-pagina">
        <div>
          <h1>Productos</h1>
          <p className="texto-suave">
            {visibles.length} de {productos.length} productos
          </p>
        </div>
        <button className="boton" onClick={() => setModal({ producto: null })}>
          + Nuevo producto
        </button>
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre o código de barras..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mensaje-error" role="alert">
          {error}{' '}
          <button className="boton boton-secundario boton-pequeno" onClick={cargar}>
            Reintentar
          </button>
        </p>
      )}

      <div className="tarjeta tabla-contenedor">
        {cargando && <p className="vacio">Cargando productos...</p>}

        {!cargando && visibles.length === 0 && (
          <p className="vacio">
            {productos.length === 0
              ? 'Aún no hay productos. Pulsa «Nuevo producto» para agregar el primero.'
              : 'Ningún producto coincide con la búsqueda.'}
          </p>
        )}

        {!cargando && visibles.length > 0 && (
          <table className="tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="numero">Venta</th>
                <th className="numero">Costo</th>
                <th className="numero">Stock</th>
                <th>Caducidad</th>
                <th>Proveedor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const estado = estadoProducto(p);
                const clase =
                  estado.stockBajo || estado.vencido ? 'fila-alerta' : estado.porVencer ? 'fila-aviso' : '';

                return (
                  <tr key={p.id} className={clase}>
                    <td>
                      {p.nombre}
                      <span className="codigo">{p.codigoBarras}</span>
                    </td>
                    <td>{p.categoria}</td>
                    <td className="numero">{formatoMoneda(p.precioVenta)}</td>
                    <td className="numero">{formatoMoneda(p.precioCompra)}</td>
                    <td className="numero">
                      {p.cantidad}
                      {estado.stockBajo && <span className="etiqueta etiqueta-alerta">Bajo</span>}
                      <span className="codigo">mínimo {p.stockMinimo}</span>
                    </td>
                    <td>
                      {p.fechaCaducidad ? formatoFecha(p.fechaCaducidad) : '—'}
                      {estado.vencido && <span className="etiqueta etiqueta-alerta">Vencido</span>}
                      {estado.porVencer && (
                        <span className="etiqueta etiqueta-aviso">
                          {estado.dias === 0 ? 'Vence hoy' : `Vence en ${estado.dias} d`}
                        </span>
                      )}
                    </td>
                    <td>{nombresProveedor.get(p.proveedorId) ?? '—'}</td>
                    <td className="acciones">
                      <button
                        className="boton boton-secundario boton-pequeno"
                        onClick={() => setModal({ producto: p })}
                      >
                        Editar
                      </button>
                      <button className="boton boton-peligro boton-pequeno" onClick={() => eliminar(p)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal titulo={modal.producto ? 'Editar producto' : 'Nuevo producto'} onCerrar={() => setModal(null)}>
          <ProductoForm
            producto={modal.producto}
            proveedores={proveedores}
            categorias={categorias}
            onGuardado={() => {
              setModal(null);
              cargar();
            }}
            onCancelar={() => setModal(null)}
          />
        </Modal>
      )}
    </section>
  );
}