import { useState, useRef } from 'react';
import type { Carpeta } from '../types/index';

interface Props {
  carpetas: Carpeta[];
  carpetaSeleccionada: number | null;
  onSeleccionarCarpeta: (id: number) => void;
  onCrearCarpeta: (nombre: string, color: string, parent_id?: number) => void | Promise<Carpeta | void>;
  onEliminarCarpeta: (id: number) => void | Promise<void>;
  onRenombrarCarpeta: (id: number, nombre: string) => void | Promise<void>;
  onLogout: () => void;
  nombreUsuario: string;
}

const COLORES = ['#14B8A6', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#84CC16'];

// Ícono carpeta SVG outline (estilo line)
const IconCarpeta = ({ color = '#14B8A6', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

// Ícono salir
const IconSalir = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// Logo shield icon

const Sidebar = ({
  carpetas,
  carpetaSeleccionada,
  onSeleccionarCarpeta,
  onCrearCarpeta,
  onEliminarCarpeta,
  onRenombrarCarpeta,
  onLogout,
  nombreUsuario
}: Props) => {
  const [abierto, setAbierto] = useState(false);
  const [formParent, setFormParent] = useState<number | null | 'root'>(null);
  const [nombreNueva, setNombreNueva] = useState('');
  const [colorNueva, setColorNueva] = useState('#14B8A6');
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const inputEditRef = useRef<HTMLInputElement>(null);

  const carpetasRaiz = carpetas.filter(c => c.parent_id === null);
  const subcarpetas = (parentId: number) => carpetas.filter(c => c.parent_id === parentId);

  const toggleExpandir = (id: number) => {
    setExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNueva.trim()) return;
    const parentId = formParent === 'root' ? undefined : formParent ?? undefined;
    await onCrearCarpeta(nombreNueva, colorNueva, parentId);
    if (parentId) {
      setExpandidas(prev => { const next = new Set(prev); next.add(parentId); return next; });
    }
    setNombreNueva('');
    setColorNueva('#14B8A6');
    setFormParent(null);
  };

  const iniciarEdicion = (carpeta: Carpeta) => {
    setEditandoId(carpeta.id);
    setEditandoNombre(carpeta.nombre);
    setTimeout(() => inputEditRef.current?.select(), 30);
  };

  const confirmarEdicion = async () => {
    if (editandoId === null) return;
    const fontNombre = editandoNombre.trim();
    if (fontNombre && fontNombre.length <= 15) {
      await onRenombrarCarpeta(editandoId, fontNombre);
    }
    setEditandoId(null);
    setEditandoNombre('');
  };

  const cancelarEdicion = () => { setEditandoId(null); setEditandoNombre(''); };

  const handleKeyDownEdit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmarEdicion(); }
    if (e.key === 'Escape') cancelarEdicion();
  };

  const renderFormCarpeta = (parentId: number | null | 'root') => (
    formParent === parentId ? (
      <form onSubmit={handleCrear} className="mb-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <input
          type="text"
          maxLength={15}
          value={nombreNueva}
          onChange={(e) => setNombreNueva(e.target.value)}
          placeholder="Nombre de carpeta"
          autoFocus
          className="w-full text-sm rounded-lg px-3 py-2 mb-3 focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
        />
        <div className="flex gap-2 mb-3">
          {COLORES.map(color => (
            <button key={color} type="button" onClick={() => setColorNueva(color)}
              className={`w-5 h-5 rounded-full transition-transform ${colorNueva === color ? 'scale-125 ring-2 ring-offset-1 ring-white/40' : ''}`}
              style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 text-white text-xs py-2 rounded-lg font-semibold transition-colors" style={{ background: '#14B8A6' }}>Crear</button>
          <button type="button" onClick={() => setFormParent(null)} className="flex-1 text-xs py-2 rounded-lg font-medium" style={{ background: 'rgba(255,255,255,0.1)', color: '#94A3B8' }}>Cancelar</button>
        </div>
      </form>
    ) : null
  );

  const renderCarpeta = (carpeta: Carpeta, nivel: number = 0) => {
    const hijos = subcarpetas(carpeta.id);
    const expandida = expandidas.has(carpeta.id);
    const editando = editandoId === carpeta.id;
    const seleccionada = carpetaSeleccionada === carpeta.id;

    return (
      <div key={carpeta.id}>
        <div className="flex items-center group rounded-xl transition-all"
          style={{ paddingLeft: `${nivel * 12}px`, background: seleccionada ? 'rgba(20,184,166,0.15)' : 'transparent' }}>

          {hijos.length > 0 ? (
            <button onClick={() => toggleExpandir(carpeta.id)}
              className="w-4 h-4 flex items-center justify-center flex-shrink-0 mr-1 text-xs"
              style={{ color: '#64748B' }}>
              {expandida ? '▾' : '▸'}
            </button>
          ) : <div className="w-5 flex-shrink-0" />}

          {editando ? (
            <input
              ref={inputEditRef}
              type="text"
              maxLength={15}
              value={editandoNombre}
              onChange={e => setEditandoNombre(e.target.value)}
              onBlur={confirmarEdicion}
              onKeyDown={handleKeyDownEdit}
              className="flex-1 text-sm rounded-lg px-3 py-1.5 focus:outline-none mr-1"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #14B8A6', color: '#fff' }}
              autoFocus
            />
          ) : (
            <button
              onClick={() => { onSeleccionarCarpeta(carpeta.id); setAbierto(false); }}
              onDoubleClick={() => iniciarEdicion(carpeta)}
              title="Doble clic para renombrar"
              className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={{ color: seleccionada ? '#14B8A6' : '#94A3B8' }}
            >
              <IconCarpeta color={carpeta.color} size={15} />
              <span className="truncate">{carpeta.nombre}</span>
            </button>
          )}

          {!editando && (
            <>
              <button
                onClick={() => setFormParent(formParent === carpeta.id ? null : carpeta.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all flex-shrink-0 text-sm opacity-0 group-hover:opacity-100"
                style={{ color: '#64748B' }}
                title="Crear subcarpeta"
              >+</button>
              <button
                onClick={() => onEliminarCarpeta(carpeta.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all flex-shrink-0 text-lg leading-none opacity-0 group-hover:opacity-100"
                style={{ color: '#64748B' }}
                title="Eliminar carpeta"
              >×</button>
            </>
          )}

          {editando && (
            <button
              onMouseDown={e => { e.preventDefault(); cancelarEdicion(); }}
              className="w-6 h-6 flex items-center justify-center rounded-lg transition-all flex-shrink-0 text-sm"
              style={{ color: '#64748B' }}
              title="Cancelar"
            >✕</button>
          )}
        </div>

        {renderFormCarpeta(carpeta.id)}
        {expandida && hijos.map(sub => renderCarpeta(sub, nivel + 1))}
      </div>
    );
  };

  return (
    <>
      {/* Botón hamburguesa mobile */}
      <button onClick={() => setAbierto(!abierto)}
        className="md:hidden fixed top-4 left-4 z-50 shadow-md rounded-lg p-2"
        style={{ background: '#0F172A' }}>
        <div className="w-5 h-0.5 bg-white mb-1" />
        <div className="w-5 h-0.5 bg-white mb-1" />
        <div className="w-5 h-0.5 bg-white" />
      </button>

      {abierto && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setAbierto(false)} />}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 h-full flex flex-col transform transition-transform duration-300 ${abierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ background: '#0F172A' }}
      >
        {/* Logo */}
        {/*<div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src="/logo-devtask-blanco.png" alt="DevTask" className="w-24 h-auto object-contain mx-auto" />
        </div>/}

        {/* Usuario */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#14B8A6' }}>Bienvenido</p>
          <div className="flex items-center justify-between">
            <p className="font-bold text-white text-base">{nombreUsuario}</p>
            <button onClick={onLogout}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: '#64748B' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
            >
              <IconSalir />
              Salir
            </button>
          </div>
        </div>

        {/* Carpetas */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#14B8A6' }}>Carpetas</span>
            <button
              onClick={() => setFormParent(formParent === 'root' ? null : 'root')}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-base font-bold transition-all"
              style={{ color: '#14B8A6', background: 'rgba(20,184,166,0.12)' }}
            >+</button>
          </div>

          {renderFormCarpeta('root')}

          <div className="flex flex-col gap-0.5">
            {carpetasRaiz.length === 0 && formParent !== 'root' && (
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <IconCarpeta color="#334155" size={15} />
                <p className="text-xs" style={{ color: '#475569' }}>Creá tu primera carpeta</p>
              </div>
            )}
            {carpetasRaiz.map(c => renderCarpeta(c))}
          </div>
        </div>

        {/* Footer DevTask */}
        <div className="px-5 pt-2 pb-2 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <img 
            src="/logo-devtask-blanco.png" 
            alt="DevTask" 
            className="w-60 h-auto object-contain mx-auto" 
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;