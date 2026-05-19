import { Response } from 'express';
import pool from '../db/connection';
import { AuthRequest } from '../middlewares/authGuard';

export const getTareas = async (req: AuthRequest, res: Response): Promise<void> => {
  const { carpeta_id } = req.query;

  try {
    const valores: unknown[] = [req.usuario!.id];
    let query = 'SELECT * FROM tareas WHERE usuario_id = $1';

    if (carpeta_id) {
      valores.push(carpeta_id);
      query += ` AND carpeta_id = $${valores.length} ORDER BY orden ASC`;
    } else {
      query += ' ORDER BY fecha_vencimiento ASC NULLS LAST, creado_en ASC';
    }

    const result = await pool.query(query, valores);
    res.json({ error: false, data: result.rows });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al obtener tareas' });
  }
};

export const crearTarea = async (req: AuthRequest, res: Response): Promise<void> => {
  const { titulo, descripcion, carpeta_id, fecha_vencimiento } = req.body;

  if (!titulo || !carpeta_id) {
    res.status(400).json({ error: true, mensaje: 'Título y carpeta son obligatorios' });
    return;
  }

  try {
    const ordenResult = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM tareas WHERE carpeta_id = $1',
      [carpeta_id]
    );
    const orden = ordenResult.rows[0].siguiente;

    const result = await pool.query(
      'INSERT INTO tareas (titulo, descripcion, carpeta_id, usuario_id, orden, en_calendario, fecha_vencimiento) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [titulo, descripcion || null, carpeta_id, req.usuario!.id, orden, Boolean(fecha_vencimiento), fecha_vencimiento || null]
    );
    res.status(201).json({ error: false, data: result.rows[0] });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al crear tarea' });
  }
};

export const actualizarTarea = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { titulo, descripcion, estado, en_calendario, fecha_vencimiento } = req.body;

  try {
    const updates: string[] = [];
    const valores: unknown[] = [];
    const agregarCampo = (campo: string, valor: unknown) => {
      valores.push(valor);
      updates.push(`${campo} = $${valores.length}`);
    };

    if (Object.prototype.hasOwnProperty.call(req.body, 'titulo')) agregarCampo('titulo', titulo);
    if (Object.prototype.hasOwnProperty.call(req.body, 'descripcion')) agregarCampo('descripcion', descripcion);
    if (Object.prototype.hasOwnProperty.call(req.body, 'estado')) agregarCampo('estado', estado);
    if (Object.prototype.hasOwnProperty.call(req.body, 'en_calendario')) agregarCampo('en_calendario', en_calendario);
    if (Object.prototype.hasOwnProperty.call(req.body, 'fecha_vencimiento')) {
      agregarCampo('fecha_vencimiento', fecha_vencimiento || null);
      if (!Object.prototype.hasOwnProperty.call(req.body, 'en_calendario')) {
        agregarCampo('en_calendario', Boolean(fecha_vencimiento));
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: true, mensaje: 'No hay datos para actualizar' });
      return;
    }

    valores.push(id, req.usuario!.id);
    const result = await pool.query(
      `UPDATE tareas SET ${updates.join(', ')}
      WHERE id = $${valores.length - 1} AND usuario_id = $${valores.length} RETURNING *`,
      valores
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: true, mensaje: 'Tarea no encontrada' });
      return;
    }

    res.json({ error: false, data: result.rows[0] });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al actualizar tarea' });
  }
};

export const eliminarTarea = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM tareas WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, req.usuario!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: true, mensaje: 'Tarea no encontrada' });
      return;
    }

    res.json({ error: false, mensaje: 'Tarea eliminada correctamente' });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al eliminar tarea' });
  }
};

export const reordenarTareas = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tareas } = req.body;

  if (!Array.isArray(tareas)) {
    res.status(400).json({ error: true, mensaje: 'Se esperaba un array de tareas' });
    return;
  }

  try {
    for (const tarea of tareas) {
      await pool.query(
        'UPDATE tareas SET orden = $1 WHERE id = $2 AND usuario_id = $3',
        [tarea.orden, tarea.id, req.usuario!.id]
      );
    }
    res.json({ error: false, mensaje: 'Tareas reordenadas correctamente' });
  } catch {
    res.status(500).json({ error: true, mensaje: 'Error al reordenar tareas' });
  }
};
