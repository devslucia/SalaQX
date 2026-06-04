import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstadoTurno } from "@/lib/types";

export interface ConflictoInfo {
  id: string;
  fecha_hora: string;
  duracion_minutos: number;
  paciente_nombre: string;
  tipo_cirugia: string;
  medico: { id: string; nombre: string } | null;
}

const ESTADOS_BLOQUEANTES: EstadoTurno[] = [
  "confirmada",
  "pendiente",
  "solicitud_reprogramacion",
];

export async function detectarConflictos(
  supabase: SupabaseClient,
  quirofanoId: string,
  fechaHora: Date,
  duracionMinutos: number,
  excludeTurnoId?: string,
): Promise<ConflictoInfo[]> {
  const inicio = new Date(fechaHora);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fechaHora);
  fin.setHours(23, 59, 59, 999);

  let q = supabase
    .from("turnos")
    .select(
      "id, fecha_hora, duracion_minutos, paciente_nombre, tipo_cirugia, medico_id, users:medico_id(id, nombre)",
    )
    .eq("quirofano_id", quirofanoId)
    .in("estado", ESTADOS_BLOQUEANTES)
    .gte("fecha_hora", inicio.toISOString())
    .lte("fecha_hora", fin.toISOString());
  if (excludeTurnoId) q = q.neq("id", excludeTurnoId);

  const { data, error } = await q;
  if (error) {
    console.error("[detectarConflictos] query error:", error);
    return [];
  }
  if (!data) return [];

  const finNuevo = new Date(fechaHora.getTime() + duracionMinutos * 60_000);
  return (data as unknown as Array<{
    id: string;
    fecha_hora: string;
    duracion_minutos: number;
    paciente_nombre: string;
    tipo_cirugia: string;
    users: { id: string; nombre: string } | { id: string; nombre: string }[] | null;
  }>)
    .filter((t) => {
      const tIni = new Date(t.fecha_hora);
      const tFin = new Date(tIni.getTime() + t.duracion_minutos * 60_000);
      return fechaHora < tFin && finNuevo > tIni;
    })
    .map((t) => {
      const m = Array.isArray(t.users) ? t.users[0] ?? null : t.users;
      return {
        id: t.id,
        fecha_hora: t.fecha_hora,
        duracion_minutos: t.duracion_minutos,
        paciente_nombre: t.paciente_nombre,
        tipo_cirugia: t.tipo_cirugia,
        medico: m,
      };
    });
}

export async function detectarConflictosTodosLosQuirofanos(
  supabase: SupabaseClient,
  fechaHora: Date,
  duracionMinutos: number,
  excludeTurnoId: string | undefined,
  quirofanosIds: string[],
): Promise<Map<string, ConflictoInfo[]>> {
  const result = new Map<string, ConflictoInfo[]>();
  await Promise.all(
    quirofanosIds.map(async (qId) => {
      const conflictos = await detectarConflictos(
        supabase,
        qId,
        fechaHora,
        duracionMinutos,
        excludeTurnoId,
      );
      result.set(qId, conflictos);
    }),
  );
  return result;
}
