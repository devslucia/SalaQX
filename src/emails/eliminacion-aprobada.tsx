import * as React from "react";
import {
  EmailLayout,
  Greeting,
  DetailCard,
  DetailRow,
  Paragraph,
} from "./layout";
import { formatFechaArg } from "@/lib/dates";

interface EliminacionAprobadaEmailProps {
  destinatarioNombre: string;
  paciente: { paciente_nombre: string; paciente_dni: string };
  tipoCirugia: string;
  fechaHora: string;
  sanatorio: { nombre: string; logo_url: string | null };
}

export function EliminacionAprobadaEmail(props: EliminacionAprobadaEmailProps) {
  return (
    <EmailLayout
      preview={`Tu solicitud de eliminación fue aprobada`}
      title="Eliminación aprobada"
      sanatorioNombre={props.sanatorio.nombre}
      sanatorioLogoUrl={props.sanatorio.logo_url}
    >
      <Greeting name={props.destinatarioNombre} />
      <Paragraph>
        Te informamos que tu solicitud de eliminación fue{" "}
        <strong style={{ color: "#16A085" }}>aprobada</strong>. El turno fue
        eliminado del sistema.
      </Paragraph>
      <DetailCard>
        <DetailRow label="Paciente" value={props.paciente.paciente_nombre} />
        <DetailRow label="DNI" value={props.paciente.paciente_dni} />
        <DetailRow label="Tipo de cirugía" value={props.tipoCirugia} />
        <DetailRow label="Fecha original" value={formatFechaArg(props.fechaHora)} />
      </DetailCard>
      <Paragraph>
        No tenés que hacer nada más. Si necesitás reprogramar la cirugía, podés
        solicitar un nuevo turno desde el sistema.
      </Paragraph>
    </EmailLayout>
  );
}

export default EliminacionAprobadaEmail;
