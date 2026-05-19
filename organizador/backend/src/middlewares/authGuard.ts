import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  usuario?: { id: number; email: string };
}

const authGuard = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: true, mensaje: 'Token no proporcionado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; email: string };
    req.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ error: true, mensaje: 'Token inválido o expirado' });
  }
};

export default authGuard;