import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    await resend.emails.send({
      from: "Quirófano <noreply@quirofano.app>",
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// WhatsApp via Twilio
export async function sendWhatsApp(to: string, message: string) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !from) {
      console.error("Twilio credentials not configured");
      return false;
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `whatsapp:${to}`,
          From: from,
          Body: message,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return false;
  }
}

// Notification templates
export function turnoConfirmadoEmail(nombreMedico: string, paciente: string, fecha: string, quirofano: string) {
  return `
    <h2>Turno Confirmado</h2>
    <p>Hola ${nombreMedico},</p>
    <p>El turno para el paciente <strong>${paciente}</strong> ha sido confirmado.</p>
    <ul>
      <li><strong>Fecha:</strong> ${fecha}</li>
      <li><strong>Quirófano:</strong> ${quirofano}</li>
    </ul>
    <p>Por favor, presentarse 30 minutos antes del horario programado.</p>
  `;
}

export function turnoRechazadoEmail(nombreMedico: string, paciente: string, motivo: string) {
  return `
    <h2>Turno Rechazado</h2>
    <p>Hola ${nombreMedico},</p>
    <p>El turno para el paciente <strong>${paciente}</strong> ha sido rechazado.</p>
    <p><strong>Motivo:</strong> ${motivo}</p>
    <p>Por favor, elegí otro día y horario para la cirugía.</p>
  `;
}

export function nuevaSolicitudEmail(encargadaNombre: string, medico: string, paciente: string, fecha: string) {
  return `
    <h2>Nueva Solicitud de Turno</h2>
    <p>Hola ${encargadaNombre},</p>
    <p>El médico <strong>${medico}</strong> ha solicitado un turno para el paciente <strong>${paciente}</strong>.</p>
    <p><strong>Fecha solicitada:</strong> ${fecha}</p>
    <p>Ingresá al sistema para confirmar o rechazar la solicitud.</p>
  `;
}

export function recordatorioEmail(nombreMedico: string, paciente: string, fecha: string, quirofano: string) {
  return `
    <h2>Recordatorio de Cirugía</h2>
    <p>Hola ${nombreMedico},</p>
    <p>Te recordamos que tenés programada una cirugía mañana.</p>
    <ul>
      <li><strong>Paciente:</strong> ${paciente}</li>
      <li><strong>Fecha:</strong> ${fecha}</li>
      <li><strong>Quirófano:</strong> ${quirofano}</li>
    </ul>
    <p>Por favor, presentarse 30 minutos antes del horario programado.</p>
  `;
}
