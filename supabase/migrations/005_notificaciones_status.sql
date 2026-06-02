-- ============================================
-- MIGRATION 005: notificaciones enhancements
-- ============================================
-- Add status tracking columns to notificaciones so the
-- Resend pipeline can record sent/error outcomes and
-- the error message when an email fails.

alter table public.notificaciones
  add column if not exists estado text not null default 'enviado'
    check (estado in ('enviado', 'error')),
  add column if not exists error_message text,
  add column if not exists destinatario_email text;

create index if not exists idx_notificaciones_estado
  on public.notificaciones (estado);
create index if not exists idx_notificaciones_tipo
  on public.notificaciones (tipo);

-- envio_at is already nullable in 001; keep as is so the client can
-- pre-create a "pending" row if desired, but our pipeline sets it
-- on success only. No data backfill required (existing rows default
-- to 'enviado' which matches the historical intent).
