import { Router } from 'express';
import {
  listarFaltantes,
  crearFaltante,
  eliminarFaltante,
} from '../controllers/faltantesController.js';

const router = Router();

router.get('/', listarFaltantes);
router.post('/', crearFaltante);
router.delete('/:id', eliminarFaltante);

export default router;