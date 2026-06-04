import { NextRequest, NextResponse } from "next/server";
import {
  sendNuevaSolicitud,
  sendTurnoConfirmado,
  sendTurnoConfirmadoConCambio,
  sendTurnoRechazado,
  sendRecordatorio24hs,
  sendCirugiaEditada,
  sendCirugiaSuspendida,
  sendSolicitudEliminacion,
  sendEliminacionAprobada,
  sendEliminacionRechazada,
  sendSolicitudReprogramacion,
  sendReprogramacionConfirmada,
  sendReprogramacionRechazada,
  type NotificationTipo,
  isResendConfigured,
} from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ tipo: string }>;
}

const VALID_TIPOS: NotificationTipo[] = [
  "nueva_solicitud",
  "confirmacion",
  "confirmacion_con_cambio",
  "rechazo",
  "recordatorio",
  "edicion",
  "suspension",
  "solicitud_eliminacion",
  "eliminacion_aprobada",
  "eliminacion_rechazada",
  "solicitud_reprogramacion",
  "reprogramacion_confirmada",
  "reprogramacion_rechazada",
];

function normalizarTipo(t: string): NotificationTipo | null {
  const map: Record<string, NotificationTipo> = {
    "nueva-solicitud": "nueva_solicitud",
    "nueva_solicitud": "nueva_solicitud",
    "turno-confirmado": "confirmacion",
    "confirmacion": "confirmacion",
    "turno-confirmado-con-cambio": "confirmacion_con_cambio",
    "confirmacion-con-cambio": "confirmacion_con_cambio",
    "confirmacion_con_cambio": "confirmacion_con_cambio",
    "turno-rechazado": "rechazo",
    "rechazo": "rechazo",
    "recordatorio": "recordatorio",
    "recordatorio-24hs": "recordatorio",
    "cirugia-editada": "edicion",
    "edicion": "edicion",
    "cirugia-suspendida": "suspension",
    "suspension": "suspension",
    "solicitud-eliminacion": "solicitud_eliminacion",
    "solicitud_eliminacion": "solicitud_eliminacion",
    "eliminacion-aprobada": "eliminacion_aprobada",
    "eliminacion_aprobada": "eliminacion_aprobada",
    "eliminacion-rechazada": "eliminacion_rechazada",
    "eliminacion_rechazada": "eliminacion_rechazada",
    "solicitud-reprogramacion": "solicitud_reprogramacion",
    "solicitud_reprogramacion": "solicitud_reprogramacion",
    "reprogramacion-confirmada": "reprogramacion_confirmada",
    "reprogramacion_confirmada": "reprogramacion_confirmada",
    "reprogramacion-rechazada": "reprogramacion_rechazada",
    "reprogramacion_rechazada": "reprogramacion_rechazada",
  };
  const out = map[t];
  return VALID_TIPOS.includes(out) ? out : null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tipo } = await params;
  const tipoNorm = normalizarTipo(tipo);
  if (!tipoNorm) {
    return NextResponse.json(
      { error: `Tipo de notificación inválido: ${tipo}` },
      { status: 400 },
    );
  }

  let body: {
    turno_id?: string;
    motivo?: string;
    cambios?: unknown;
    fecha_propuesta?: string;
    fecha_hora_anterior?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { turno_id, motivo, cambios, fecha_propuesta, fecha_hora_anterior } = body;
  if (!turno_id) {
    return NextResponse.json({ error: "turno_id es requerido" }, { status: 400 });
  }

  if (!isResendConfigured()) {
    console.warn(`[notificaciones] RESEND_API_KEY no configurada, omitiendo ${tipoNorm}`);
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
        reason: "RESEND_API_KEY no configurada",
      },
      { status: 202 },
    );
  }

  try {
    let result;
    switch (tipoNorm) {
      case "nueva_solicitud":
        result = await sendNuevaSolicitud(turno_id);
        break;
      case "confirmacion":
        result = await sendTurnoConfirmado(turno_id);
        break;
      case "confirmacion_con_cambio":
        if (!fecha_hora_anterior) {
          return NextResponse.json(
            { error: "fecha_hora_anterior es requerida" },
            { status: 400 },
          );
        }
        result = await sendTurnoConfirmadoConCambio(turno_id, fecha_hora_anterior);
        break;
      case "rechazo":
        result = await sendTurnoRechazado(turno_id, motivo ?? "Sin motivo especificado");
        break;
      case "recordatorio":
        result = await sendRecordatorio24hs(turno_id);
        break;
      case "edicion":
        result = await sendCirugiaEditada(turno_id, (cambios ?? []) as never);
        break;
      case "suspension":
        result = await sendCirugiaSuspendida(turno_id);
        break;
      case "solicitud_eliminacion":
        result = await sendSolicitudEliminacion(turno_id, motivo ?? null);
        break;
      case "eliminacion_aprobada":
        result = await sendEliminacionAprobada(turno_id);
        break;
      case "eliminacion_rechazada":
        result = await sendEliminacionRechazada(turno_id, motivo ?? "Sin motivo especificado");
        break;
      case "solicitud_reprogramacion":
        if (!fecha_propuesta) {
          return NextResponse.json(
            { error: "fecha_propuesta es requerida" },
            { status: 400 },
          );
        }
        result = await sendSolicitudReprogramacion(turno_id, fecha_propuesta, motivo ?? null);
        break;
      case "reprogramacion_confirmada":
        result = await sendReprogramacionConfirmada(
          turno_id,
          fecha_propuesta ?? new Date().toISOString(),
          Boolean(motivo),
        );
        break;
      case "reprogramacion_rechazada":
        if (!fecha_propuesta) {
          return NextResponse.json(
            { error: "fecha_propuesta es requerida" },
            { status: 400 },
          );
        }
        result = await sendReprogramacionRechazada(
          turno_id,
          fecha_propuesta,
          motivo ?? "Sin motivo especificado",
        );
        break;
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "send failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      tipo: tipoNorm,
      recipients: result.recipients,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notificaciones] error en ${tipoNorm}:`, err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { tipos: VALID_TIPOS, message: "Use POST con { turno_id, ... }" },
    { status: 200 },
  );
}
