import { Router } from 'express';
import { getNotaPorCarpeta, crearNota, actualizarNota, eliminarNota } from '../controllers/notasController';
import authGuard from '../middlewares/authGuard';

const router = Router();

router.get('/:carpeta_id', authGuard, getNotaPorCarpeta);
router.post('/', authGuard, crearNota);
router.put('/:id', authGuard, actualizarNota);
router.delete('/:id', authGuard, eliminarNota);

export default router;