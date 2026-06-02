-- Crear perfil del admin (ejecutar una sola vez)
insert into public.users (id, nombre, email, rol, telefono, activo)
values (
  '721a6bbe-0f33-4dc8-b559-2f205f01271f',
  'Administrador',
  'admin@gmail.com',
  'admin',
  null,
  true
)
on conflict (id) do update set
  rol = 'admin',
  activo = true,
  nombre = excluded.nombre;

-- Verificar
select id, email, rol, activo from public.users;
