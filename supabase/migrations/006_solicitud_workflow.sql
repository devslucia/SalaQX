-- MIGRATION 006: workflow de solicitudes
alter type public.estado_turno add value if not exists 'solicitud_eliminacion';
alter type public.estado_turno add value if not exists 'solicitud_reprogramacion';

alter table public.turnos
  add column if not exists solicitud_motivo text,
  add column if not exists solicitud_fecha_propuesta timestamptz,
  add column if not exists solicitud_rechazo_motivo text,
  add column if not exists solicitud_rechazo_at timestamptz,
  add column if not exists solicitud_rechazo_por uuid references public.users(id);
