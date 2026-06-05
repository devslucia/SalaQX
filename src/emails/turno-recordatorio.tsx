import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  Paragraph,
} from "./layout";
import { formatFechaArg, formatHoraArg } from "@/lib/dates";

interface TurnoRecordatorioEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaHora: string;
  quirofano: { id: string; nombre: string } | null;
  medicoTelefono: string | null;
  sanatorio: { nombre: string; logo_url: string | null };
}

export function TurnoRecordatorioEmail(props: TurnoRecordatorioEmailProps) {
  const fechaFmt = formatFechaArg(props.fechaHora);
  const horaCorta = formatHoraArg(props.fechaHora);

  return (
    <EmailLayout
      preview={`Recordatorio: cirugía mañana a las ${horaCorta} hs`}
      title="Recordatorio: cirugía mañana"
      sanatorioNombre={props.sanatorio.nombre}
      sanatorioLogoUrl={props.sanatorio.logo_url}
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Te recordamos que tenés programada una cirugía{" "}
        <strong>mañana a las {horaCorta} hs</strong>. Te dejamos los detalles:
      </Paragraph>
      <DetailCard>
        <DetailRow label="Quirófano" value={props.quirofano?.nombre ?? "—"} />
        <DetailRow label="Fecha y hora" value={fechaFmt} />
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        {props.medicoTelefono && (
          <DetailRow label="Tu contacto" value={props.medicoTelefono} />
        )}
      </DetailCard>
      <Paragraph>
        Por favor, presentate <strong>30 minutos antes</strong> del horario programado.
      </Paragraph>
    </EmailLayout>
  );
}

export default TurnoRecordatorioEmail;
