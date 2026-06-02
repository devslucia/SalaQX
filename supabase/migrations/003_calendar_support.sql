-- ============================================
-- MIGRATION 003: Calendar support
-- ============================================
-- Adds:
--   * `color` column to quirofanos (palette round-robin)
--   * `get_turnos_for_calendar()` SECURITY DEFINER function
--     that returns the joined calendar data with RLS-aware
--     masking: medicos see other medicos' rows with
--     paciente_nombre = null so the UI can render them as
--     "Quirófano ocupado" blocks.

-- --------------------------------------------
-- 1. Add color column to quirofanos
-- --------------------------------------------
alter table public.quirofanos
  add column if not exists color text not null default '#1B4F72';

-- --------------------------------------------
-- 2. Backfill colors using the official palette (in order)
-- --------------------------------------------
do $$
declare
  palette text[] := array[
    '#1B4F72', '#1E8449', '#9B59B6', '#E67E22',
    '#16A085', '#C0392B', '#2980B9', '#D35400'
  ];
  r record;
  idx int := 1;
begin
  for r in
    select id from public.quirofanos
    where color = '#1B4F72'
    order by created_at
  loop
    update public.quirofanos
      set color = palette[((idx - 1) % 8) + 1]
      where id = r.id;
    idx := idx + 1;
  end loop;
end$$;

-- --------------------------------------------
-- 3. Calendar RPC: join + role-based masking
-- --------------------------------------------
-- SECURITY DEFINER so we can return rows the caller wouldn't
-- normally see via the `turnos` RLS policy. The masking happens
-- here based on auth.uid() and the caller's role.
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
    u.nombre as medico_nombre,
    t.quirofano_id,
    q.nombre as quirofano_nombre,
    q.color as quirofano_color
  from public.turnos t
  left join public.quirofanos q on t.quirofano_id = q.id
  left join public.users u on t.medico_id = u.id
  where t.estado <> 'eliminada';
$$;

grant execute on function public.get_turnos_for_calendar() to authenticated;
