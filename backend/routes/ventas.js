import { Router } from 'express';
import { registrarVenta, listarVentas } from '../controllers/ventasController.js';

const router = Router();

router.post('/', registrarVenta);
router.get('/', listarVentas);

export default router;