-- ============================================
-- MIGRATION 004: Add medico_telefono to turnos
-- ============================================
-- The request form snapshots the requesting medico's
-- phone at request time so notifications have a valid
-- contact even if the user later updates their profile.
-- The column was missing from 001_initial_schema.sql,
-- which caused POST /rest/v1/turnos to fail with 400.

alter table public.turnos
  add column if not exists medico_telefono text;
