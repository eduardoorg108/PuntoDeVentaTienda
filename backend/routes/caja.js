import { Router } from 'express';
import {
  estadoCaja,
  corteDelDia,
  abrirCaja,
  registrarMovimiento,
  cerrarCaja,
} from '../controllers/cajaController.js';

const router = Router();

router.get('/hoy', estadoCaja);
router.get('/corte/:dia', corteDelDia);
router.post('/abrir', abrirCaja);
router.post('/movimientos', registrarMovimiento);
router.post('/cerrar', cerrarCaja);

export default router;