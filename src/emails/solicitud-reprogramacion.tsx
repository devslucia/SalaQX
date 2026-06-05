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

interface SolicitudReprogramacionEmailProps {
  destinatarioNombre: string;
  medico: { nombre: string; email: string; telefono: string | null };
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaActual: string;
  fechaPropuesta: string;
  motivo: string | null;
  turnoUrl: string;
  sanatorio: { nombre: string; logo_url: string | null };
}

export function SolicitudReprogramacionEmail(props: SolicitudReprogramacionEmailProps) {
  return (
    <EmailLayout
      preview={`${props.medico.nombre} solicita reprogramar un turno`}
      title="Solicitud de reprogramación"
      sanatorioNombre={props.sanatorio.nombre}
      sanatorioLogoUrl={props.sanatorio.logo_url}
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        El médico <strong>{props.medico.nombre}</strong> solicita reprogramar un
        turno. Los detalles son los siguientes:
      </Paragraph>
      <DetailCard>
        <DetailRow label="Médico" value={props.medico.nombre} />
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow label="Fecha y hora actual" value={formatFechaArg(props.fechaActual)} />
        <DetailRow
          label="Nueva fecha propuesta"
          value={formatFechaArg(props.fechaPropuesta)}
        />
        {props.motivo && <DetailRow label="Motivo" value={props.motivo} />}
      </DetailCard>
      <Paragraph>
        Podés aceptar la fecha propuesta, asignar otra distinta, o rechazar la
        solicitud.
      </Paragraph>
      <CtaButton href={props.turnoUrl} label="Ver turno" />
    </EmailLayout>
  );
}

export default SolicitudReprogramacionEmail;
