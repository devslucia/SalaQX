-- ============================================
-- MIGRATION 002: Remove Google Calendar integration
-- ============================================
-- Drops columns introduced in 001_initial_schema.sql for the
-- Google Calendar integration, which has been removed entirely.
-- The web calendar (Supabase `turnos` table) is the only source
-- of truth for surgical scheduling.

alter table public.quirofanos
  drop column if exists google_calendar_id;

alter table public.turnos
  drop column if exists google_event_id;
