export type NotificationKind =
  | "nueva-solicitud"
  | "turno-confirmado"
  | "turno-rechazado"
  | "recordatorio"
  | "cirugia-editada"
  | "cirugia-suspendida";

export interface CambioEdit {
  campo: "fecha_hora" | "duracion_minutos" | "quirofano_id";
  anterior: string | number;
  nuevo: string | number;
}

export interface NotifyOptions {
  turno_id: string;
  motivo?: string;
  cambios?: string[] | CambioEdit[];
}

export async function notify(
  kind: NotificationKind,
  opts: NotifyOptions,
): Promise<void> {
  try {
    const res = await fetch(`/api/notificaciones/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok && res.status !== 202) {
      const body = await res.json().catch(() => ({}));
      console.warn(`[notify] ${kind} returned ${res.status}:`, body);
    }
  } catch (err) {
    console.warn(`[notify] ${kind} network error:`, err);
  }
}
