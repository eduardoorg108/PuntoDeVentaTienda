import { auth } from '../config/firebase.js';

export async function verificarAdmin(req, res, next) {
  const encabezado = req.headers.authorization || '';

  if (!encabezado.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token' });
  }

  const token = encabezado.split(' ')[1];

  try {
    const decodificado = await auth.verifyIdToken(token);

    if (decodificado.email?.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'No eres el administrador' });
    }

    req.usuario = decodificado;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o vencido' });
  }
}