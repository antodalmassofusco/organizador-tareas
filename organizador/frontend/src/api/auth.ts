import client from './client';
import type { AuthResponse } from '../types/index';

export const registrarse = async (nombre: string, email: string, password: string): Promise<AuthResponse> => {
  const res = await client.post('/auth/registro', { nombre, email, password });
  return res.data;
};

export const iniciarSesion = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await client.post('/auth/login', { email, password });
  return res.data;
};