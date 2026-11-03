import { Router } from 'express';
import {
  listarVisitas,
  programarVisita,
  recibirVisita,
  cancelarVisita,
} from '../controllers/visitasController.js';

const router = Router();

router.get('/', listarVisitas);
router.post('/', programarVisita);
router.put('/:id/recibir', recibirVisita);
router.delete('/:id', cancelarVisita);

export default router;