-- ============================================
-- MIGRATION 011: Carga manual de turnos
-- Permite a admin/encargada crear turnos directamente
-- con médico externo (sin cuenta en el sistema)
-- ============================================

-- 1. Hacer medico_id nullable (antes era NOT NULL)
--    Los turnos manuales no tienen medico_id porque el médico es externo
ALTER TABLE public.turnos
  ALTER COLUMN medico_id DROP NOT NULL;

-- 2. Agregar columnas para datos del médico externo
ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS medico_nombre text,
  ADD COLUMN IF NOT EXISTS medico_email text,
  ADD COLUMN IF NOT EXISTS medico_celular text,
  ADD COLUMN IF NOT EXISTS cargado_por_rol text CHECK (cargado_por_rol IN ('medico', 'encargada', 'admin'));

-- 3. Actualizar política de INSERT para permitir admin/encargada
--    (antes solo permitía medico_id = auth.uid())
DROP POLICY IF EXISTS "turnos_insert" ON public.turnos;

CREATE POLICY "turnos_insert" ON public.turnos
  FOR INSERT WITH CHECK (
    -- Médicos solo pueden crear turnos propios
    medico_id = auth.uid()
    OR
    -- Admin/encargada pueden crear turnos (con medico_id null o cualquiera)
    public.is_admin_or_encargada()
  );

-- 4. Agregar índice para búsquedas por cargado_por_rol
CREATE INDEX IF NOT EXISTS idx_turnos_cargado_por ON public.turnos(cargado_por_rol);
