import { Response } from 'express';
import pool from '../db/connection';
import { AuthRequest } from '../middlewares/authGuard';

export const getCarpetas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM carpetas WHERE usuario_id = $1 ORDER BY creado_en ASC',
      [req.usuario!.id]
    );
    res.json({ error: false, data: result.rows });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al obtener carpetas' });
  }
};

export const crearCarpeta = async (req: AuthRequest, res: Response): Promise<void> => {
  const { nombre, color, parent_id } = req.body;

  if (!nombre) {
    res.status(400).json({ error: true, mensaje: 'El nombre es obligatorio' });
    return;
  }

  if (nombre.length > 15) {
    res.status(400).json({ error: true, mensaje: 'El nombre no puede tener más de 15 caracteres' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO carpetas (nombre, color, parent_id, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, color || '#3498db', parent_id || null, req.usuario!.id]
    );
    res.status(201).json({ error: false, data: result.rows[0] });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al crear carpeta' });
  }
};

export const actualizarCarpeta = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { nombre, color, parent_id } = req.body;

  if (nombre && nombre.length > 15) {
    res.status(400).json({ error: true, mensaje: 'El nombre no puede tener más de 15 caracteres' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE carpetas SET nombre = COALESCE($1, nombre), color = COALESCE($2, color), parent_id = $3 WHERE id = $4 AND usuario_id = $5 RETURNING *',
      [nombre, color, parent_id || null, id, req.usuario!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: true, mensaje: 'Carpeta no encontrada' });
      return;
    }

    res.json({ error: false, data: result.rows[0] });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al actualizar carpeta' });
  }
};

export const eliminarCarpeta = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM carpetas WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, req.usuario!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: true, mensaje: 'Carpeta no encontrada' });
      return;
    }

    res.json({ error: false, mensaje: 'Carpeta eliminada correctamente' });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al eliminar carpeta' });
  }
};