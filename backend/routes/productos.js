import { Router } from 'express';
import {
  listarProductos,
  buscarPorCodigo,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from '../controllers/productosController.js';

const router = Router();

router.get('/', listarProductos);
router.get('/codigo/:codigoBarras', buscarPorCodigo);
router.post('/', crearProducto);
router.put('/:id', actualizarProducto);
router.delete('/:id', eliminarProducto);

export default router;