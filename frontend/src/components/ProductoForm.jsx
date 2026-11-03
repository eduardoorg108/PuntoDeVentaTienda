import { useState } from 'react';
import { api } from '../api';

const VACIO = {
  nombre: '',
  codigoBarras: '',
  categoria: '',
  precioVenta: '',
  precioCompra: '',
  cantidad: '',
  stockMinimo: '',
  proveedorId: '',
  fechaCaducidad: '',
};

function aFormulario(producto) {
  return {
    nombre: producto.nombre,
    codigoBarras: producto.codigoBarras,
    categoria: producto.categoria ?? '',
    precioVenta: String(producto.precioVenta),
    precioCompra: String(producto.precioCompra),
    cantidad: String(producto.cantidad),
    stockMinimo: String(producto.stockMinimo),
    proveedorId: producto.proveedorId ?? '',
    fechaCaducidad: producto.fechaCaducidad ?? '',
  };
}

export default function ProductoForm({ producto, proveedores, categorias, onGuardado, onCancelar }) {
  const [datos, setDatos] = useState(producto ? aFormulario(producto) : VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((anterior) => ({ ...anterior, [name]: value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    const cuerpo = {
      nombre: datos.nombre,
      codigoBarras: datos.codigoBarras,
      categoria: datos.categoria.trim() || 'General',
      precioVenta: Number(datos.precioVenta),
      precioCompra: Number(datos.precioCompra),
      cantidad: Number(datos.cantidad),
      stockMinimo: Number(datos.stockMinimo),
      proveedorId: datos.proveedorId || null,
      fechaCaducidad: datos.fechaCaducidad || null,
    };

    try {
      if (producto) {
        await api(`/api/productos/${producto.id}`, { method: 'PUT', body: cuerpo });
      } else {
        await api('/api/productos', { method: 'POST', body: cuerpo });
      }
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar}>
      <div className="formulario-grid">
        <label className="completo">
          Nombre
          <input name="nombre" value={datos.nombre} onChange={cambiar} required autoFocus />
        </label>

        <label>
          Código de barras
          <input name="codigoBarras" value={datos.codigoBarras} onChange={cambiar} required />
        </label>

        <label>
          Categoría
          <input name="categoria" value={datos.categoria} onChange={cambiar} list="lista-categorias" placeholder="General" />
          <datalist id="lista-categorias">
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria} />
            ))}
          </datalist>
        </label>

        <label>
          Precio de venta
          <input name="precioVenta" type="number" min="0.01" step="0.01" value={datos.precioVenta} onChange={cambiar} required />
        </label>

        <label>
          Precio de compra (costo)
          <input name="precioCompra" type="number" min="0" step="0.01" value={datos.precioCompra} onChange={cambiar} required />
        </label>

        <label>
          Cantidad en existencia
          <input name="cantidad" type="number" min="0" step="1" value={datos.cantidad} onChange={cambiar} required />
        </label>

        <label>
          Stock mínimo
          <input name="stockMinimo" type="number" min="0" step="1" value={datos.stockMinimo} onChange={cambiar} required />
        </label>

        <label>
          Proveedor
          <select name="proveedorId" value={datos.proveedorId} onChange={cambiar}>
            <option value="">Sin proveedor</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha de caducidad (opcional)
          <input name="fechaCaducidad" type="date" value={datos.fechaCaducidad} onChange={cambiar} />
        </label>
      </div>

      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}

      <div className="formulario-acciones">
        <button className="boton boton-secundario" type="button" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="boton" type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}