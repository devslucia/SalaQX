-- MIGRATION 008: validar día habilitado al insertar/actualizar turnos
-- Garantiza a nivel DB que un turno solo pueda caer en un día de la semana
-- que esté configurado en horarios_habilitados, y que si pasa a UTI también
-- cumpla la restricción de config_uti.dias_permitidos.

create or replace function public.validate_turno_day()
returns trigger
language plpgsql
as $$
declare
  v_dia smallint;
  v_uti_dias smallint[];
begin
  v_dia := extract(dow from NEW.fecha_hora)::smallint;

  if not exists (
    select 1
    from public.horarios_habilitados
    where dia = v_dia
  ) then
    raise exception 'Día no habilitado para cirugías (%)', v_dia
      using errcode = '23514';
  end if;

  if NEW.pasa_uti then
    select dias_permitidos
      into v_uti_dias
      from public.config_uti
      order by updated_at desc
      limit 1;

    if v_uti_dias is null or not (v_dia = any(v_uti_dias)) then
      raise exception 'Día no habilitado para UTI'
        using errcode = '23514';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_validate_turno_day on public.turnos;

create trigger trg_validate_turno_day
  before insert or update of fecha_hora, pasa_uti
  on public.turnos
  for each row execute function public.validate_turno_day();
