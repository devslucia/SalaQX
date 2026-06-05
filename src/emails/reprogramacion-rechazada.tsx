import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  Paragraph,
} from "./layout";
import { formatFechaArg } from "@/lib/dates";

interface ReprogramacionRechazadaEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaOriginal: string;
  fechaPropuesta: string;
  motivoRechazo: string;
  sanatorio: { nombre: string; logo_url: string | null };
}

export function ReprogramacionRechazadaEmail(props: ReprogramacionRechazadaEmailProps) {
  return (
    <EmailLayout
      preview={`Tu solicitud de reprogramación fue rechazada`}
      title="Reprogramación rechazada"
      sanatorioNombre={props.sanatorio.nombre}
      sanatorioLogoUrl={props.sanatorio.logo_url}
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Tu solicitud de reprogramación fue{" "}
        <strong style={{ color: "#C0392B" }}>rechazada</strong>. El turno
        continúa en su fecha y hora original.
      </Paragraph>
      <DetailCard>
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow label="Fecha original" value={formatFechaArg(props.fechaOriginal)} />
        <DetailRow label="Fecha que propusiste" value={formatFechaArg(props.fechaPropuesta)} />
      </DetailCard>
      <DetailCard>
        <DetailRow label="Motivo del rechazo" value={props.motivoRechazo} />
      </DetailCard>
      <Paragraph>
        Si querés proponer otra fecha, podés enviar una nueva solicitud de
        reprogramación desde el sistema.
      </Paragraph>
    </EmailLayout>
  );
}

export default ReprogramacionRechazadaEmail;
