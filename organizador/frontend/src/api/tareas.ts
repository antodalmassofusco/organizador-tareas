import client from './client';
import type { Tarea } from '../types/index';

export const getTareas = async (carpeta_id?: number): Promise<Tarea[]> => {
  const res = await client.get('/tareas', {
    params: carpeta_id !== undefined ? { carpeta_id } : undefined
  });
  return res.data.data;
};

export const crearTarea = async (titulo: string, carpeta_id: number, descripcion?: string, fecha_vencimiento?: string): Promise<Tarea> => {
  const res = await client.post('/tareas', {
    titulo,
    carpeta_id,
    descripcion,
    fecha_vencimiento,
    en_calendario: Boolean(fecha_vencimiento),
  });
  return res.data.data;
};

export const actualizarTarea = async (id: number, datos: Partial<Tarea>): Promise<Tarea> => {
  const res = await client.put(`/tareas/${id}`, datos);
  return res.data.data;
};

export const eliminarTarea = async (id: number): Promise<void> => {
  await client.delete(`/tareas/${id}`);
};

export const reordenarTareas = async (tareas: { id: number; orden: number }[]): Promise<void> => {
  await client.put('/tareas/reordenar', { tareas });
};
