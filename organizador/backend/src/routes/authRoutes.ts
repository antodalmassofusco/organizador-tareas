import { Router } from 'express';
import { registro, login } from '../controllers/authController';

const router = Router();

router.post('/registro', registro);
router.post('/login', login);

export default router;