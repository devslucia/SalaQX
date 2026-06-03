export type Rol = "admin" | "encargada" | "medico";

export type EstadoTurno =
  | "pendiente"
  | "confirmada"
  | "rechazada"
  | "suspendida"
  | "eliminada"
  | "solicitud_eliminacion"
  | "solicitud_reprogramacion";

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  telefono: string | null;
  activo: boolean;
  created_at: string;
}

export interface Quirofano {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
  created_at: string;
}

export interface HorarioHabilitado {
  id: string;
  quirofano_id: string;
  dia: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
}

export interface ConfigUTI {
  id: string;
  dias_permitidos: DiaSemana[];
  updated_by: string;
  updated_at: string;
}

export interface TipoAnestesia {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface ObraSocial {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Turno {
  id: string;
  medico_id: string;
  quirofano_id: string | null;
  paciente_nombre: string;
  paciente_dni: string;
  paciente_edad: number;
  obra_social_id: string;
  tipo_cirugia: string;
  tipo_anestesia_id: string;
  medico_nombre?: string;
  medico_telefono?: string;
  usa_idi: boolean;
  pasa_uti: boolean;
  duracion_minutos: number;
  fecha_hora: string;
  estado: EstadoTurno;
  motivo_rechazo: string | null;
  solicitud_motivo: string | null;
  solicitud_fecha_propuesta: string | null;
  solicitud_rechazo_motivo: string | null;
  solicitud_rechazo_at: string | null;
  solicitud_rechazo_por: string | null;
  created_at: string;
  // Joined fields
  obra_social?: ObraSocial;
  tipo_anestesia?: TipoAnestesia;
  quirofano?: Quirofano;
  medico?: User;
}

export interface Notificacion {
  id: string;
  turno_id: string;
  destinatario_id: string;
  tipo: string;
  canal: "email" | "whatsapp";
  enviado_at: string | null;
}

export const DIAS_SEMANA: Record<DiaSemana, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export const ESTADO_COLORS: Record<EstadoTurno, string> = {
  pendiente: "bg-warning/10 text-warning border-warning/30",
  confirmada: "bg-success/10 text-success border-success/30",
  rechazada: "bg-destructive/10 text-destructive border-destructive/30",
  suspendida: "bg-muted text-muted-foreground border-border",
  eliminada: "bg-muted text-muted-foreground border-border",
  solicitud_eliminacion: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  solicitud_reprogramacion: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
};

export const ESTADO_LABELS: Record<EstadoTurno, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  suspendida: "Suspendida",
  eliminada: "Eliminada",
  solicitud_eliminacion: "Eliminación solicitada",
  solicitud_reprogramacion: "Reprogramación solicitada",
};

export const ESTADO_BORDER_COLORS: Record<EstadoTurno, string> = {
  pendiente: "border-l-warning",
  confirmada: "border-l-success",
  rechazada: "border-l-destructive",
  suspendida: "border-l-muted-foreground",
  eliminada: "border-l-muted-foreground",
  solicitud_eliminacion: "border-l-orange-500",
  solicitud_reprogramacion: "border-l-violet-500",
};

export const QUIROFANO_COLOR_PALETTE = [
  "#1B4F72",
  "#1E8449",
  "#9B59B6",
  "#E67E22",
  "#16A085",
  "#C0392B",
  "#2980B9",
  "#D35400",
] as const;

export interface TurnoCalendarEvent {
  id: string;
  fecha_hora: string;
  duracion_minutos: number;
  tipo_cirugia: string;
  estado: EstadoTurno;
  paciente_nombre: string | null;
  medico_id: string;
  medico_nombre: string | null;
  quirofano_id: string | null;
  quirofano_nombre: string | null;
  quirofano_color: string | null;
}
