import { Router } from 'express';
import { ventasDiarias, masVendidos } from '../controllers/estadisticasController.js';

const router = Router();

router.get('/ventas-diarias', ventasDiarias);
router.get('/mas-vendidos', masVendidos);

export default router;