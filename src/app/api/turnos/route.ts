import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendEmail } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, turno_id } = body;

    const supabase = await createClient();

    // Get turno data
    const { data: turno, error: turnoError } = await supabase
      .from("turnos")
      .select("*, users!turnos_medico_id_fkey(nombre,email,telefono), quirofanos(nombre,google_calendar_id), obras_sociales(nombre), tipos_anestesia(nombre)")
      .eq("id", turno_id)
      .single();

    if (turnoError || !turno) {
      return NextResponse.json({ error: "Turno not found" }, { status: 404 });
    }

    const medico = (turno as any).users;
    const quirofano = (turno as any).quirofanos;

    switch (action) {
      case "confirm": {
        // Create Google Calendar event
        if (quirofano?.google_calendar_id) {
          const start = new Date(turno.fecha_hora);
          const end = new Date(start.getTime() + turno.duracion_minutos * 60000);

          const eventId = await createCalendarEvent(
            quirofano.google_calendar_id,
            `${turno.paciente_nombre} - ${turno.tipo_cirugia}`,
            `Médico: ${medico?.nombre}\nPaciente: ${turno.paciente_nombre}\nDNI: ${turno.paciente_dni}\nObra Social: ${(turno as any).obras_sociales?.nombre}\nAnestesia: ${(turno as any).tipos_anestesia?.nombre}`,
            start.toISOString(),
            end.toISOString()
          );

          if (eventId) {
            await supabase.from("turnos").update({ google_event_id: eventId }).eq("id", turno_id);
          }
        }

        // Send email notification
        if (medico?.email) {
          const start = new Date(turno.fecha_hora);
          await sendEmail({
            to: medico.email,
            subject: "Turno Confirmado - Quirófano",
            html: `
              <h2>Turno Confirmado</h2>
              <p>Hola ${medico.nombre},</p>
              <p>Tu turno para el paciente <strong>${turno.paciente_nombre}</strong> ha sido confirmado.</p>
              <ul>
                <li><strong>Fecha:</strong> ${start.toLocaleDateString("es-AR")} a las ${start.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</li>
                <li><strong>Quirófano:</strong> ${quirofano?.nombre || "—"}</li>
              </ul>
            `,
          });
        }
        break;
      }

      case "reject": {
        if (medico?.email) {
          await sendEmail({
            to: medico.email,
            subject: "Turno Rechazado - Quirófano",
            html: `
              <h2>Turno Rechazado</h2>
              <p>Hola ${medico.nombre},</p>
              <p>Tu turno para el paciente <strong>${turno.paciente_nombre}</strong> ha sido rechazado.</p>
              <p><strong>Motivo:</strong> ${body.motivo || "No especificado"}</p>
              <p>Por favor, elegí otro día y horario.</p>
            `,
          });
        }
        break;
      }

      case "edit": {
        if (turno.google_event_id && quirofano?.google_calendar_id) {
          const start = new Date(body.fecha_hora || turno.fecha_hora);
          const end = new Date(start.getTime() + (body.duracion_minutos || turno.duracion_minutos) * 60000);

          await updateCalendarEvent(
            quirofano.google_calendar_id,
            turno.google_event_id,
            `${turno.paciente_nombre} - ${turno.tipo_cirugia}`,
            `Médico: ${medico?.nombre}`,
            start.toISOString(),
            end.toISOString()
          );
        }
        break;
      }

      case "suspend":
      case "delete": {
        if (turno.google_event_id && quirofano?.google_calendar_id) {
          await deleteCalendarEvent(quirofano.google_calendar_id, turno.google_event_id);
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
