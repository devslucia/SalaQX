import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  CtaButton,
  Paragraph,
} from "./layout";
import { formatFechaArg } from "@/lib/dates";

interface TurnoConfirmadoEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaHora: string;
  quirofano: { id: string; nombre: string } | null;
  duracion: string;
  turnoUrl: string;
  sanatorio: { nombre: string; logo_url: string | null };
}

export function TurnoConfirmadoEmail(props: TurnoConfirmadoEmailProps) {
  const fechaFmt = formatFechaArg(props.fechaHora);

  return (
    <EmailLayout
      preview={`Turno confirmado para ${props.paciente.paciente_nombre} el ${fechaFmt}`}
      title="Tu turno fue confirmado"
      sanatorioNombre={props.sanatorio.nombre}
      sanatorioLogoUrl={props.sanatorio.logo_url}
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Te confirmamos que tu solicitud de turno quirúrgico fue{" "}
        <strong style={{ color: "#16A085" }}>confirmada</strong> y ya tiene quirófano
        asignado.
      </Paragraph>
      <DetailCard>
        <DetailRow label="Quirófano" value={props.quirofano?.nombre ?? "—"} />
        <DetailRow label="Fecha y hora" value={fechaFmt} />
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow label="Duración" value={props.duracion} />
      </DetailCard>
      <Paragraph>
        Te recomendamos presentarte <strong>30 minutos antes</strong> del horario
        programado.
      </Paragraph>
      <CtaButton href={props.turnoUrl} label="Ver en calendario" />
    </EmailLayout>
  );
}

export default TurnoConfirmadoEmail;
