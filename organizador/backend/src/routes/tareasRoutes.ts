import { Router } from 'express';
import { getTareas, crearTarea, actualizarTarea, eliminarTarea, reordenarTareas } from '../controllers/tareasController';
import authGuard from '../middlewares/authGuard';

const router = Router();

router.get('/', authGuard, getTareas);
router.post('/', authGuard, crearTarea);
router.put('/reordenar', authGuard, reordenarTareas);
router.put('/:id', authGuard, actualizarTarea);
router.delete('/:id', authGuard, eliminarTarea);

export default router;