import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { login, registro, cargando, error } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modo === 'login') {
      await login(email, password);
    } else {
      await registro(nombre, email, password);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {modo === 'login' ? 'Iniciá sesión' : 'Crear cuenta'}
        </h1>
        <p className="text-slate-500 mb-6 text-sm">
          {modo === 'login' ? 'Accedé a tu organizador personal' : 'Empezá a organizar tu vida'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {modo === 'registro' && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full border border-slate-200 rounded-lg px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full border border-slate-200 rounded-lg px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-slate-200 rounded-lg px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {cargando ? 'Cargando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          {modo === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <button
            onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}
            className="text-blue-600 hover:underline font-medium"
          >
            {modo === 'login' ? 'Registrate' : 'Iniciá sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
