import { Router } from 'express';
import { getCarpetas, crearCarpeta, actualizarCarpeta, eliminarCarpeta } from '../controllers/carpetasController';
import authGuard from '../middlewares/authGuard';

const router = Router();

router.get('/', authGuard, getCarpetas);
router.post('/', authGuard, crearCarpeta);
router.put('/:id', authGuard, actualizarCarpeta);
router.delete('/:id', authGuard, eliminarCarpeta);

export default router;