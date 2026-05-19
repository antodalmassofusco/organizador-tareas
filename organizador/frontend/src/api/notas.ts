import client from './client';
import type { Nota } from '../types/index';

export const getNotaPorCarpeta = async (carpeta_id: number): Promise<Nota | null> => {
  const res = await client.get(`/notas/${carpeta_id}`);
  return res.data.data;
};

export const crearNota = async (carpeta_id: number, contenido: string): Promise<Nota> => {
  const res = await client.post('/notas', { carpeta_id, contenido });
  return res.data.data;
};

export const actualizarNota = async (id: number, contenido: string): Promise<Nota> => {
  const res = await client.put(`/notas/${id}`, { contenido });
  return res.data.data;
};