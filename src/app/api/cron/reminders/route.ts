import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/notifications";

// GET: Send reminders for surgeries happening tomorrow
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Find confirmed surgeries for tomorrow
    const { data: turnos, error } = await supabase
      .from("turnos")
      .select("*, users!turnos_medico_id_fkey(nombre,email), quirofanos(nombre)")
      .eq("estado", "confirmada")
      .gte("fecha_hora", tomorrow.toISOString())
      .lte("fecha_hora", tomorrowEnd.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let sent = 0;

    for (const turno of turnos || []) {
      const medico = (turno as any).users;
      const quirofano = (turno as any).quirofanos;

      if (!medico?.email) continue;

      const start = new Date(turno.fecha_hora);

      await sendEmail({
        to: medico.email,
        subject: "Recordatorio: Cirugía mañana - Quirófano",
        html: `
          <h2>Recordatorio de Cirugía</h2>
          <p>Hola ${medico.nombre},</p>
          <p>Te recordamos que tenés programada una cirugía mañana.</p>
          <ul>
            <li><strong>Paciente:</strong> ${turno.paciente_nombre}</li>
            <li><strong>Fecha:</strong> ${start.toLocaleDateString("es-AR")} a las ${start.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</li>
            <li><strong>Quirófano:</strong> ${quirofano?.nombre || "—"}</li>
          </ul>
          <p>Por favor, presentarse 30 minutos antes del horario programado.</p>
        `,
      });

      // Log notification
      await supabase.from("notificaciones").insert({
        turno_id: turno.id,
        destinatario_id: turno.medico_id,
        tipo: "recordatorio_24hs",
        canal: "email",
        enviado_at: new Date().toISOString(),
      });

      sent++;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("Reminder cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
