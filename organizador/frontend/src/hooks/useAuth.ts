import { useState } from 'react';
import { registrarse, iniciarSesion } from '../api/auth';
import type { Usuario } from '../types/index';

export const useAuth = () => {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setCargando(true);
    setError(null);
    try {
      const res = await iniciarSesion(email, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('usuario', JSON.stringify(res.usuario));
      setUsuario(res.usuario);
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  };

  const registro = async (nombre: string, email: string, password: string) => {
    setCargando(true);
    setError(null);
    try {
      const res = await registrarse(nombre, email, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('usuario', JSON.stringify(res.usuario));
      setUsuario(res.usuario);
    } catch {
      setError('Error al registrarse. El email puede estar en uso.');
    } finally {
      setCargando(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  return { usuario, cargando, error, login, registro, logout };
};