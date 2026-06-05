import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/notifications";
import { actionRatelimit, applyRateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, turno_id } = body;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const limited = await applyRateLimit(actionRatelimit, `action:user:${user.id}`);
    if (!limited.ok) return limited.response;

    const { data: turno, error: turnoError } = await supabase
      .from("turnos")
      .select("*, users!turnos_medico_id_fkey(nombre,email,telefono), quirofanos(nombre), obras_sociales(nombre), tipos_anestesia(nombre)")
      .eq("id", turno_id)
      .single();

    if (turnoError || !turno) {
      return NextResponse.json({ error: "Turno not found" }, { status: 404 });
    }

    const medico = (turno as any).users;
    const quirofano = (turno as any).quirofanos;

    switch (action) {
      case "confirm": {
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

      case "edit":
      case "suspend":
      case "delete": {
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
