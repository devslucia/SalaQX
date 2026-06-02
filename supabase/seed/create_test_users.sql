-- ============================================
-- CREAR PRIMER USUARIO ADMIN
-- ============================================
-- 1) Primero crear el usuario en Supabase Auth (Dashboard > Authentication > Users > Add user)
--    Email: admin@quirofano.app
--    Password: la que quieras
--    Copiá el UUID del usuario creado.
--
-- 2) Después ejecutar este SQL reemplazando 'UUID_DEL_USUARIO' con el UUID copiado:

insert into public.users (id, nombre, email, rol, telefono, activo)
values (
  'UUID_DEL_USUARIO',
  'Administrador',
  'admin@quirofano.app',
  'admin',
  null,
  true
)
on conflict (id) do update set
  nombre = excluded.nombre,
  rol = 'admin',
  activo = true;

-- ============================================
-- (Opcional) Crear usuarios de prueba extra
-- ============================================
-- Reemplazá los UUIDs por los reales de cada usuario creado en Auth.
-- Crear usuarios de prueba desde Supabase Dashboard > Authentication > Users:
--   - admin@quirofano.app
--   - encargada@quirofano.app
--   - medico@quirofano.app
-- Después insertar sus perfiles acá:

/*
insert into public.users (id, nombre, email, rol, telefono, activo) values
  ('UUID_ADMIN',      'Admin',            'admin@quirofano.app',     'admin',     '1111111111', true),
  ('UUID_ENCARGADA',  'Encargada',        'encargada@quirofano.app', 'encargada', '2222222222', true),
  ('UUID_MEDICO',     'Dr. Pérez',        'medico@quirofano.app',    'medico',    '3333333333', true)
on conflict (id) do nothing;
*/
