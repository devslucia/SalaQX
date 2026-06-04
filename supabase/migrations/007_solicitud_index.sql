-- ============================================
-- MIGRATION 007: índice para solicitudes
-- ============================================
-- El CREATE INDEX se separó de la migración 006 porque PostgreSQL
-- no permite usar nuevos valores de enum dentro de la misma transacción
-- en la que se agregan (error 55P04).
create index if not exists idx_turnos_estado_solicitud
  on public.turnos (estado)
  where estado in ('solicitud_eliminacion', 'solicitud_reprogramacion');
