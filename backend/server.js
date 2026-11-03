import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { verificarAdmin } from './middleware/auth.js';
import productosRoutes from './routes/productos.js';
import ventasRoutes from './routes/ventas.js';
import cajaRoutes from './routes/caja.js';
import proveedoresRoutes from './routes/proveedores.js';
import visitasRoutes from './routes/visitas.js';
import faltantesRoutes from './routes/faltantes.js';
import estadisticasRoutes from './routes/estadisticas.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use('/api/productos', verificarAdmin, productosRoutes);
app.use('/api/ventas', verificarAdmin, ventasRoutes);
app.use('/api/caja', verificarAdmin, cajaRoutes);
app.use('/api/proveedores', verificarAdmin, proveedoresRoutes);
app.use('/api/visitas', verificarAdmin, visitasRoutes);
app.use('/api/faltantes', verificarAdmin, faltantesRoutes);
app.use('/api/estadisticas', verificarAdmin, estadisticasRoutes);

app.get('/api/salud', (req, res) => {
  res.json({ ok: true, mensaje: 'El servidor funciona' });
});

app.get('/api/prueba', verificarAdmin, (req, res) => {
  res.json({ ok: true, correo: req.usuario.email });
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});