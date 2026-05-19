import client from './client';
import type { Carpeta } from '../types/index';

export const getCarpetas = async (): Promise<Carpeta[]> => {
  const res = await client.get('/carpetas');
  return res.data.data;
};

export const crearCarpeta = async (nombre: string, color: string, parent_id?: number): Promise<Carpeta> => {
  const res = await client.post('/carpetas', { nombre, color, parent_id });
  return res.data.data;
};

export const actualizarCarpeta = async (id: number, datos: Partial<Carpeta>): Promise<Carpeta> => {
  const res = await client.put(`/carpetas/${id}`, datos);
  return res.data.data;
};

export const eliminarCarpeta = async (id: number): Promise<void> => {
  await client.delete(`/carpetas/${id}`);
};