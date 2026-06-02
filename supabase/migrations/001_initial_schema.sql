-- ============================================
-- SCHEMA: Sistema de Gestión de Turnos Quirúrgicos
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- ENUM types
-- ============================================
create type rol_usuario as enum ('admin', 'encargada', 'medico');
create type estado_turno as enum ('pendiente', 'confirmada', 'rechazada', 'suspendida', 'eliminada');

-- ============================================
-- TABLA: users (perfils,管理用)
-- ============================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null unique,
  rol rol_usuario not null default 'medico',
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- TABLA: quirofanos
-- ============================================
create table public.quirofanos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- TABLA: horarios_habilitados
-- ============================================
create table public.horarios_habilitados (
  id uuid primary key default uuid_generate_v4(),
  quirofano_id uuid not null references public.quirofanos(id) on delete cascade,
  dia smallint not null check (dia between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null,
  unique(quirofano_id, dia)
);

-- ============================================
-- TABLA: config_uti
-- ============================================
create table public.config_uti (
  id uuid primary key default uuid_generate_v4(),
  dias_permitidos smallint[] not null default '{1,2,3}',
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

-- Insert default UTI config (lunes=1, martes=2, miércoles=3)
insert into public.config_uti (dias_permitidos) values ('{1,2,3}');

-- ============================================
-- TABLA: tipos_anestesia
-- ============================================
create table public.tipos_anestesia (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  activo boolean not null default true
);

-- ============================================
-- TABLA: obras_sociales
-- ============================================
create table public.obras_sociales (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  activo boolean not null default true
);

-- Seed obras sociales
insert into public.obras_sociales (nombre) values
  ('OSDE'), ('Swiss Medical'), ('Galeno'), ('Medifé'), ('IOMA'),
  ('PAMI'), ('Unión Personal'), ('OSECAC'), ('Sancor Salud'), ('Avalian');

-- ============================================
-- TABLA: turnos
-- ============================================
create table public.turnos (
  id uuid primary key default uuid_generate_v4(),
  medico_id uuid not null references public.users(id),
  quirofano_id uuid references public.quirofanos(id),
  paciente_nombre text not null,
  paciente_dni text not null,
  paciente_edad smallint not null,
  obra_social_id uuid not null references public.obras_sociales(id),
  tipo_cirugia text not null,
  tipo_anestesia_id uuid not null references public.tipos_anestesia(id),
  usa_idi boolean not null default false,
  pasa_uti boolean not null default false,
  duracion_minutos smallint not null,
  fecha_hora timestamptz not null,
  estado estado_turno not null default 'pendiente',
  motivo_rechazo text,
  created_at timestamptz not null default now()
);

-- ============================================
-- TABLA: notificaciones
-- ============================================
create table public.notificaciones (
  id uuid primary key default uuid_generate_v4(),
  turno_id uuid not null references public.turnos(id) on delete cascade,
  destinatario_id uuid not null references public.users(id),
  tipo text not null,
  canal text not null check (canal in ('email', 'whatsapp')),
  enviado_at timestamptz
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_turnos_medico on public.turnos(medico_id);
create index idx_turnos_estado on public.turnos(estado);
create index idx_turnos_fecha on public.turnos(fecha_hora);
create index idx_turnos_quirofano on public.turnos(quirofano_id);
create index idx_horarios_quirofano on public.horarios_habilitados(quirofano_id);

-- ============================================
-- RLS Policies
-- ============================================

alter table public.users enable row level security;
alter table public.quirofanos enable row level security;
alter table public.horarios_habilitados enable row level security;
alter table public.config_uti enable row level security;
alter table public.tipos_anestesia enable row level security;
alter table public.obras_sociales enable row level security;
alter table public.turnos enable row level security;
alter table public.notificaciones enable row level security;

-- Helper: get current user's role
create or replace function public.get_user_role()
returns rol_usuario as $$
  select rol from public.users where id = auth.uid();
$$ language sql security definer stable;

-- Helper: is admin or encargada
create or replace function public.is_admin_or_encargada()
returns boolean as $$
  select public.get_user_role() in ('admin', 'encargada');
$$ language sql security definer stable;

-- USERS: admin/encargada can read all, medico can read own
create policy "users_select" on public.users
  for select using (
    auth.uid() = id or public.is_admin_or_encargada()
  );

create policy "users_insert" on public.users
  for insert with check (public.is_admin_or_encargada());

create policy "users_update" on public.users
  for update using (
    public.is_admin_or_encargada() or auth.uid() = id
  );

-- QUIROFANOS: admin/encargada full, medico read only
create policy "quirofanos_select" on public.quirofanos
  for select using (true);

create policy "quirofanos_insert" on public.quirofanos
  for insert with check (public.is_admin_or_encargada());

create policy "quirofanos_update" on public.quirofanos
  for update using (public.is_admin_or_encargada());

create policy "quirofanos_delete" on public.quirofanos
  for delete using (public.is_admin_or_encargada());

-- HORARIOS_HABILITADOS: admin/encargada full, medico read
create policy "horarios_select" on public.horarios_habilitados
  for select using (true);

create policy "horarios_insert" on public.horarios_habilitados
  for insert with check (public.is_admin_or_encargada());

create policy "horarios_update" on public.horarios_habilitados
  for update using (public.is_admin_or_encargada());

create policy "horarios_delete" on public.horarios_habilitados
  for delete using (public.is_admin_or_encargada());

-- CONFIG_UTI: admin/encargada full, medico read
create policy "uti_select" on public.config_uti
  for select using (true);

create policy "uti_update" on public.config_uti
  for update using (public.is_admin_or_encargada());

-- TIPOS_ANESTESIA: admin/encargada full, medico read
create policy "anestesia_select" on public.tipos_anestesia
  for select using (true);

create policy "anestesia_insert" on public.tipos_anestesia
  for insert with check (public.is_admin_or_encargada());

create policy "anestesia_update" on public.tipos_anestesia
  for update using (public.is_admin_or_encargada());

create policy "anestesia_delete" on public.tipos_anestesia
  for delete using (public.is_admin_or_encargada());

-- OBRAS_SOCIALES: admin/encargada full, medico read
create policy "obras_select" on public.obras_sociales
  for select using (true);

create policy "obras_insert" on public.obras_sociales
  for insert with check (public.is_admin_or_encargada());

create policy "obras_update" on public.obras_sociales
  for update using (public.is_admin_or_encargada());

create policy "obras_delete" on public.obras_sociales
  for delete using (public.is_admin_or_encargada());

-- TURNOS: admin/encargada see all, medico see own
create policy "turnos_select" on public.turnos
  for select using (
    public.is_admin_or_encargada() or medico_id = auth.uid()
  );

create policy "turnos_insert" on public.turnos
  for insert with check (medico_id = auth.uid());

create policy "turnos_update" on public.turnos
  for update using (
    public.is_admin_or_encargada() or medico_id = auth.uid()
  );

create policy "turnos_delete" on public.turnos
  for delete using (public.is_admin_or_encargada());

-- NOTIFICACIONES: own notifications + admin/encargada see all
create policy "notificaciones_select" on public.notificaciones
  for select using (
    public.is_admin_or_encargada() or destinatario_id = auth.uid()
  );

create policy "notificaciones_insert" on public.notificaciones
  for insert with check (true);

-- ============================================
-- TRIGGER: auto-create user profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'rol')::rol_usuario, 'medico')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
