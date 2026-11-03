import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ENLACES = [
  { ruta: '/inicio', texto: 'Inicio' },
  { ruta: '/vender', texto: 'Vender' },
  { ruta: '/productos', texto: 'Productos' },
  { ruta: '/estadisticas', texto: 'Estadísticas' },
  { ruta: '/proveedores', texto: 'Proveedores' },
  { ruta: '/corte', texto: 'Corte de caja' },
];

export default function Navbar() {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <header className="navbar">
      <span className="navbar-marca">🏪 Mi Tienda</span>

      <nav className="navbar-enlaces">
        {ENLACES.map((enlace) => (
          <NavLink
            key={enlace.ruta}
            to={enlace.ruta}
            className={({ isActive }) => (isActive ? 'activo' : '')}
          >
            {enlace.texto}
          </NavLink>
        ))}
      </nav>

      <div className="navbar-usuario">
        <span>{usuario.email}</span>
        <button className="boton boton-secundario" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}