import { useState, useEffect } from 'react';
import type { Carpeta, Tarea, Nota } from '../types/index';
import { getCarpetas, crearCarpeta, eliminarCarpeta, actualizarCarpeta } from '../api/carpetas';
import { getTareas, crearTarea, actualizarTarea, eliminarTarea, reordenarTareas } from '../api/tareas';
import { getNotaPorCarpeta, crearNota, actualizarNota } from '../api/notas';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const parseFechaLocal = (fecha: string | null): Date | null => {
  if (!fecha) return null;
  const [soloFecha, horaFecha = '23:59'] = fecha.split('T');
  const [anio, mes, dia] = soloFecha.split('-').map(Number);
  const [hora = 23, minuto = 59] = horaFecha.split(':').map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia, hora || 0, minuto || 0);
};

const sumarMeses = (fecha: Date, meses: number): Date => {
  const copia = new Date(fecha);
  copia.setMonth(copia.getMonth() + meses);
  return copia;
};

const msHasta = (fecha: string | null): number => {
  const vence = parseFechaLocal(fecha);
  if (!vence) return 0;
  return vence.getTime() - Date.now();
};

const diferenciaTiempo = (desde: Date, hasta: Date) => {
  let meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + hasta.getMonth() - desde.getMonth();
  if (sumarMeses(desde, meses).getTime() > hasta.getTime()) meses -= 1;

  const cursor = sumarMeses(desde, meses);
  let restante = Math.max(0, hasta.getTime() - cursor.getTime());
  const dias = Math.floor(restante / 86400000);
  restante %= 86400000;
  const horas = Math.floor(restante / 3600000);
  restante %= 3600000;
  const minutos = Math.floor(restante / 60000);

  return { meses, dias, horas, minutos };
};

const partesTiempo = ({ meses, dias, horas, minutos }: { meses: number; dias: number; horas: number; minutos: number }) => {
  const partes: string[] = [];
  if (meses) partes.push(`${meses} mes${meses !== 1 ? 'es' : ''}`);
  if (dias) partes.push(`${dias} día${dias !== 1 ? 's' : ''}`);
  if (horas) partes.push(`${horas} hora${horas !== 1 ? 's' : ''}`);
  if (minutos) partes.push(`${minutos} minuto${minutos !== 1 ? 's' : ''}`);
  return partes.length ? partes.join(', ').replace(/, ([^,]*)$/, ' y $1') : 'menos de 1 minuto';
};

const tiempoRestante = (fecha: string | null): string => {
  const vence = parseFechaLocal(fecha);
  if (!vence) return '';
  const ahora = new Date();
  const diff = vence.getTime() - ahora.getTime();

  if (Math.abs(diff) < 60000) return 'Vence ahora';
  if (diff > 0) return `Faltan ${partesTiempo(diferenciaTiempo(ahora, vence))}`;
  return `Venció hace ${partesTiempo(diferenciaTiempo(vence, ahora))}`;
};

const formatFecha = (fecha: string | null): string => {
  const d = parseFechaLocal(fecha);
  if (!d) return '';
  const dia = d.getDate().toString().padStart(2,'0');
  const mes = (d.getMonth()+1).toString().padStart(2,'0');
  const hora = d.getHours().toString().padStart(2,'0');
  const minuto = d.getMinutes().toString().padStart(2,'0');
  return `${dia}/${mes}/${d.getFullYear()} ${hora}:${minuto}`;
};

const formatFechaInput = (fecha: string | null): string => {
  const d = parseFechaLocal(fecha);
  if (!d) return '';
  const mes = (d.getMonth()+1).toString().padStart(2,'0');
  const dia = d.getDate().toString().padStart(2,'0');
  const hora = d.getHours().toString().padStart(2,'0');
  const minuto = d.getMinutes().toString().padStart(2,'0');
  return `${d.getFullYear()}-${mes}-${dia}T${hora}:${minuto}`;
};

const ordenarTareasCalendario = (tareas: Tarea[]) =>
  [...tareas].sort((a, b) => {
    const fechaA = parseFechaLocal(a.fecha_vencimiento)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const fechaB = parseFechaLocal(b.fecha_vencimiento)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return fechaA - fechaB;
  });

// ─── MINI CALENDARIO ──────────────────────────────────────────────────────────
const MiniCalendario = ({ tareas }: { tareas: Tarea[] }) => {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const tareasDelDia = (dia: number) =>
    tareas.filter(t => {
      if (!t.fecha_vencimiento) return false;
      const f = parseFechaLocal(t.fecha_vencimiento);
      if (!f) return false;
      return f.getDate() === dia && f.getMonth() === mes && f.getFullYear() === anio;
    });

  const cambiarMes = (direccion: -1 | 1) => {
    setDiaSeleccionado(null);
    if (direccion === -1) {
      if (mes === 0) { setMes(11); setAnio(a => a - 1); } else setMes(m => m - 1);
      return;
    }
    if (mes === 11) { setMes(0); setAnio(a => a + 1); } else setMes(m => m + 1);
  };

  const celdas: (number | null)[] = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const proximasTareas = [...tareas]
    .filter(t => t.fecha_vencimiento)
    .sort((a, b) => (parseFechaLocal(a.fecha_vencimiento)?.getTime() || 0) - (parseFechaLocal(b.fecha_vencimiento)?.getTime() || 0))
    .slice(0, 3);

  const tareasSeleccionadas = diaSeleccionado ? tareasDelDia(diaSeleccionado) : proximasTareas;

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <button onClick={() => cambiarMes(-1)} className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors text-base font-bold" style={{ color: '#14B8A6' }}>‹</button>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#0F172A' }}>{MESES[mes]} {anio}</span>
        <button onClick={() => cambiarMes(1)} className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors text-base font-bold" style={{ color: '#14B8A6' }}>›</button>
      </div>
      <div className="grid grid-cols-7 px-6 pt-3">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[10px] font-bold py-1" style={{ color: '#94A3B8' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 px-6 pb-4">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`v-${i}`} />;
          const esHoy = dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
          const tareasDia = tareasDelDia(dia);
          const seleccionado = diaSeleccionado === dia;
          return (
            <div key={dia} className="flex flex-col items-center py-0.5">
              <button
                type="button"
                onClick={() => setDiaSeleccionado(dia)}
                className="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-medium transition-colors"
                style={{
                  background: esHoy ? '#14B8A6' : seleccionado ? '#E6FAF8' : 'transparent',
                  color: esHoy ? '#fff' : seleccionado ? '#14B8A6' : '#475569'
                }}
              >
                {dia}
              </button>
              {tareasDia.length > 0 && (
                <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: seleccionado ? '#14B8A6' : '#F59E0B' }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="px-6 py-4 min-h-28 max-h-36 overflow-y-auto" style={{ borderTop: '1px solid #F1F5F9' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>
            {diaSeleccionado ? `${diaSeleccionado} de ${MESES[mes]}` : 'Pr\u00f3ximos vencimientos'}
          </p>
        </div>
        {tareasSeleccionadas.length > 0 ? (
          <div className="space-y-1.5">
            {tareasSeleccionadas.map(t => (
              <div key={t.id} className="border-l-2 pl-3" style={{ borderColor: '#14B8A6' }}>
                <p className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{t.titulo}</p>
                {t.fecha_vencimiento && (
                  <p className="text-[10px]" style={{ color: '#94A3B8' }}>{formatFecha(t.fecha_vencimiento)}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic" style={{ color: '#CBD5E1' }}>Sin vencimientos</p>
        )}
      </div>
    </div>
  );
};

// ─── ITEM DE TAREA EXPANDIBLE ─────────────────────────────────────────────────
interface TareaItemProps {
  tarea: Tarea;
  color: string;
  index: number;
  totalTareas: number;
  onCambiarEstado: (t: Tarea) => void;
  onEliminar: (id: number) => void;
  onActualizar: (id: number, datos: Partial<Tarea>) => void | Promise<void>;
  onMoverArriba: (index: number) => void | Promise<void>;
  onMoverAbajo: (index: number) => void | Promise<void>;
}

const TareaItem = ({ tarea, color, index, totalTareas, onCambiarEstado, onEliminar, onActualizar, onMoverArriba, onMoverAbajo }: TareaItemProps) => {
  const [expandida, setExpandida] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [titulo, setTitulo] = useState(tarea.titulo);
  const [editandoDesc, setEditandoDesc] = useState(false);
  const [desc, setDesc] = useState(tarea.descripcion || '');
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [fecha, setFecha] = useState(formatFechaInput(tarea.fecha_vencimiento));

  const estiloTexto = () => {
    if (tarea.estado === 'EN_PROGRESO') {
      return { textDecoration: 'underline', textDecorationColor: color, textDecorationThickness: '2px' };
    }
    if (tarea.estado === 'COMPLETADA') return { textDecoration: 'line-through', opacity: 0.5 };
    return {};
  };

  const badge = () => {
    if (tarea.estado === 'EN_PROGRESO') return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: color + '20', color: color }}>En progreso</span>;
    if (tarea.estado === 'COMPLETADA') return <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Completada</span>;
    return <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">Pendiente</span>;
  };

  const prioridadLabel = (p: number) => {
    const labels = ['', '🔴 Baja', '🟠 Media-Baja', '🟡 Media', '🔶 Alta', '🔴 Crítica'];
    return labels[Math.min(Math.max(p, 1), 5)] || 'Media';
  };

  const guardarDesc = async () => {
    await onActualizar(tarea.id, { descripcion: desc });
    setEditandoDesc(false);
  };

  const guardarTitulo = async () => {
    if (titulo.trim()) {
      await onActualizar(tarea.id, { titulo: titulo.trim() });
      setEditandoTitulo(false);
    }
  };

  const guardarFecha = async () => {
    await onActualizar(tarea.id, {
      fecha_vencimiento: fecha || null,
      en_calendario: Boolean(fecha),
    });
    setEditandoFecha(false);
  };

  const subtareas = desc.split('\n').map(l => l.trim()).filter(Boolean);

  const vencimiento = tiempoRestante(tarea.fecha_vencimiento);
  const vencColor = () => {
    if (!tarea.fecha_vencimiento) return 'text-slate-400';
    const diff = msHasta(tarea.fecha_vencimiento);
    if (diff < 0) return 'text-red-500';
    if (diff <= 3 * 86400000) return 'text-orange-500';
    return 'text-slate-400';
  };

  return (
    <div className="rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all overflow-hidden" style={{ background: '#FFFBF0' }}>
      {/* Fila principal */}
      <div className="flex items-center gap-3 px-7 py-5 group">
        <button
          onClick={() => onCambiarEstado(tarea)}
          className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all hover:scale-110"
          style={{ borderColor: color, backgroundColor: tarea.estado === 'COMPLETADA' ? color : 'transparent' }}
        />
        <button onClick={() => setExpandida(!expandida)} className="flex-1 text-left min-w-0">
          <p className="text-sm text-slate-700 font-medium truncate cursor-text" onDoubleClick={() => setEditandoTitulo(true)} style={estiloTexto()} title="Doble clic para editar">{tarea.titulo}</p>
          {tarea.fecha_vencimiento && (
            <p className={`text-[10px] mt-0.5 font-medium ${vencColor()}`}>
              📅 {formatFecha(tarea.fecha_vencimiento)} · {vencimiento}
            </p>
          )}
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {badge()}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMoverArriba(index)} disabled={index === 0} title="Mover arriba"
              className="text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors text-xs px-1 py-1 hover:bg-slate-100 rounded">
              ▲
            </button>
            <button onClick={() => onMoverAbajo(index)} disabled={index === totalTareas - 1} title="Mover abajo"
              className="text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors text-xs px-1 py-1 hover:bg-slate-100 rounded">
              ▼
            </button>
          </div>
          <button onClick={() => setExpandida(!expandida)}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xs px-1">
            {expandida ? '▲' : '▼'}
          </button>
          <button onClick={() => onEliminar(tarea.id)}
            className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none">×</button>
        </div>
      </div>

      {/* Panel expandido */}
      {expandida && (
        <div className="border-t border-slate-50 px-7 py-6 bg-slate-50 space-y-5">

          {/* Título */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Título</span>
              <button onClick={() => setEditandoTitulo(!editandoTitulo)}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                {editandoTitulo ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            {editandoTitulo ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Nombre de la tarea..."
                  maxLength={100}
                  className="w-full text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ background: '#FFFBF0' }}
                  autoFocus
                />
                <button onClick={guardarTitulo}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                  Guardar
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium" style={estiloTexto()}>{tarea.titulo}</p>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prioridad</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  onClick={() => onActualizar(tarea.id, { prioridad: p })}
                  className={`w-8 h-8 rounded-lg font-bold text-xs transition-all ${
                    tarea.prioridad === p
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">{prioridadLabel(tarea.prioridad)}</p>
          </div>

          {/* Subtareas / descripción */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalles</span>
              <button onClick={() => setEditandoDesc(!editandoDesc)}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                {editandoDesc ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            {editandoDesc ? (
              <div className="space-y-2">
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Agregá detalles, subtemas o notas (un ítem por línea)..."
                  rows={4}
                  className="w-full text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" style={{ background: '#FFFBF0' }}
                  autoFocus
                />
                <button onClick={guardarDesc}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                  Guardar
                </button>
              </div>
            ) : subtareas.length > 0 ? (
              <ul className="space-y-1">
                {subtareas.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-slate-300 mt-0.5 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">Sin detalles. Hacé clic en Editar para agregar.</p>
            )}
          </div>

          {/* Fecha de vencimiento */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha de vencimiento</span>
              <button onClick={() => setEditandoFecha(!editandoFecha)}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                {editandoFecha ? 'Cancelar' : tarea.fecha_vencimiento ? 'Cambiar' : 'Agregar'}
              </button>
            </div>
            {editandoFecha ? (
              <div className="flex gap-2 items-center">
                <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ background: '#FFFBF0' }} />
                <button onClick={guardarFecha}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                  Guardar
                </button>
              </div>
            ) : tarea.fecha_vencimiento ? (
              <p className={`text-sm font-medium ${vencColor()}`}>
                📅 {formatFecha(tarea.fecha_vencimiento)} · {vencimiento}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">Sin fecha asignada</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────
const DashboardPage = () => {
  const { usuario, logout } = useAuth();
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<number | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [nota, setNota] = useState<Nota | null>(null);
  const [contenidoNota, setContenidoNota] = useState('');
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevaFechaVencimiento, setNuevaFechaVencimiento] = useState('');
  const [mostrarDetallesNuevaTarea, setMostrarDetallesNuevaTarea] = useState(false);
  const [tareasCalendario, setTareasCalendario] = useState<Tarea[]>([]);
  const [mostrarFAB, setMostrarFAB] = useState(false);
  const [nombreFAB, setNombreFAB] = useState('');
  const [colorFAB, setColorFAB] = useState('#3498db');
  const [parentFAB, setParentFAB] = useState<number | 'root'>('root');
  const [carpetaAEliminar, setCarpetaAEliminar] = useState<Carpeta | null>(null);
  const [eliminandoCarpeta, setEliminandoCarpeta] = useState(false);
  const [errorEliminarCarpeta, setErrorEliminarCarpeta] = useState('');
  const [panelDerechoAbierto, setPanelDerechoAbierto] = useState(false);

  const COLORES = ['#14B8A6', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#84CC16'];

  useEffect(() => {
    getCarpetas().then(setCarpetas);
    getTareas().then(setTareasCalendario);
  }, []);

  useEffect(() => {
    if (!carpetaSeleccionada) return;
    getTareas(carpetaSeleccionada).then(setTareas);
    getNotaPorCarpeta(carpetaSeleccionada).then(n => {
      setNota(n); setContenidoNota(n?.contenido || '');
    });
  }, [carpetaSeleccionada]);

  useEffect(() => {
    if (!carpetaSeleccionada) return;
    const timer = setTimeout(async () => {
      if (nota?.id) await actualizarNota(nota.id, contenidoNota);
      else if (contenidoNota.trim()) {
        const nueva = await crearNota(carpetaSeleccionada, contenidoNota);
        setNota(nueva);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [carpetaSeleccionada, contenidoNota, nota?.id]);

  const handleCrearCarpeta = async (nombre: string, color: string, parent_id?: number) => {
    const nueva = await crearCarpeta(nombre, color, parent_id);
    setCarpetas(prev => [...prev, nueva]);
    return nueva;
  };

  const handleRenombrarCarpeta = async (id: number, nombre: string, color?: string) => {
    const actualizada = await actualizarCarpeta(id, { nombre, ...(color ? { color } : {}) });
    setCarpetas(prev => prev.map(c => c.id === id ? actualizada : c));
  };

  const handleCrearCarpetaFAB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreFAB.trim()) return;
    const nueva = await handleCrearCarpeta(nombreFAB, colorFAB, parentFAB === 'root' ? undefined : parentFAB);
    setCarpetaSeleccionada(nueva.id);
    setNombreFAB('');
    setColorFAB('#3498db');
    setParentFAB('root');
    setMostrarFAB(false);
  };

  const idsCarpetasConHijas = (id: number, lista: Carpeta[]): number[] => {
    const hijas = lista.filter(c => c.parent_id === id);
    return [id, ...hijas.flatMap(hija => idsCarpetasConHijas(hija.id, lista))];
  };

  const handleEliminarCarpeta = async (id: number) => {
    const carpeta = carpetas.find(c => c.id === id);
    if (!carpeta) return;

    setErrorEliminarCarpeta('');
    setCarpetaAEliminar(carpeta);
  };

  const cerrarModalEliminarCarpeta = () => {
    if (eliminandoCarpeta) return;
    setCarpetaAEliminar(null);
    setErrorEliminarCarpeta('');
  };

  const confirmarEliminarCarpeta = async () => {
    if (!carpetaAEliminar) return;

    const idsAEliminar = idsCarpetasConHijas(carpetaAEliminar.id, carpetas);
    setEliminandoCarpeta(true);
    setErrorEliminarCarpeta('');

    try {
      await eliminarCarpeta(carpetaAEliminar.id);
      setCarpetas(prev => prev.filter(c => !idsAEliminar.includes(c.id)));
      setTareasCalendario(prev => prev.filter(t => !idsAEliminar.includes(t.carpeta_id)));

      if (carpetaSeleccionada && idsAEliminar.includes(carpetaSeleccionada)) {
        setCarpetaSeleccionada(null);
        setTareas([]);
        setNota(null);
        setContenidoNota('');
      }

      if (parentFAB !== 'root' && idsAEliminar.includes(parentFAB)) {
        setParentFAB('root');
      }

      setCarpetaAEliminar(null);
    } catch {
      setErrorEliminarCarpeta('No se pudo eliminar la carpeta. Intentá de nuevo.');
    } finally {
      setEliminandoCarpeta(false);
    }
  };

  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaTarea.trim() || !carpetaSeleccionada) return;
    const tarea = await crearTarea(
      nuevaTarea,
      carpetaSeleccionada,
      nuevaDescripcion.trim() || undefined,
      nuevaFechaVencimiento || undefined
    );
    setTareas(prev => [...prev, tarea]);
    setTareasCalendario(prev => ordenarTareasCalendario([...prev, tarea]));
    setNuevaTarea('');
    setNuevaDescripcion('');
    setNuevaFechaVencimiento('');
    setMostrarDetallesNuevaTarea(false);
  };

  const handleCambiarEstado = async (tarea: Tarea) => {
    const estados: Tarea['estado'][] = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'];
    const siguiente = estados[(estados.indexOf(tarea.estado) + 1) % estados.length];
    const actualizada = await actualizarTarea(tarea.id, { estado: siguiente });
    setTareas(prev => prev.map(t => t.id === tarea.id ? actualizada : t));
    setTareasCalendario(prev => ordenarTareasCalendario(prev.map(t => t.id === tarea.id ? actualizada : t)));
  };

  const handleActualizarTarea = async (id: number, datos: Partial<Tarea>) => {
    const actualizada = await actualizarTarea(id, datos);
    setTareas(prev => prev.map(t => t.id === id ? actualizada : t));
    setTareasCalendario(prev => {
      const existe = prev.some(t => t.id === id);
      const siguientes = existe
        ? prev.map(t => t.id === id ? actualizada : t)
        : [...prev, actualizada];
      return ordenarTareasCalendario(siguientes);
    });
  };

  const handleEliminarTarea = async (id: number) => {
    await eliminarTarea(id);
    setTareas(prev => prev.filter(t => t.id !== id));
    setTareasCalendario(prev => prev.filter(t => t.id !== id));
  };

  const handleMoverArriba = async (index: number) => {
    if (index === 0) return;
    const nuevasTareas = [...tareas];
    [nuevasTareas[index - 1], nuevasTareas[index]] = [nuevasTareas[index], nuevasTareas[index - 1]];
    
    // Actualizar órdenes localmente
    const tareasConOrden = nuevasTareas.map((t, i) => ({ ...t, orden: i }));
    setTareas(tareasConOrden);
    
    // Persistir en la BD
    await reordenarTareas(tareasConOrden.map(t => ({ id: t.id, orden: t.orden })));
  };

  const handleMoverAbajo = async (index: number) => {
    if (index === tareas.length - 1) return;
    const nuevasTareas = [...tareas];
    [nuevasTareas[index], nuevasTareas[index + 1]] = [nuevasTareas[index + 1], nuevasTareas[index]];
    
    // Actualizar órdenes localmente
    const tareasConOrden = nuevasTareas.map((t, i) => ({ ...t, orden: i }));
    setTareas(tareasConOrden);
    
    // Persistir en la BD
    await reordenarTareas(tareasConOrden.map(t => ({ id: t.id, orden: t.orden })));
  };

  const carpetaActual = carpetas.find(c => c.id === carpetaSeleccionada);
  const carpetasPorParent = (parentId: number | null) => carpetas.filter(c => c.parent_id === parentId);
  const opcionesCarpetas = (parentId: number | null = null, nivel: number = 0): { id: number; nombre: string }[] =>
    carpetasPorParent(parentId).flatMap(c => [
      { id: c.id, nombre: `${'-- '.repeat(nivel)}${c.nombre}` },
      ...opcionesCarpetas(c.id, nivel + 1)
    ]);

  const toggleFAB = () => {
    if (!mostrarFAB) setParentFAB(carpetaSeleccionada ?? 'root');
    setMostrarFAB(prev => !prev);
  };

  const idsCarpetaAEliminar = carpetaAEliminar ? idsCarpetasConHijas(carpetaAEliminar.id, carpetas) : [];
  const cantidadSubcarpetasAEliminar = Math.max(0, idsCarpetaAEliminar.length - 1);

  return (
    <div className="min-h-screen p-6" style={{ background: '#F7F8FA' }}>
      <div className="flex h-[calc(100vh-48px)] overflow-hidden rounded-2xl shadow-sm" style={{ background: '#FFFBF0', border: '1px solid #E2E8F0' }}>
        <Sidebar
          carpetas={carpetas}
          carpetaSeleccionada={carpetaSeleccionada}
          onSeleccionarCarpeta={setCarpetaSeleccionada}
          onCrearCarpeta={handleCrearCarpeta}
          onEliminarCarpeta={handleEliminarCarpeta}
          onRenombrarCarpeta={handleRenombrarCarpeta}
          onLogout={logout}
          nombreUsuario={usuario?.nombre || ''}
        />

        <main className="flex-1 flex overflow-hidden relative">
          {/* Área central */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!carpetaSeleccionada ? (
              <div className="h-full flex items-center justify-center" style={{ background: '#F7F8FA' }}>
                <div className="text-center space-y-4">
                  <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                    <rect x="10" y="30" width="100" height="65" rx="6" fill="#E6FAF8" stroke="#14B8A6" strokeWidth="2"/>
                    <path d="M10 42h100" stroke="#14B8A6" strokeWidth="2"/>
                    <path d="M10 36c0-3.3 2.7-6 6-6h28l6 8H10V36z" fill="#14B8A6"/>
                    <circle cx="88" cy="24" r="14" fill="#E6FAF8" stroke="#14B8A6" strokeWidth="2"/>
                    <line x1="88" y1="18" x2="88" y2="30" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="82" y1="24" x2="94" y2="24" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="30" cy="65" r="4" fill="#14B8A6" opacity="0.3"/>
                    <circle cx="60" cy="72" r="3" fill="#14B8A6" opacity="0.2"/>
                    <circle cx="80" cy="60" r="2" fill="#14B8A6" opacity="0.4"/>
                  </svg>
                  <p className="font-bold text-lg" style={{ color: '#0F172A' }}>Seleccioná una carpeta</p>
                  <p className="text-sm" style={{ color: '#64748B' }}>o creá una nueva con el botón <span className="font-bold" style={{ color: '#14B8A6' }}>+</span></p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F7F8FA' }}>
                <div className="px-7 py-5 flex items-center gap-3" style={{ background: '#FFFBF0', borderBottom: '1px solid #E2E8F0' }}>
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: carpetaActual?.color }} />
                  <h1 className="font-bold text-lg" style={{ color: '#0F172A' }}>{carpetaActual?.nombre}</h1>
                  <span className="ml-auto text-xs font-medium" style={{ color: '#64748B' }}>
                    {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                  <form onSubmit={handleCrearTarea} className="mb-4 rounded-xl p-5" style={{ background: '#FFFBF0', border: '1px solid #E2E8F0' }}>
                    <div className="flex flex-col gap-3 lg:flex-row">
                      <input
                        type="text"
                        value={nuevaTarea}
                        onChange={e => setNuevaTarea(e.target.value)}
                        placeholder="Agregar nueva tarea..."
                        className="min-w-0 flex-1 text-sm rounded-lg px-4 py-3 focus:outline-none"
                        style={{ border: '1px solid #E2E8F0', background: '#F7F8FA', color: '#0F172A' }}
                      />
                      <input
                        type="datetime-local"
                        value={nuevaFechaVencimiento}
                        onChange={e => setNuevaFechaVencimiento(e.target.value)}
                        className="lg:w-56 text-sm rounded-lg px-4 py-3 focus:outline-none"
                        style={{ border: '1px solid #E2E8F0', background: '#F7F8FA', color: '#64748B' }}
                        title="Fecha y hora para mostrar en calendario"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarDetallesNuevaTarea(prev => !prev)}
                        className="lg:w-28 text-sm rounded-lg px-4 py-3 font-medium transition-colors"
                        style={{ border: '1px solid #E2E8F0', color: '#64748B', background: '#F7F8FA' }}
                      >
                        Detalles
                      </button>
                      <button type="submit"
                        className="lg:w-12 text-white px-4 py-3 rounded-lg font-bold text-lg transition-colors"
                        style={{ background: '#14B8A6' }}>
                        +
                      </button>
                    </div>
                    {mostrarDetallesNuevaTarea && (
                      <textarea
                        value={nuevaDescripcion}
                        onChange={e => setNuevaDescripcion(e.target.value)}
                        placeholder="Temas, subtareas o informacion extra (un item por linea)..."
                        rows={3}
                        className="mt-4 w-full text-sm rounded-lg px-4 py-3 focus:outline-none resize-none"
                        style={{ border: '1px solid #E2E8F0', background: '#F7F8FA', color: '#0F172A' }}
                      />
                    )}
                  </form>

                  {tareas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 space-y-2">
                      <span className="text-3xl">✅</span>
                      <p className="text-sm font-medium" style={{ color: '#64748B' }}>No hay tareas todavía</p>
                    </div>
                  ) : (
                    tareas.map((tarea, index) => (
                      <TareaItem
                        key={tarea.id}
                        tarea={tarea}
                        color={carpetaActual?.color || '#14B8A6'}
                        index={index}
                        totalTareas={tareas.length}
                        onCambiarEstado={handleCambiarEstado}
                        onEliminar={handleEliminarTarea}
                        onActualizar={handleActualizarTarea}
                        onMoverArriba={handleMoverArriba}
                        onMoverAbajo={handleMoverAbajo}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botón toggle para panel derecho en móvil */}
          <button onClick={() => setPanelDerechoAbierto(!panelDerechoAbierto)}
            className="md:hidden fixed top-4 right-4 z-50 shadow-md rounded-lg p-2"
            style={{ background: '#0F172A' }}>
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>

          {/* Overlay para móvil */}
          {panelDerechoAbierto && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setPanelDerechoAbierto(false)} />}

          {/* Panel derecho: fijo en desktop, drawer en móvil */}
          <div
            className={`fixed md:static inset-y-0 right-0 z-40 w-80 h-full flex-shrink-0 flex flex-col overflow-hidden transition-transform duration-300 ${
              panelDerechoAbierto ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
            }`}
            style={{ background: '#FFFBF0', borderLeft: '1px solid #E2E8F0' }}
          >
            {carpetaSeleccionada ? (
              <>
                <div className="flex-1 flex flex-col overflow-hidden" style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#14B8A6' }}>Anotaciones</h2>
                    </div>
                  </div>
                  <textarea
                    value={contenidoNota}
                    onChange={e => setContenidoNota(e.target.value)}
                    placeholder="Escribe tus ideas..."
                    className="flex-1 px-6 py-5 text-sm resize-none focus:outline-none"
                    style={{ color: '#0F172A', background: '#FFFBF0' }}
                  />
                  <div className="px-6 py-3 flex items-center gap-1.5" style={{ borderTop: '1px solid #F8FAFC' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#14B8A6' }} />
                    <p className="text-xs" style={{ color: '#94A3B8' }}>Guardado automático</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-shrink-0 px-6 py-6" style={{ borderBottom: '1px solid #E2E8F0' }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#14B8A6' }}>Anotaciones</p>
                </div>
                <p className="text-xs italic" style={{ color: '#CBD5E1' }}>Selecciona una carpeta para ver las notas</p>
              </div>
            )}
            <div className="flex-shrink-0">
              <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #F8FAFC' }}>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#14B8A6' }}>Calendario</h2>
                </div>
              </div>
              <MiniCalendario tareas={tareasCalendario} />
            </div>
          </div>
        </main>
      </div>

      {carpetaAEliminar && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-eliminar-carpeta"
          onClick={cerrarModalEliminarCarpeta}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-100 p-7 shadow-2xl" style={{ background: '#FFFBF0' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <span
                className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: carpetaAEliminar.color }}
              />
              <div className="min-w-0">
                <p id="titulo-eliminar-carpeta" className="text-lg font-bold text-slate-800">
                  Eliminar carpeta
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Vas a borrar <span className="font-semibold text-slate-700">"{carpetaAEliminar.nombre}"</span>
                  {cantidadSubcarpetasAEliminar > 0
                    ? ` y ${cantidadSubcarpetasAEliminar} subcarpeta${cantidadSubcarpetasAEliminar !== 1 ? 's' : ''}.`
                    : '.'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  También se eliminarán sus tareas y anotaciones asociadas.
                </p>
              </div>
            </div>

            {errorEliminarCarpeta && (
              <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorEliminarCarpeta}
              </div>
            )}

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={cerrarModalEliminarCarpeta}
                disabled={eliminandoCarpeta}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarCarpeta}
                disabled={eliminandoCarpeta}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {eliminandoCarpeta ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB — crear carpeta */}
      <div className="fixed bottom-10 right-10 z-50">
          {mostrarFAB && (
            <form onSubmit={handleCrearCarpetaFAB}
              className="absolute bottom-16 right-0 rounded-2xl shadow-2xl p-6 w-72"
              style={{ background: '#FFFBF0', border: '1px solid #E2E8F0' }}>
              <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: '#0F172A' }}>Nueva carpeta</p>
              <input
                type="text"
                maxLength={15}
                value={nombreFAB}
                onChange={e => setNombreFAB(e.target.value)}
                placeholder="Nombre..."
                autoFocus
                className="w-full text-sm rounded-lg px-4 py-2.5 mb-3 focus:outline-none"
                style={{ border: '1px solid #E2E8F0', background: '#F7F8FA', color: '#0F172A' }}
              />
              <select
                value={parentFAB}
                onChange={e => setParentFAB(e.target.value === 'root' ? 'root' : Number(e.target.value))}
                className="w-full text-sm rounded-lg px-4 py-2.5 mb-4 focus:outline-none"
                style={{ border: '1px solid #E2E8F0', background: '#F7F8FA', color: '#64748B' }}
              >
                <option value="root">Carpeta principal</option>
                {opcionesCarpetas().map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <div className="flex gap-1.5 mb-4">
                {COLORES.map(c => (
                  <button key={c} type="button" onClick={() => setColorFAB(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${colorFAB === c ? 'scale-125 ring-2 ring-offset-2 ring-teal-300' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button type="submit"
                className="w-full text-white text-sm py-2.5 rounded-lg font-semibold transition-colors"
                style={{ background: '#14B8A6' }}>
                Crear
              </button>
            </form>
          )}
          <button
            onClick={toggleFAB}
            title="Crear carpeta"
            className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110"
            style={{ background: '#14B8A6', boxShadow: '0 4px 20px rgba(20,184,166,0.4)' }}
          >
            {mostrarFAB ? '×' : '+'}
          </button>
        </div>
    </div>
  );
};

export default DashboardPage;
