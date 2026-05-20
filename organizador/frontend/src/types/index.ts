export interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

export interface Carpeta {
  id: number;
  nombre: string;
  color: string;
  parent_id: number | null;
  usuario_id: number;
  creado_en: string;
}

export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string | null;
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
  prioridad: number;
  orden: number;
  en_calendario: boolean;
  fecha_vencimiento: string | null;
  carpeta_id: number;
  usuario_id: number;
  creado_en: string;
}

export interface Nota {
  id: number;
  contenido: string;
  carpeta_id: number;
  usuario_id: number;
  actualizado_en: string;
}

export interface AuthResponse {
  error: boolean;
  token: string;
  usuario: Usuario;
}