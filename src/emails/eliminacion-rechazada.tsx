import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  Paragraph,
} from "./layout";
import { formatFechaArg } from "@/lib/dates";

interface EliminacionRechazadaEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaHora: string;
  motivoRechazo: string;
}

export function EliminacionRechazadaEmail(props: EliminacionRechazadaEmailProps) {
  return (
    <EmailLayout
      preview={`Tu solicitud de eliminación fue rechazada`}
      title="Eliminación rechazada"
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Lamentamos informarte que tu solicitud de eliminación de un turno
        confirmado fue <strong style={{ color: "#C0392B" }}>rechazada</strong>.
        El turno sigue vigente.
      </Paragraph>
      <DetailCard>
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow label="Fecha del turno" value={formatFechaArg(props.fechaHora)} />
      </DetailCard>
      <DetailCard>
        <DetailRow label="Motivo del rechazo" value={props.motivoRechazo} />
      </DetailCard>
      <Paragraph>
        Si necesitás reprogramar la cirugía, podés enviar una solicitud de
        reprogramación desde el sistema.
      </Paragraph>
    </EmailLayout>
  );
}

export default EliminacionRechazadaEmail;
