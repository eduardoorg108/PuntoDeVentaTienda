import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { verificarAdmin } from './middleware/auth.js';
import productosRoutes from './routes/productos.js';
import ventasRoutes from './routes/ventas.js';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use('/api/productos', verificarAdmin, productosRoutes);
app.use('/api/ventas', verificarAdmin, ventasRoutes);

app.get('/api/salud', (req, res) => {
  res.json({ ok: true, mensaje: 'El servidor funciona' });
});

app.get('/api/prueba', verificarAdmin, (req, res) => {
  res.json({ ok: true, correo: req.usuario.email });
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});