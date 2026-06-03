import "server-only";
import { Resend } from "resend";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { render } from "@react-email/components";

import { TurnoConfirmadoEmail } from "@/emails/turno-confirmado";
import { TurnoRechazadoEmail } from "@/emails/turno-rechazado";
import { TurnoRecordatorioEmail } from "@/emails/turno-recordatorio";
import { TurnoEditadoEmail } from "@/emails/turno-editado";
import { TurnoSuspendidoEmail } from "@/emails/turno-suspendido";
import { NuevaSolicitudEmail } from "@/emails/nueva-solicitud";
import { formatFechaArg, formatFechaCortaArg, formatHoraArg } from "@/lib/dates";

export type NotificationTipo =
  | "nueva_solicitud"
  | "confirmacion"
  | "rechazo"
  | "recordatorio"
  | "edicion"
  | "suspension";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const RESEND_FROM = process.env.RESEND_FROM ?? "SalaQX <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quirofano-six.vercel.app";

export const resend = new Resend(RESEND_API_KEY);

export function isResendConfigured(): boolean {
  return RESEND_API_KEY.length > 0 && !RESEND_API_KEY.startsWith("your_");
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role env vars missing");
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface TurnoContext {
  turno: {
    id: string;
    paciente_nombre: string;
    paciente_dni: string;
    paciente_edad: number;
    tipo_cirugia: string;
    duracion_minutos: number;
    fecha_hora: string;
    estado: string;
    motivo_rechazo: string | null;
    medico_telefono: string | null;
    obra_social_id: string | null;
    tipo_anestesia_id: string | null;
    quirofano_id: string | null;
    medico_id: string;
  };
  medico: { id: string; nombre: string; email: string; telefono: string | null } | null;
  quirofano: { id: string; nombre: string } | null;
  obraSocial: { id: string; nombre: string } | null;
  tipoAnestesia: { id: string; nombre: string } | null;
}

export async function loadTurnoContext(turnoId: string): Promise<TurnoContext | null> {
  const supabase = getAdminClient();
  const { data: turno, error } = await supabase
    .from("turnos")
    .select("*")
    .eq("id", turnoId)
    .single();
  if (error || !turno) return null;

  const [medicoRes, quirofanoRes, osRes, taRes] = await Promise.all([
    supabase.from("users").select("id, nombre, email, telefono").eq("id", turno.medico_id).maybeSingle(),
    turno.quirofano_id
      ? supabase.from("quirofanos").select("id, nombre").eq("id", turno.quirofano_id).maybeSingle()
      : Promise.resolve({ data: null }),
    turno.obra_social_id
      ? supabase.from("obras_sociales").select("id, nombre").eq("id", turno.obra_social_id).maybeSingle()
      : Promise.resolve({ data: null }),
    turno.tipo_anestesia_id
      ? supabase.from("tipos_anestesia").select("id, nombre").eq("id", turno.tipo_anestesia_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    turno: turno as TurnoContext["turno"],
    medico: (medicoRes.data as TurnoContext["medico"]) ?? null,
    quirofano: (quirofanoRes.data as TurnoContext["quirofano"]) ?? null,
    obraSocial: (osRes.data as TurnoContext["obraSocial"]) ?? null,
    tipoAnestesia: (taRes.data as TurnoContext["tipoAnestesia"]) ?? null,
  };
}

export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

interface SendResult {
  ok: boolean;
  error?: string;
  recipients?: string[];
}

interface LogParams {
  turnoId: string;
  destinatarioId: string | null;
  destinatarioEmail: string;
  tipo: NotificationTipo;
  estado: "enviado" | "error";
  errorMessage?: string;
}

async function logNotificacion(p: LogParams): Promise<void> {
  try {
    const supabase = getAdminClient();
    await supabase.from("notificaciones").insert({
      turno_id: p.turnoId,
      destinatario_id: p.destinatarioId,
      destinatario_email: p.destinatarioEmail,
      tipo: p.tipo,
      canal: "email",
      estado: p.estado,
      error_message: p.errorMessage ?? null,
      enviado_at: p.estado === "enviado" ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("[resend] failed to log notificacion:", err);
  }
}

async function sendOne(params: {
  to: string;
  subject: string;
  react: React.ReactElement;
  log: Omit<LogParams, "estado" | "errorMessage" | "destinatarioEmail">;
}): Promise<SendResult> {
  if (!isResendConfigured()) {
    console.warn("[resend] RESEND_API_KEY not configured, skipping send");
    await logNotificacion({
      ...params.log,
      destinatarioEmail: params.to,
      estado: "error",
      errorMessage: "RESEND_API_KEY not configured",
    });
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const html = await render(params.react);
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: params.to,
      subject: params.subject,
      html,
    });

    if (error) {
      console.error("[resend] send error:", error);
      await logNotificacion({
        ...params.log,
        destinatarioEmail: params.to,
        estado: "error",
        errorMessage: error.message ?? JSON.stringify(error),
      });
      return { ok: false, error: error.message };
    }

    await logNotificacion({
      ...params.log,
      destinatarioEmail: params.to,
      estado: "enviado",
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resend] unexpected throw:", err);
    await logNotificacion({
      ...params.log,
      destinatarioEmail: params.to,
      estado: "error",
      errorMessage: message,
    });
    return { ok: false, error: message };
  }
}

export async function sendNuevaSolicitud(turnoId: string): Promise<SendResult> {
  const ctx = await loadTurnoContext(turnoId);
  if (!ctx) return { ok: false, error: "turno not found" };

  const supabase = getAdminClient();
  const { data: reviewers, error: revErr } = await supabase
    .from("users")
    .select("id, nombre, email, rol")
    .in("rol", ["admin", "encargada"])
    .eq("activo", true);

  if (revErr) {
    console.error("[resend] failed to list reviewers:", revErr);
    return { ok: false, error: revErr.message };
  }

  const recipients = (reviewers ?? []).filter((r) => r.email) as Array<{
    id: string;
    nombre: string;
    email: string;
  }>;

  if (recipients.length === 0) {
    console.warn("[resend] no admin/encargada recipients for nueva_solicitud");
    return { ok: false, error: "no admin/encargada recipients" };
  }

  const turnoUrl = `${APP_URL}/turnos/${turnoId}`;

  const results = await Promise.all(
    recipients.map((r) =>
      sendOne({
        to: r.email,
        subject: `Nueva solicitud de turno — ${ctx.medico?.nombre ?? "Médico"}`,
        react: NuevaSolicitudEmail({
          destinatarioNombre: r.nombre,
          medico: ctx.medico!,
          paciente: ctx.turno,
          tipoCirugia: ctx.turno.tipo_cirugia,
          fechaHora: ctx.turno.fecha_hora,
          duracion: formatDuracion(ctx.turno.duracion_minutos),
          turnoUrl,
        }),
        log: { turnoId, destinatarioId: r.id, tipo: "nueva_solicitud" },
      }),
    ),
  );

  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length === 0,
    error: failed.length > 0 ? failed.map((r) => r.error).join("; ") : undefined,
    recipients: recipients.map((r) => r.email),
  };
}

export async function sendTurnoConfirmado(turnoId: string): Promise<SendResult> {
  const ctx = await loadTurnoContext(turnoId);
  if (!ctx) return { ok: false, error: "turno not found" };
  if (!ctx.medico?.email) return { ok: false, error: "medico has no email" };

  const turnoUrl = `${APP_URL}/turnos/${turnoId}`;

  return sendOne({
    to: ctx.medico.email,
    subject: `Turno confirmado — ${formatFechaCortaArg(ctx.turno.fecha_hora)}`,
    react: TurnoConfirmadoEmail({
      destinatarioNombre: ctx.medico.nombre,
      paciente: ctx.turno,
      tipoCirugia: ctx.turno.tipo_cirugia,
      fechaHora: ctx.turno.fecha_hora,
      quirofano: ctx.quirofano,
      duracion: formatDuracion(ctx.turno.duracion_minutos),
      turnoUrl,
    }),
    log: { turnoId, destinatarioId: ctx.medico.id, tipo: "confirmacion" },
  });
}

export async function sendTurnoRechazado(
  turnoId: string,
  motivo: string,
): Promise<SendResult> {
  const ctx = await loadTurnoContext(turnoId);
  if (!ctx) return { ok: false, error: "turno not found" };
  if (!ctx.medico?.email) return { ok: false, error: "medico has no email" };

  const turnoUrl = `${APP_URL}/solicitar-turno`;

  return sendOne({
    to: ctx.medico.email,
    subject: `Turno rechazado — ${formatFechaCortaArg(ctx.turno.fecha_hora)}`,
    react: TurnoRechazadoEmail({
      destinatarioNombre: ctx.medico.nombre,
      paciente: ctx.turno,
      tipoCirugia: ctx.turno.tipo_cirugia,
      fechaHora: ctx.turno.fecha_hora,
      motivo,
      solicitarUrl: turnoUrl,
    }),
    log: { turnoId, destinatarioId: ctx.medico.id, tipo: "rechazo" },
  });
}

export async function sendRecordatorio24hs(turnoId: string): Promise<SendResult> {
  const ctx = await loadTurnoContext(turnoId);
  if (!ctx) return { ok: false, error: "turno not found" };
  if (!ctx.medico?.email) return { ok: false, error: "medico has no email" };

  return sendOne({
    to: ctx.medico.email,
    subject: `Recordatorio — Cirugía mañana a las ${formatHoraArg(ctx.turno.fecha_hora)} hs`,
    react: TurnoRecordatorioEmail({
      destinatarioNombre: ctx.medico.nombre,
      paciente: ctx.turno,
      tipoCirugia: ctx.turno.tipo_cirugia,
      fechaHora: ctx.turno.fecha_hora,
      quirofano: ctx.quirofano,
      medicoTelefono: ctx.medico.telefono ?? ctx.turno.medico_telefono,
    }),
    log: { turnoId, destinatarioId: ctx.medico.id, tipo: "recordatorio" },
  });
}

export interface CambioEdit {
  campo: "fecha_hora" | "duracion_minutos" | "quirofano_id";
  anterior: string | number;
  nuevo: string | number;
}

export async function sendCirugiaEditada(
  turnoId: string,
  cambiosIn: string[] | CambioEdit[],
): Promise<SendResult> {
  const ctx = await loadTurnoContext(turnoId);
  if (!ctx) return { ok: false, error: "turno not found" };
  if (!ctx.medico?.email) return { ok: false, error: "medico has no email" };

  const cambios: string[] = (cambiosIn ?? []).map((c) => {
    if (typeof c === "string") return c;
    switch (c.campo) {
      case "fecha_hora":
        return `Fecha y hora: de ${formatFechaArg(c.anterior as string)} a ${formatFechaArg(c.nuevo as string)}`;
      case "duracion_minutos":
        return `Duración: de ${formatDuracion(c.anterior as number)} a ${formatDuracion(c.nuevo as number)}`;
      case "quirofano_id":
        return `Quirófano: de ${c.anterior} a ${c.nuevo}`;
      default:
        return `${c.campo}: ${c.anterior} → ${c.nuevo}`;
    }
  });

  if (cambios.length === 0) {
    cambios.push("Datos actualizados");
  }

  const turnoUrl = `${APP_URL}/turnos/${turnoId}`;

  return sendOne({
    to: ctx.medico.email,
    subject: `Tu cirugía fue modificada — ${formatFechaCortaArg(ctx.turno.fecha_hora)}`,
    react: TurnoEditadoEmail({
      destinatarioNombre: ctx.medico.nombre,
      paciente: ctx.turno,
      tipoCirugia: ctx.turno.tipo_cirugia,
      fechaHora: ctx.turno.fecha_hora,
      quirofano: ctx.quirofano,
      duracion: formatDuracion(ctx.turno.duracion_minutos),
      cambios,
      turnoUrl,
    }),
    log: { turnoId, destinatarioId: ctx.medico.id, tipo: "edicion" },
  });
}

export async function sendCirugiaSuspendida(turnoId: string): Promise<SendResult> {
  const ctx = await loadTurnoContext(turnoId);
  if (!ctx) return { ok: false, error: "turno not found" };
  if (!ctx.medico?.email) return { ok: false, error: "medico has no email" };

  return sendOne({
    to: ctx.medico.email,
    subject: `Cirugía suspendida — ${formatFechaCortaArg(ctx.turno.fecha_hora)}`,
    react: TurnoSuspendidoEmail({
      destinatarioNombre: ctx.medico.nombre,
      paciente: ctx.turno,
      tipoCirugia: ctx.turno.tipo_cirugia,
      fechaHora: ctx.turno.fecha_hora,
    }),
    log: { turnoId, destinatarioId: ctx.medico.id, tipo: "suspension" },
  });
}
