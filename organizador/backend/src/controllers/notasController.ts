import { Response } from 'express';
import pool from '../db/connection';
import { AuthRequest } from '../middlewares/authGuard';

export const getNotaPorCarpeta = async (req: AuthRequest, res: Response): Promise<void> => {
  const { carpeta_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM notas WHERE carpeta_id = $1 AND usuario_id = $2',
      [carpeta_id, req.usuario!.id]
    );
    res.json({ error: false, data: result.rows[0] || null });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al obtener nota' });
  }
};

export const crearNota = async (req: AuthRequest, res: Response): Promise<void> => {
  const { contenido, carpeta_id } = req.body;

  if (!carpeta_id) {
    res.status(400).json({ error: true, mensaje: 'carpeta_id es obligatorio' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO notas (contenido, carpeta_id, usuario_id) VALUES ($1, $2, $3) RETURNING *',
      [contenido || '', carpeta_id, req.usuario!.id]
    );
    res.status(201).json({ error: false, data: result.rows[0] });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al crear nota' });
  }
};

export const actualizarNota = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { contenido } = req.body;

  try {
    const result = await pool.query(
      'UPDATE notas SET contenido = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2 AND usuario_id = $3 RETURNING *',
      [contenido, id, req.usuario!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: true, mensaje: 'Nota no encontrada' });
      return;
    }

    res.json({ error: false, data: result.rows[0] });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al actualizar nota' });
  }
};

export const eliminarNota = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM notas WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, req.usuario!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: true, mensaje: 'Nota no encontrada' });
      return;
    }

    res.json({ error: false, mensaje: 'Nota eliminada correctamente' });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al eliminar nota' });
  }
};