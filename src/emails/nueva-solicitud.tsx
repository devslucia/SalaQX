import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  CtaButton,
  Paragraph,
} from "./layout";

interface NuevaSolicitudEmailProps {
  destinatarioNombre: string;
  medico: { nombre: string; email: string; telefono: string | null };
  paciente: { paciente_nombre: string; paciente_dni: string; paciente_edad: number };
  tipoCirugia: string;
  fechaHora: string;
  duracion: string;
  turnoUrl: string;
}

export function NuevaSolicitudEmail(props: NuevaSolicitudEmailProps) {
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
      preview={`Nueva solicitud de ${props.medico.nombre} para ${props.paciente.paciente_nombre}`}
      title="Nueva solicitud de turno"
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        El médico <strong>{props.medico.nombre}</strong> ha solicitado un nuevo turno
        quirúrgico. Los detalles son los siguientes:
      </Paragraph>
      <DetailCard>
        <DetailRow label="Médico" value={props.medico.nombre} />
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Edad" value={`${props.paciente.paciente_edad} años`} />
        <DetailRow label="Cirugía" value={props.tipoCirugia} />
        <DetailRow label="Fecha y hora" value={fechaFmt} />
        <DetailRow label="Duración estimada" value={props.duracion} />
      </DetailCard>
      <Paragraph>
        Ingresá al sistema para confirmar o rechazar esta solicitud.
      </Paragraph>
      <CtaButton href={props.turnoUrl} label="Ver solicitud" />
    </EmailLayout>
  );
}

export default NuevaSolicitudEmail;
