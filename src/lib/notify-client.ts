export type NotificationKind =
  | "nueva-solicitud"
  | "turno-confirmado"
  | "turno-confirmado-con-cambio"
  | "turno-rechazado"
  | "recordatorio"
  | "cirugia-editada"
  | "cirugia-suspendida"
  | "solicitud-eliminacion"
  | "eliminacion-aprobada"
  | "eliminacion-rechazada"
  | "solicitud-reprogramacion"
  | "reprogramacion-confirmada"
  | "reprogramacion-rechazada";

export interface CambioEdit {
  campo: "fecha_hora" | "duracion_minutos" | "quirofano_id";
  anterior: string | number;
  nuevo: string | number;
}

export interface NotifyOptions {
  turno_id: string;
  motivo?: string;
  cambios?: string[] | CambioEdit[];
  fecha_propuesta?: string;
  fecha_hora_anterior?: string;
}

export interface NotifyResult {
  ok: boolean;
  rateLimited?: boolean;
  resetAt?: number;
  error?: string;
}

export async function notify(
  kind: NotificationKind,
  opts: NotifyOptions,
): Promise<NotifyResult> {
  try {
    const res = await fetch(`/api/notificaciones/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });

    if (res.status === 429) {
      const resetHeader = res.headers.get("X-RateLimit-Reset");
      const resetAt = resetHeader ? Number(resetHeader) : undefined;
      console.warn(`[notify] ${kind} rate-limited until ${resetAt}`);
      // Toast via sonner (cargado dinámicamente para no acoplar este módulo a "use client")
      try {
        const { toast } = await import("sonner");
        const minutes = resetAt
          ? Math.max(1, Math.ceil((resetAt - Date.now()) / 60000))
          : 1;
        toast.error("Demasiadas solicitudes", {
          description: `Esperá ${minutes} min antes de continuar.`,
        });
      } catch {
        // ignore toast errors
      }
      return { ok: false, rateLimited: true, resetAt };
    }

    if (!res.ok && res.status !== 202) {
      const body = await res.json().catch(() => ({}));
      console.warn(`[notify] ${kind} returned ${res.status}:`, body);
      return { ok: false, error: body?.error };
    }

    return { ok: true };
  } catch (err) {
    console.warn(`[notify] ${kind} network error:`, err);
    return { ok: false, error: "network" };
  }
}
