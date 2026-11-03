import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Vender() {
  const [estado, setEstado] = useState('Probando conexión con el servidor...');

  useEffect(() => {
    api('/api/prueba')
      .then((datos) => setEstado(`Conexión correcta. El servidor te reconoce como ${datos.correo}`))
      .catch((error) => setEstado(`Error: ${error.message}`));
  }, []);

  return (
    <section>
      <h1>Vender</h1>
      <p className="texto-suave">{estado}</p>
    </section>
  );
}