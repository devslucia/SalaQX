-- ============================================
-- 010 — Auditoría de RLS
-- Verifica que todas las tablas sensibles
-- tengan Row Level Security habilitado y
-- políticas mínimas que cubran los flujos
-- esperados (admin/encargada/medico).
--
-- Este archivo es idempotente: puede correrse
-- varias veces sin efectos colaterales.
-- Las verificaciones devuelven NOTICE con el
-- estado de cada tabla.
-- ============================================

-- ============================================
-- 1. Verificación de habilitación de RLS
-- ============================================
do $$
declare
  t record;
  missing_rls text := '';
begin
  for t in
    select c.relname as tabla
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'users', 'quirofanos', 'horarios_habilitados', 'config_uti',
        'tipos_anestesia', 'obras_sociales', 'turnos',
        'notificaciones', 'config_sanatorio'
      )
  loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = t.tabla
        and c.relrowsecurity = true
    ) then
      missing_rls := missing_rls || t.tabla || ', ';
      execute format('alter table public.%I enable row level security;', t.tabla);
    end if;
  end loop;

  if missing_rls <> '' then
    raise notice '[RLS] Habilitado RLS en tablas faltantes: %', missing_rls;
  else
    raise notice '[RLS] Todas las tablas sensibles tienen RLS habilitado ✓';
  end if;
end $$;

-- ============================================
-- 2. Helper: verifica que existe política con nombre dado
-- ============================================
create or replace function public._has_policy(p_table text, p_policy text)
returns boolean language sql stable as $$
  select exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = p_table
      and policyname = p_policy
  );
$$;

-- ============================================
-- 3. USERS: SELECT, INSERT, UPDATE
-- ============================================
do $$
begin
  if not public._has_policy('users', 'users_select') then
    create policy "users_select" on public.users
      for select using (auth.uid() = id or public.is_admin_or_encargada());
    raise notice '[users] Creada policy users_select';
  end if;

  if not public._has_policy('users', 'users_insert') then
    create policy "users_insert" on public.users
      for insert with check (public.is_admin_or_encargada());
    raise notice '[users] Creada policy users_insert';
  end if;

  if not public._has_policy('users', 'users_update') then
    create policy "users_update" on public.users
      for update using (public.is_admin_or_encargada() or auth.uid() = id);
    raise notice '[users] Creada policy users_update';
  end if;
end $$;

-- ============================================
-- 4. QUIROFANOS: SELECT, INSERT, UPDATE, DELETE
-- ============================================
do $$
begin
  if not public._has_policy('quirofanos', 'quirofanos_select') then
    create policy "quirofanos_select" on public.quirofanos
      for select using (true);
  end if;
  if not public._has_policy('quirofanos', 'quirofanos_insert') then
    create policy "quirofanos_insert" on public.quirofanos
      for insert with check (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('quirofanos', 'quirofanos_update') then
    create policy "quirofanos_update" on public.quirofanos
      for update using (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('quirofanos', 'quirofanos_delete') then
    create policy "quirofanos_delete" on public.quirofanos
      for delete using (public.is_admin_or_encargada());
  end if;
end $$;

-- ============================================
-- 5. HORARIOS_HABILITADOS: SELECT, INSERT, UPDATE, DELETE
-- ============================================
do $$
begin
  if not public._has_policy('horarios_habilitados', 'horarios_select') then
    create policy "horarios_select" on public.horarios_habilitados
      for select using (true);
  end if;
  if not public._has_policy('horarios_habilitados', 'horarios_insert') then
    create policy "horarios_insert" on public.horarios_habilitados
      for insert with check (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('horarios_habilitados', 'horarios_update') then
    create policy "horarios_update" on public.horarios_habilitados
      for update using (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('horarios_habilitados', 'horarios_delete') then
    create policy "horarios_delete" on public.horarios_habilitados
      for delete using (public.is_admin_or_encargada());
  end if;
end $$;

-- ============================================
-- 6. CONFIG_UTI: SELECT, UPDATE
-- ============================================
do $$
begin
  if not public._has_policy('config_uti', 'uti_select') then
    create policy "uti_select" on public.config_uti
      for select using (true);
  end if;
  if not public._has_policy('config_uti', 'uti_update') then
    create policy "uti_update" on public.config_uti
      for update using (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('config_uti', 'uti_insert') then
    create policy "uti_insert" on public.config_uti
      for insert with check (public.is_admin_or_encargada());
  end if;
end $$;

-- ============================================
-- 7. TIPOS_ANESTESIA: SELECT, INSERT, UPDATE, DELETE
-- ============================================
do $$
begin
  if not public._has_policy('tipos_anestesia', 'anestesia_select') then
    create policy "anestesia_select" on public.tipos_anestesia
      for select using (true);
  end if;
  if not public._has_policy('tipos_anestesia', 'anestesia_insert') then
    create policy "anestesia_insert" on public.tipos_anestesia
      for insert with check (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('tipos_anestesia', 'anestesia_update') then
    create policy "anestesia_update" on public.tipos_anestesia
      for update using (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('tipos_anestesia', 'anestesia_delete') then
    create policy "anestesia_delete" on public.tipos_anestesia
      for delete using (public.is_admin_or_encargada());
  end if;
end $$;

-- ============================================
-- 8. OBRAS_SOCIALES: SELECT, INSERT, UPDATE, DELETE
-- ============================================
do $$
begin
  if not public._has_policy('obras_sociales', 'obras_select') then
    create policy "obras_select" on public.obras_sociales
      for select using (true);
  end if;
  if not public._has_policy('obras_sociales', 'obras_insert') then
    create policy "obras_insert" on public.obras_sociales
      for insert with check (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('obras_sociales', 'obras_update') then
    create policy "obras_update" on public.obras_sociales
      for update using (public.is_admin_or_encargada());
  end if;
  if not public._has_policy('obras_sociales', 'obras_delete') then
    create policy "obras_delete" on public.obras_sociales
      for delete using (public.is_admin_or_encargada());
  end if;
end $$;

-- ============================================
-- 9. TURNOS: SELECT, INSERT, UPDATE, DELETE
-- médico solo ve/edita lo propio.
-- admin/encargada ven y modifican todo.
-- ============================================
do $$
begin
  if not public._has_policy('turnos', 'turnos_select') then
    create policy "turnos_select" on public.turnos
      for select using (public.is_admin_or_encargada() or medico_id = auth.uid());
  end if;
  if not public._has_policy('turnos', 'turnos_insert') then
    create policy "turnos_insert" on public.turnos
      for insert with check (medico_id = auth.uid());
  end if;
  if not public._has_policy('turnos', 'turnos_update') then
    create policy "turnos_update" on public.turnos
      for update using (public.is_admin_or_encargada() or medico_id = auth.uid());
  end if;
  if not public._has_policy('turnos', 'turnos_delete') then
    create policy "turnos_delete" on public.turnos
      for delete using (public.is_admin_or_encargada());
  end if;
end $$;

-- ============================================
-- 10. NOTIFICACIONES: SELECT, INSERT
-- destinatario ve las propias; admin/encargada ve todas.
-- ============================================
do $$
begin
  if not public._has_policy('notificaciones', 'notificaciones_select') then
    create policy "notificaciones_select" on public.notificaciones
      for select using (public.is_admin_or_encargada() or destinatario_id = auth.uid());
  end if;
  if not public._has_policy('notificaciones', 'notificaciones_insert') then
    create policy "notificaciones_insert" on public.notificaciones
      for insert with check (true);
  end if;
end $$;

-- ============================================
-- 11. CONFIG_SANATORIO: SELECT, INSERT, UPDATE, DELETE
-- Lectura pública (para login), solo admin modifica.
-- ============================================
do $$
begin
  if not public._has_policy('config_sanatorio', 'sanatorio_select') then
    create policy "sanatorio_select" on public.config_sanatorio
      for select using (true);
  end if;
  if not public._has_policy('config_sanatorio', 'sanatorio_update') then
    create policy "sanatorio_update" on public.config_sanatorio
      for update using (public.get_user_role() = 'admin')
      with check (public.get_user_role() = 'admin');
  end if;
  if not public._has_policy('config_sanatorio', 'sanatorio_insert') then
    create policy "sanatorio_insert" on public.config_sanatorio
      for insert with check (public.get_user_role() = 'admin');
  end if;
  if not public._has_policy('config_sanatorio', 'sanatorio_delete') then
    create policy "sanatorio_delete" on public.config_sanatorio
      for delete using (public.get_user_role() = 'admin');
  end if;
end $$;

-- ============================================
-- 12. Resumen final: políticas activas por tabla
-- ============================================
do $$
declare
  r record;
  cnt int;
begin
  raise notice '============================================';
  raise notice 'RESUMEN DE POLÍTICAS RLS';
  raise notice '============================================';
  for r in (
    select tablename, count(*) as total
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'users', 'quirofanos', 'horarios_habilitados', 'config_uti',
        'tipos_anestesia', 'obras_sociales', 'turnos',
        'notificaciones', 'config_sanatorio'
      )
    group by tablename
    order by tablename
  ) loop
    raise notice '  % : % políticas', rpad(r.tablename, 25), r.total;
  end loop;
end $$;
