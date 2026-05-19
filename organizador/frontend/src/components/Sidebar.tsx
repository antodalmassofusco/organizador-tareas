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

const COLORES = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

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
  const [colorNueva, setColorNueva] = useState('#3498db');
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());

  // Estado para renombrar
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const inputEditRef = useRef<HTMLInputElement>(null);

  const carpetasRaiz = carpetas.filter(c => c.parent_id === null);
  const subcarpetas = (parentId: number) => carpetas.filter(c => c.parent_id === parentId);

  const toggleExpandir = (id: number) => {
    setExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNueva.trim()) return;
    const parentId = formParent === 'root' ? undefined : formParent ?? undefined;
    await onCrearCarpeta(nombreNueva, colorNueva, parentId);
    if (parentId) {
      setExpandidas(prev => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
    }
    setNombreNueva('');
    setColorNueva('#3498db');
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

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoNombre('');
  };

  const handleKeyDownEdit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmarEdicion(); }
    if (e.key === 'Escape') cancelarEdicion();
  };

  const renderFormCarpeta = (parentId: number | null | 'root') => (
    formParent === parentId ? (
      <form onSubmit={handleCrear} className="mb-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
        <input
          type="text"
          maxLength={15}
          value={nombreNueva}
          onChange={(e) => setNombreNueva(e.target.value)}
          placeholder="Nombre de carpeta"
          autoFocus
          className="w-full text-sm border border-slate-200 rounded-lg px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="flex gap-2 mb-3">
          {COLORES.map(color => (
            <button key={color} type="button" onClick={() => setColorNueva(color)}
              className={`w-5 h-5 rounded-full transition-transform ${colorNueva === color ? 'scale-125 ring-2 ring-offset-1 ring-slate-300' : ''}`}
              style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 font-medium">Crear</button>
          <button type="button" onClick={() => setFormParent(null)} className="flex-1 bg-slate-200 text-slate-600 text-xs py-2 rounded-lg font-medium">Cancelar</button>
        </div>
      </form>
    ) : null
  );

  const renderCarpeta = (carpeta: Carpeta, nivel: number = 0) => {
    const hijos = subcarpetas(carpeta.id);
    const expandida = expandidas.has(carpeta.id);
    const editando = editandoId === carpeta.id;

    return (
      <div key={carpeta.id}>
        <div className="flex items-center group"
          style={{ paddingLeft: `${nivel * 12}px` }}>
          {hijos.length > 0 ? (
            <button onClick={() => toggleExpandir(carpeta.id)}
              className="w-4 h-4 flex items-center justify-center text-slate-400 flex-shrink-0 mr-1 text-xs">
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
              className="flex-1 text-sm border border-blue-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mr-1"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { onSeleccionarCarpeta(carpeta.id); setAbierto(false); }}
              onDoubleClick={() => iniciarEdicion(carpeta)}
              title="Doble clic para renombrar"
              className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                carpetaSeleccionada === carpeta.id
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: carpeta.color }} />
              <span className="truncate">{carpeta.nombre}</span>
            </button>
          )}

          {!editando && (
            <>
              <button
                onClick={() => setFormParent(formParent === carpeta.id ? null : carpeta.id)}
                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all flex-shrink-0 text-sm"
                title="Crear subcarpeta"
              >+</button>

              <button
                onClick={() => onEliminarCarpeta(carpeta.id)}
                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all flex-shrink-0 text-lg leading-none"
                title="Eliminar carpeta"
              >×</button>
            </>
          )}

          {editando && (
            <button
              onMouseDown={e => { e.preventDefault(); cancelarEdicion(); }}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg transition-all flex-shrink-0 text-sm"
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
      <button onClick={() => setAbierto(!abierto)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md rounded-lg p-2">
        <div className="w-5 h-0.5 bg-slate-600 mb-1" />
        <div className="w-5 h-0.5 bg-slate-600 mb-1" />
        <div className="w-5 h-0.5 bg-slate-600" />
      </button>

      {abierto && <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setAbierto(false)} />}

      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 h-screen flex flex-col transform transition-transform duration-300 ${abierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="px-7 py-7 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Bienvenida</p>
              <p className="font-bold text-slate-800 text-lg mt-0.5">{nombreUsuario}</p>
            </div>
            <button onClick={onLogout}
              className="text-xs text-slate-400 hover:text-red-500 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
              Salir
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-7">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carpetas</span>
            <button onClick={() => setFormParent(formParent === 'root' ? null : 'root')}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-base">
              +
            </button>
          </div>

          {renderFormCarpeta('root')}

          <div className="flex flex-col gap-1">
            {carpetasRaiz.length === 0 && formParent !== 'root' && (
              <p className="text-xs text-slate-400 text-center py-6">Creá tu primera carpeta</p>
            )}
            {carpetasRaiz.map(c => renderCarpeta(c))}
          </div>
        </div>

        {/* LOGO DEVTASK CLAVADO EN EL PISO CON POSICIÓN ABSOLUTA */}
        <div className="absolute bottom-8 left-7 text-xl font-black text-slate-800 tracking-wider select-none">
          Dev<span className="text-blue-600">Task</span>
        </div>

      </aside>
    </>
  );
};


export default Sidebar;