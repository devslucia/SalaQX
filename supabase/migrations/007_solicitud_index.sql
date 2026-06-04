-- MIGRATION 007: vista e índice para solicitudes
create or replace view public.v_turnos_solicitudes_pendientes as
  select
    t.id, t.medico_id, t.estado, t.solicitud_motivo,
    t.solicitud_fecha_propuesta, t.fecha_hora, t.paciente_nombre,
    t.paciente_dni, t.tipo_cirugia, t.quirofano_id, t.created_at
  from public.turnos t
  where t.estado in ('solicitud_eliminacion', 'solicitud_reprogramacion');

create index if not exists idx_turnos_estado_solicitud
  on public.turnos (estado)
  where estado in ('solicitud_eliminacion', 'solicitud_reprogramacion');
