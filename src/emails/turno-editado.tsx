import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  CtaButton,
  Paragraph,
} from "./layout";

interface TurnoEditadoEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaHora: string;
  quirofano: { id: string; nombre: string } | null;
  duracion: string;
  cambios: string[];
  turnoUrl: string;
}

export function TurnoEditadoEmail(props: TurnoEditadoEmailProps) {
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
      preview={`Tu cirugía para ${fechaFmt} fue modificada`}
      title="Tu cirugía fue modificada"
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Te informamos que los datos de tu cirugía fueron actualizados por la
        encargada o administración. A continuación los cambios realizados:
      </Paragraph>
      <DetailCard>
        {props.cambios.length === 0 ? (
          <DetailRow label="Actualización" value="Datos actualizados" />
        ) : (
          props.cambios.map((c, i) => <DetailRow key={i} label={`Cambio ${i + 1}`} value={c} />)
        )}
      </DetailCard>
      <Paragraph>
        Estos son los datos actuales de tu turno:
      </Paragraph>
      <DetailCard>
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow label="Fecha y hora" value={fechaFmt} />
        <DetailRow label="Quirófano" value={props.quirofano?.nombre ?? "—"} />
        <DetailRow label="Duración" value={props.duracion} />
      </DetailCard>
      <CtaButton href={props.turnoUrl} label="Ver turno actualizado" />
    </EmailLayout>
  );
}

export default TurnoEditadoEmail;
