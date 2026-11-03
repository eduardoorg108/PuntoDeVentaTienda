import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENSAJES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos',
  'auth/invalid-email': 'El correo no es válido',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo',
  'auth/network-request-failed': 'No hay conexión a internet',
};

export default function Login() {
  const { usuario, cargando, iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!cargando && usuario) {
    return <Navigate to="/vender" replace />;
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await iniciarSesion(correo.trim(), clave);
    } catch (e) {
      setError(MENSAJES[e.code] || 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-pantalla">
      <form className="tarjeta login-tarjeta" onSubmit={manejarEnvio}>
        <h1>🏪 Mi Tienda</h1>
        <p className="texto-suave">Punto de venta · Administrador</p>

        <label>
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </label>

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}