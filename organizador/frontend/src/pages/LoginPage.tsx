import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { login, registro, cargando, error } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modo === 'login') {
      await login(email, password);
    } else {
      if (password !== passwordConfirm) {
        alert('Las contraseñas no coinciden');
        return;
      }
      await registro(nombre, email, password);
    }
  };

  const passwordsMatch = password === passwordConfirm;
  const formValid = modo === 'login' 
    ? email && password 
    : nombre && email && password && passwordConfirm && passwordsMatch;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-2" style={{ background: '#FFFEF9' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-1">
          <img src="/logo-devtask.png" alt="DevTask" className={modo === 'login' ? 'h-40 object-contain' : 'h-32 object-contain'} />
        </div>

        {/* Tarjeta */}
        <div className="rounded-2xl shadow-sm p-4 max-h-[calc(100vh-140px)] overflow-y-auto" style={{ background: '#FFFDF5', border: '1px solid #E2E8F0' }}>
          <h1 className="text-xl font-bold mb-0.5" style={{ color: '#0F172A' }}>
            {modo === 'login' ? 'Iniciá sesión' : 'Crear cuenta'}
          </h1>
          <p className="text-xs mb-4" style={{ color: '#64748B' }}>
            {modo === 'login' ? 'Accedé a tu organizador personal' : 'Empezá a organizar tu vida'}
          </p>

          {error && (
            <div className="mb-3 px-3 py-1.5 rounded-lg text-xs" style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {modo === 'registro' && (
              <div>
                <label className="text-xs font-medium block mb-0.5" style={{ color: '#0F172A' }}>Nombre</label>
                <div className="flex items-center px-2.5 py-1.5 rounded-lg border" style={{ borderColor: '#E2E8F0', background: '#FFFEF9' }}>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    required
                    className="flex-1 ml-2 text-xs focus:outline-none bg-transparent"
                    style={{ color: '#0F172A' }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium block mb-0.5" style={{ color: '#0F172A' }}>Email</label>
              <div className="flex items-center px-2.5 py-1.5 rounded-lg border" style={{ borderColor: '#E2E8F0', background: '#FFFEF9' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="flex-1 ml-2 text-xs focus:outline-none bg-transparent"
                  style={{ color: '#0F172A' }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-0.5" style={{ color: '#0F172A' }}>Contraseña</label>
              <div className="flex items-center px-2.5 py-1.5 rounded-lg border" style={{ borderColor: '#E2E8F0', background: '#FFFEF9' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex-1 ml-2 text-xs focus:outline-none bg-transparent"
                  style={{ color: '#0F172A' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors ml-1 flex-shrink-0"
                >
                  {mostrarPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {modo === 'registro' && (
              <div>
                <label className="text-xs font-medium block mb-0.5" style={{ color: '#0F172A' }}>Confirmar contraseña</label>
                <div className={`flex items-center px-2.5 py-1.5 rounded-lg border transition-colors ${
                  passwordConfirm && !passwordsMatch ? 'border-red-300 bg-red-50' : ''
                }`} style={{ borderColor: passwordConfirm && !passwordsMatch ? '#FCA5A5' : '#E2E8F0', background: passwordConfirm && !passwordsMatch ? '#FEE2E2' : '#FFFEF9' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={passwordConfirm && !passwordsMatch ? '#DC2626' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="flex-1 ml-2 text-xs focus:outline-none bg-transparent"
                    style={{ color: '#0F172A' }}
                  />
                </div>
                {passwordConfirm && !passwordsMatch && (
                  <p className="text-[10px] mt-0.5" style={{ color: '#DC2626' }}>Las contraseñas no coinciden</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando || !formValid}
              className="w-full font-semibold py-1.5 rounded-lg text-white transition-colors disabled:opacity-60 text-sm"
              style={{ background: '#14B8A6' }}
            >
              {cargando ? 'Cargando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs mt-3" style={{ color: '#64748B' }}>
            {modo === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button
              onClick={() => {
                setModo(modo === 'login' ? 'registro' : 'login');
                setNombre('');
                setEmail('');
                setPassword('');
                setPasswordConfirm('');
                setMostrarPassword(false);
              }}
              className="font-medium hover:underline transition-colors"
              style={{ color: '#14B8A6' }}
            >
              {modo === 'login' ? 'Registrate' : 'Iniciá sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
