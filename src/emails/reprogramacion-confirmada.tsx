import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  Paragraph,
} from "./layout";
import { formatFechaArg } from "@/lib/dates";

interface ReprogramacionConfirmadaEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaAnterior: string;
  fechaNueva: string;
  quirofano: { id: string; nombre: string } | null;
  propuestaPorMedico: boolean;
}

export function ReprogramacionConfirmadaEmail(props: ReprogramacionConfirmadaEmailProps) {
  return (
    <EmailLayout
      preview={`Tu cirugía fue reprogramada para ${formatFechaArg(props.fechaNueva)}`}
      title="Reprogramación confirmada"
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Te informamos que tu solicitud de reprogramación fue{" "}
        <strong style={{ color: "#16A085" }}>aceptada</strong>. La cirugía se
        realizará en la nueva fecha y horario indicados abajo.
      </Paragraph>
      <DetailCard>
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow label="Fecha anterior" value={formatFechaArg(props.fechaAnterior)} />
        <DetailRow label="Nueva fecha y hora" value={formatFechaArg(props.fechaNueva)} />
        <DetailRow label="Quirófano" value={props.quirofano?.nombre ?? "—"} />
      </DetailCard>
      <Paragraph>
        {props.propuestaPorMedico
          ? "La fecha y hora propuestas fueron confirmadas tal como las enviaste."
          : "La encargada asignó una fecha y hora distintas a las que propusiste."}
        {" "}Te recomendamos presentarte <strong>30 minutos antes</strong> del
        horario programado.
      </Paragraph>
    </EmailLayout>
  );
}

export default ReprogramacionConfirmadaEmail;
