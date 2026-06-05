-- ============================================
-- Configuración global del sanatorio
-- Permite personalizar nombre y logo que se
-- muestran en toda la app y en los emails.
-- ============================================

create table public.config_sanatorio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default 'Mi Sanatorio',
  logo_url text,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

-- Seed: insertar fila por default para que la app siempre tenga un valor
insert into public.config_sanatorio (nombre) values ('SalaQX');

-- RLS
alter table public.config_sanatorio enable row level security;

-- Lectura pública (cualquier usuario, incluso anónimo en la página de login)
create policy "sanatorio_select" on public.config_sanatorio
  for select using (true);

-- Solo admin puede modificar
create policy "sanatorio_update" on public.config_sanatorio
  for update using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "sanatorio_insert" on public.config_sanatorio
  for insert with check (public.get_user_role() = 'admin');

create policy "sanatorio_delete" on public.config_sanatorio
  for delete using (public.get_user_role() = 'admin');

-- ============================================
-- Storage bucket: logos
-- ============================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Lectura pública del bucket
create policy "logos_select" on storage.objects
  for select using (bucket_id = 'logos');

-- Solo admin puede subir/modificar/borrar archivos
create policy "logos_insert" on storage.objects
  for insert with check (
    bucket_id = 'logos' and public.get_user_role() = 'admin'
  );

create policy "logos_update" on storage.objects
  for update using (
    bucket_id = 'logos' and public.get_user_role() = 'admin'
  );

create policy "logos_delete" on storage.objects
  for delete using (
    bucket_id = 'logos' and public.get_user_role() = 'admin'
  );
