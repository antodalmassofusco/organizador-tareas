import { useState, useEffect } from 'react';
import type { Carpeta, Tarea, Nota } from '../types/index';
import { getCarpetas, crearCarpeta, eliminarCarpeta, actualizarCarpeta } from '../api/carpetas';
import { getTareas, crearTarea, actualizarTarea, eliminarTarea } from '../api/tareas';
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
      <div className="flex items-center justify-between px-7 py-5 border-b border-slate-50">
        <button onClick={() => cambiarMes(-1)} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">‹</button>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{MESES[mes]} {anio}</span>
        <button onClick={() => cambiarMes(1)} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 px-7 pt-4">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[10px] text-slate-400 font-bold py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 px-7 pb-5">
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
                className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-medium transition-colors
                ${esHoy ? 'bg-blue-600 text-white' : seleccionado ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {dia}
              </button>
              {tareasDia.length > 0 && (
                <div className={`w-1 h-1 rounded-full mt-0.5 ${seleccionado ? 'bg-blue-500' : 'bg-red-400'}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-50 px-7 py-5 min-h-28 max-h-36 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          {diaSeleccionado ? `${diaSeleccionado} de ${MESES[mes]}` : 'Proximos vencimientos'}
        </p>
        {tareasSeleccionadas.length > 0 ? (
          <div className="space-y-1.5">
            {tareasSeleccionadas.map(t => (
              <div key={t.id} className="border-l-2 border-blue-200 pl-3">
                <p className="text-xs text-slate-600 font-medium truncate">{t.titulo}</p>
                {t.fecha_vencimiento && (
                  <p className="text-[10px] text-slate-400">{formatFecha(t.fecha_vencimiento)}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-300 italic">Sin vencimientos</p>
        )}
      </div>
    </div>
  );
};

// ─── ITEM DE TAREA EXPANDIBLE ─────────────────────────────────────────────────
interface TareaItemProps {
  tarea: Tarea;
  color: string;
  onCambiarEstado: (t: Tarea) => void;
  onEliminar: (id: number) => void;
  onActualizar: (id: number, datos: Partial<Tarea>) => void | Promise<void>;
}

const TareaItem = ({ tarea, color, onCambiarEstado, onEliminar, onActualizar }: TareaItemProps) => {
  const [expandida, setExpandida] = useState(false);
  const [editandoDesc, setEditandoDesc] = useState(false);
  const [desc, setDesc] = useState(tarea.descripcion || '');
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [fecha, setFecha] = useState(formatFechaInput(tarea.fecha_vencimiento));

  const estiloTexto = () => {
    if (tarea.estado === 'EN_PROGRESO') return 'underline decoration-yellow-400 decoration-2';
    if (tarea.estado === 'COMPLETADA') return 'line-through decoration-red-500 opacity-50';
    return '';
  };

  const badge = () => {
    if (tarea.estado === 'EN_PROGRESO') return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-semibold">En progreso</span>;
    if (tarea.estado === 'COMPLETADA') return <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Completada</span>;
    return <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">Pendiente</span>;
  };

  const guardarDesc = async () => {
    await onActualizar(tarea.id, { descripcion: desc });
    setEditandoDesc(false);
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
    <div className="rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-white overflow-hidden">
      {/* Fila principal */}
      <div className="flex items-center gap-3 px-7 py-5 group">
        <button
          onClick={() => onCambiarEstado(tarea)}
          className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all hover:scale-110"
          style={{ borderColor: color, backgroundColor: tarea.estado === 'COMPLETADA' ? color : 'transparent' }}
        />
        <button onClick={() => setExpandida(!expandida)} className="flex-1 text-left min-w-0">
          <p className={`text-sm text-slate-700 font-medium truncate ${estiloTexto()}`}>{tarea.titulo}</p>
          {tarea.fecha_vencimiento && (
            <p className={`text-[10px] mt-0.5 font-medium ${vencColor()}`}>
              📅 {formatFecha(tarea.fecha_vencimiento)} · {vencimiento}
            </p>
          )}
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {badge()}
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
                  className="w-full text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
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
                  className="text-sm border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
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

  const COLORES = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

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

  const handleRenombrarCarpeta = async (id: number, nombre: string) => {
    const actualizada = await actualizarCarpeta(id, { nombre });
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

  // Panel derecho: notas + calendario (compartido entre estado vacío y con carpeta)
  const renderPanelDerecho = () => (
    <div className="w-80 flex-shrink-0 flex flex-col bg-white border-l border-slate-100 overflow-hidden">
      {carpetaSeleccionada ? (
        <>
            <div className="flex-1 flex flex-col border-b border-slate-100 overflow-hidden">
            <div className="px-7 pt-7 pb-5 border-b border-slate-50">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Anotaciones</h2>
            </div>
            <textarea
              value={contenidoNota}
              onChange={e => setContenidoNota(e.target.value)}
              placeholder="Escribí tus ideas..."
              className="flex-1 px-7 py-7 text-sm text-slate-700 resize-none focus:outline-none placeholder-slate-300 leading-relaxed"
            />
            <div className="px-7 py-5 border-t border-slate-50 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <p className="text-xs text-slate-400">Guardado automático</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-shrink-0 px-7 py-7 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Anotaciones</p>
          <p className="text-xs text-slate-300 italic">Seleccioná una carpeta para ver las notas</p>
        </div>
      )}
      <div className="flex-shrink-0">
        <div className="px-7 pt-7 pb-4 border-b border-slate-50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calendario</h2>
        </div>
        <MiniCalendario tareas={tareasCalendario} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-7">
      <div className="flex h-[calc(100vh-56px)] bg-slate-50 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
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
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="text-6xl">📁</div>
                  <p className="text-slate-600 font-semibold text-lg">Seleccioná una carpeta</p>
                  <p className="text-slate-400 text-sm">o creá una nueva con el botón <span className="font-bold text-blue-500">+</span></p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-white border-b border-slate-100 px-7 py-7 flex items-center gap-3 shadow-sm">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: carpetaActual?.color }} />
                  <h1 className="font-bold text-slate-800 text-lg">{carpetaActual?.nombre}</h1>
                  <span className="ml-auto text-xs text-slate-400 font-medium">
                    {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-7 space-y-4">
                  <form onSubmit={handleCrearTarea} className="mb-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row">
                      <input
                        type="text"
                        value={nuevaTarea}
                        onChange={e => setNuevaTarea(e.target.value)}
                        placeholder="Agregar nueva tarea..."
                        className="min-w-0 flex-1 text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
                      />
                      <input
                        type="datetime-local"
                        value={nuevaFechaVencimiento}
                        onChange={e => setNuevaFechaVencimiento(e.target.value)}
                        className="lg:w-56 text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
                        title="Fecha y hora para mostrar en calendario"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarDetallesNuevaTarea(prev => !prev)}
                        className="lg:w-28 text-sm border border-slate-200 text-slate-500 rounded-lg px-4 py-3 hover:bg-slate-50 font-medium"
                      >
                        Detalles
                      </button>
                      <button type="submit"
                        className="lg:w-12 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg shadow-sm">
                        +
                      </button>
                    </div>
                    {mostrarDetallesNuevaTarea && (
                      <textarea
                        value={nuevaDescripcion}
                        onChange={e => setNuevaDescripcion(e.target.value)}
                        placeholder="Temas, subtareas o informacion extra (un item por linea)..."
                        rows={3}
                        className="mt-4 w-full text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none placeholder-slate-400"
                      />
                    )}
                  </form>

                  {tareas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 space-y-2">
                      <span className="text-3xl">✅</span>
                      <p className="text-sm text-slate-400">No hay tareas todavía</p>
                    </div>
                  ) : (
                    tareas.map(tarea => (
                      <TareaItem
                        key={tarea.id}
                        tarea={tarea}
                        color={carpetaActual?.color || '#3498db'}
                        onCambiarEstado={handleCambiarEstado}
                        onEliminar={handleEliminarTarea}
                        onActualizar={handleActualizarTarea}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Panel derecho fijo */}
          {renderPanelDerecho()}
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
            className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-7 shadow-2xl"
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
      <div className="fixed bottom-14 right-14 z-50">
          {mostrarFAB && (
            <form onSubmit={handleCrearCarpetaFAB}
              className="absolute bottom-14 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-7 w-72">
              <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Nueva carpeta</p>
              <input
                type="text"
                maxLength={15}
                value={nombreFAB}
                onChange={e => setNombreFAB(e.target.value)}
                placeholder="Nombre..."
                autoFocus
                className="w-full text-sm border border-slate-200 rounded-lg px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={parentFAB}
                onChange={e => setParentFAB(e.target.value === 'root' ? 'root' : Number(e.target.value))}
                className="w-full text-sm border border-slate-200 rounded-lg px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
              >
                <option value="root">Carpeta principal</option>
                {opcionesCarpetas().map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <div className="flex gap-1.5 mb-3">
                {COLORES.map(c => (
                  <button key={c} type="button" onClick={() => setColorFAB(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${colorFAB === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-300' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button type="submit"
                className="w-full bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 font-medium">
                Crear
              </button>
            </form>
          )}
          <button
            onClick={toggleFAB}
            title="Crear carpeta"
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110"
          >
            {mostrarFAB ? '×' : '+'}
          </button>
        </div>
    </div>
  );
};

export default DashboardPage;
