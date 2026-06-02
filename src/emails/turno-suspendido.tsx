import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  Paragraph,
} from "./layout";

interface TurnoSuspendidoEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaHora: string;
}

export function TurnoSuspendidoEmail(props: TurnoSuspendidoEmailProps) {
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
      preview={`Cirugía suspendida para ${fechaFmt}`}
      title="Cirugía suspendida"
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Te informamos que tu cirugía programada fue{" "}
        <strong style={{ color: "#C0392B" }}>suspendida</strong>. A continuación los
        detalles de la cirugía afectada:
      </Paragraph>
      <DetailCard>
        <DetailRow label="Fecha y hora" value={fechaFmt} />
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
      </DetailCard>
      <Paragraph>
        Si tenés alguna duda, por favor contactate con la encargada de quirófano
        para reprogramar la cirugía.
      </Paragraph>
    </EmailLayout>
  );
}

export default TurnoSuspendidoEmail;
