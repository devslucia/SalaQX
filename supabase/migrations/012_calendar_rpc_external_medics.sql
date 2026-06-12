-- ============================================
-- MIGRATION 012: Update calendar RPC for external medics
-- Uses turno.medico_nombre as fallback when medico_id is null
-- ============================================

create or replace function public.get_turnos_for_calendar()
returns table (
  id uuid,
  fecha_hora timestamptz,
  duracion_minutos smallint,
  tipo_cirugia text,
  estado estado_turno,
  paciente_nombre text,
  medico_id uuid,
  medico_nombre text,
  quirofano_id uuid,
  quirofano_nombre text,
  quirofano_color text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    t.id,
    t.fecha_hora,
    t.duracion_minutos,
    t.tipo_cirugia,
    t.estado,
    case
      when public.is_admin_or_encargada() or t.medico_id = auth.uid()
        then t.paciente_nombre
      else null
    end as paciente_nombre,
    t.medico_id,
    -- Use turno.medico_nombre as fallback for external medics
    coalesce(u.nombre, t.medico_nombre) as medico_nombre,
    t.quirofano_id,
    q.nombre as quirofano_nombre,
    q.color as quirofano_color
  from public.turnos t
  left join public.quirofanos q on t.quirofano_id = q.id
  left join public.users u on t.medico_id = u.id
  where t.estado <> 'eliminada';
$$;

grant execute on function public.get_turnos_for_calendar() to authenticated;
