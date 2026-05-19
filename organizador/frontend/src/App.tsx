import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import type { Usuario } from './types/index';

function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    if (guardado && token) {
      return JSON.parse(guardado);
    }
    return null;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const guardado = localStorage.getItem('usuario');
      const token = localStorage.getItem('token');
      if (guardado && token && !usuario) {
        setUsuario(JSON.parse(guardado));
      } else if ((!guardado || !token) && usuario) {
        setUsuario(null);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [usuario]);

  return usuario ? <DashboardPage /> : <LoginPage />;
}

export default App;
