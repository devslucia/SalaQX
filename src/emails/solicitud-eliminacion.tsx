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

interface SolicitudEliminacionEmailProps {
  destinatarioNombre: string;
  medico: { nombre: string; email: string; telefono: string | null };
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaHora: string;
  quirofano: { id: string; nombre: string } | null;
  motivo: string | null;
  turnoUrl: string;
  sanatorio: { nombre: string; logo_url: string | null };
}

export function SolicitudEliminacionEmail(props: SolicitudEliminacionEmailProps) {
  return (
    <EmailLayout
      preview={`${props.medico.nombre} solicita eliminar un turno confirmado`}
      title="Solicitud de eliminación de turno"
      sanatorioNombre={props.sanatorio.nombre}
      sanatorioLogoUrl={props.sanatorio.logo_url}
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        El médico <strong>{props.medico.nombre}</strong> solicita la eliminación
        de un turno confirmado. Los detalles son los siguientes:
      </Paragraph>
      <DetailCard>
        <DetailRow label="Médico" value={props.medico.nombre} />
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow label="Fecha y hora" value={formatFechaArg(props.fechaHora)} />
        <DetailRow label="Quirófano" value={props.quirofano?.nombre ?? "—"} />
        {props.motivo && <DetailRow label="Motivo" value={props.motivo} />}
      </DetailCard>
      <Paragraph>
        Ingresá al sistema para aprobar o rechazar esta solicitud.
      </Paragraph>
      <CtaButton href={props.turnoUrl} label="Ver turno" />
    </EmailLayout>
  );
}

export default SolicitudEliminacionEmail;
