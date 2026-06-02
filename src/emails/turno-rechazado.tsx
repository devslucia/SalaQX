import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  CtaButton,
  Paragraph,
} from "./layout";

interface TurnoRechazadoEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaHora: string;
  motivo: string;
  solicitarUrl: string;
}

export function TurnoRechazadoEmail(props: TurnoRechazadoEmailProps) {
  const fechaFmt = new Date(props.fechaHora).toLocaleString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <EmailLayout
      preview={`Tu solicitud de turno para ${fechaFmt} fue rechazada`}
      title="Tu solicitud de turno fue rechazada"
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Lamentamos informarte que tu solicitud de turno quirúrgico no pudo ser
        aceptada. A continuación los detalles:
      </Paragraph>
      <DetailCard>
        <DetailRow label="Fecha solicitada" value={fechaFmt} />
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
      </DetailCard>
      <DetailCard>
        <DetailRow label="Motivo del rechazo" value={props.motivo} />
      </DetailCard>
      <Paragraph>
        Por favor, elegí otro día y horario disponible para la cirugía.
      </Paragraph>
      <CtaButton href={props.solicitarUrl} label="Solicitar nuevo turno" />
    </EmailLayout>
  );
}

export default TurnoRechazadoEmail;
