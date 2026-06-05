import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  Paragraph,
} from "./layout";
import { formatFechaArg } from "@/lib/dates";

interface TurnoConfirmadoConCambioEmailProps {
  destinatarioNombre: string;
  pacienteNombre: string;
  tipoCirugia: string;
  fechaHoraAnterior: string;
  fechaHoraNueva: string;
  quirofanoNombre: string;
  motivo: string;
  sanatorio: { nombre: string; logo_url: string | null };
}

export function TurnoConfirmadoConCambioEmail(props: TurnoConfirmadoConCambioEmailProps) {
  return (
    <EmailLayout
      preview={`Tu turno fue confirmado con un horario diferente al solicitado`}
      title="Turno confirmado con horario modificado"
      sanatorioNombre={props.sanatorio.nombre}
      sanatorioLogoUrl={props.sanatorio.logo_url}
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Tu turno fue confirmado pero con un{" "}
        <strong style={{ color: "#E67E22" }}>horario diferente</strong> al solicitado:
      </Paragraph>
      <DetailCard>
        <DetailRow label="Paciente" value={props.pacienteNombre} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow
          label="Horario solicitado"
          value={formatFechaArg(props.fechaHoraAnterior)}
        />
        <DetailRow
          label="Nuevo horario asignado"
          value={formatFechaArg(props.fechaHoraNueva)}
        />
        <DetailRow label="Quirófano" value={props.quirofanoNombre} />
        <DetailRow label="Motivo" value={props.motivo} />
      </DetailCard>
      <Paragraph>
        Te recomendamos presentarte <strong>30 minutos antes</strong> del nuevo
        horario programado.
      </Paragraph>
    </EmailLayout>
  );
}

export default TurnoConfirmadoConCambioEmail;
