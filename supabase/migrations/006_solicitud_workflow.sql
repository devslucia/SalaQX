-- ============================================
-- MIGRATION 006: workflow de solicitudes (eliminación y reprogramación)
-- ============================================
-- Agrega dos estados al enum estado_turno y columnas de soporte
-- para que los médicos pidan eliminación / reprogramación y la
-- encargada/admin las apruebe o rechace.

alter type public.estado_turno add value if not exists 'solicitud_eliminacion';
alter type public.estado_turno add value if not exists 'solicitud_reprogramacion';

alter table public.turnos
  add column if not exists solicitud_motivo text,
  add column if not exists solicitud_fecha_propuesta timestamptz,
  add column if not exists solicitud_rechazo_motivo text,
  add column if not exists solicitud_rechazo_at timestamptz,
  add column if not exists solicitud_rechazo_por uuid references public.users(id);

create index if not exists idx_turnos_estado_solicitud
  on public.turnos (estado)
  where estado in ('solicitud_eliminacion', 'solicitud_reprogramacion');

-- RLS existente (turnos_update) ya permite al médico actualizar su propio
-- turno, lo que cubre el cambio de estado a solicitud_*. No hace falta
-- cambiar políticas.

-- Vista útil para que la encargada vea rápido qué solicitudes hay pendientes
create or replace view public.v_turnos_solicitudes_pendientes as
  select
    t.id,
    t.medico_id,
    t.estado,
    t.solicitud_motivo,
    t.solicitud_fecha_propuesta,
    t.fecha_hora,
    t.paciente_nombre,
    t.paciente_dni,
    t.tipo_cirugia,
    t.quirofano_id,
    t.created_at
  from public.turnos t
  where t.estado in ('solicitud_eliminacion', 'solicitud_reprogramacion');
