import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { actionRatelimit, applyRateLimit } from "@/lib/ratelimit";
import { detectarConflictos } from "@/lib/turnos-conflict";
import { sendTurnoConfirmadoExterno } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface CreateManualTurnoPayload {
  // Datos del paciente
  paciente_nombre: string;
  paciente_dni: string;
  paciente_edad: number;
  obra_social_id: string;
  tipo_cirugia: string;
  tipo_anestesia_id: string;
  usa_idi: boolean;
  pasa_uti: boolean;
  duracion_minutos: number;
  fecha_hora: string;

  // Datos del médico externo
  medico_nombre: string;
  medico_email: string;
  medico_celular: string;

  // Quirófano
  quirofano_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar que sea admin o encargada
    const { data: userProfile } = await supabase
      .from("users")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (!userProfile || !["admin", "encargada"].includes(userProfile.rol)) {
      return NextResponse.json(
        { error: "Solo admin o encargada pueden cargar turnos manualmente" },
        { status: 403 },
      );
    }

    const limited = await applyRateLimit(actionRatelimit, `action:user:${user.id}`);
    if (!limited.ok) return limited.response;

    const body = (await request.json()) as Partial<CreateManualTurnoPayload>;

    // Validar campos obligatorios del paciente
    const requiredPatientFields: (keyof CreateManualTurnoPayload)[] = [
      "paciente_nombre",
      "paciente_dni",
      "paciente_edad",
      "obra_social_id",
      "tipo_cirugia",
      "tipo_anestesia_id",
      "duracion_minutos",
      "fecha_hora",
    ];

    for (const f of requiredPatientFields) {
      const v = body[f];
      if (v === undefined || v === null || v === "") {
        return NextResponse.json(
          { error: `Falta el campo obligatorio: ${f}` },
          { status: 400 },
        );
      }
    }

    // Validar campos del médico externo
    if (!body.medico_nombre || body.medico_nombre.trim() === "") {
      return NextResponse.json(
        { error: "Falta el nombre del médico responsable" },
        { status: 400 },
      );
    }

    if (!body.medico_email || body.medico_email.trim() === "") {
      return NextResponse.json(
        { error: "Falta el email del médico responsable" },
        { status: 400 },
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.medico_email.trim())) {
      return NextResponse.json(
        { error: "El email del médico no tiene un formato válido" },
        { status: 400 },
      );
    }

    if (!body.medico_celular || body.medico_celular.trim() === "") {
      return NextResponse.json(
        { error: "Falta el celular del médico responsable" },
        { status: 400 },
      );
    }

    // Validar quirófano
    if (!body.quirofano_id || body.quirofano_id.trim() === "") {
      return NextResponse.json(
        { error: "Debe seleccionar un quirófano" },
        { status: 400 },
      );
    }

    const payload: CreateManualTurnoPayload = {
      paciente_nombre: String(body.paciente_nombre),
      paciente_dni: String(body.paciente_dni),
      paciente_edad: Number(body.paciente_edad),
      obra_social_id: String(body.obra_social_id),
      tipo_cirugia: String(body.tipo_cirugia),
      tipo_anestesia_id: String(body.tipo_anestesia_id),
      usa_idi: Boolean(body.usa_idi),
      pasa_uti: Boolean(body.pasa_uti),
      duracion_minutos: Number(body.duracion_minutos),
      fecha_hora: String(body.fecha_hora),
      medico_nombre: body.medico_nombre.trim(),
      medico_email: body.medico_email.trim().toLowerCase(),
      medico_celular: body.medico_celular.trim(),
      quirofano_id: body.quirofano_id.trim(),
    };

    // Validaciones numéricas
    if (Number.isNaN(payload.paciente_edad) || payload.paciente_edad < 0 || payload.paciente_edad > 150) {
      return NextResponse.json(
        { error: "Edad del paciente inválida" },
        { status: 400 },
      );
    }

    if (Number.isNaN(payload.duracion_minutos) || payload.duracion_minutos <= 0) {
      return NextResponse.json(
        { error: "La duración debe ser mayor a 0" },
        { status: 400 },
      );
    }

    const fechaHora = new Date(payload.fecha_hora);
    if (Number.isNaN(fechaHora.getTime())) {
      return NextResponse.json(
        { error: "Fecha y hora inválidas" },
        { status: 400 },
      );
    }

    // No permitir turnos en el pasado
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (fechaHora.getTime() < startOfToday.getTime()) {
      return NextResponse.json(
        { error: "No se pueden cargar turnos en el pasado" },
        { status: 400 },
      );
    }

    // Validar día habilitado
    const diaSemana = fechaHora.getDay();

    const { data: horarios, error: horariosError } = await supabase
      .from("horarios_habilitados")
      .select("dia")
      .eq("dia", diaSemana)
      .limit(1);

    if (horariosError) {
      console.error("[POST /api/turnos/create-manual] horarios error:", horariosError);
      return NextResponse.json(
        { error: "No se pudieron validar los horarios habilitados" },
        { status: 500 },
      );
    }

    if (!horarios || horarios.length === 0) {
      return NextResponse.json(
        { error: "El día seleccionado no está habilitado para cirugías" },
        { status: 400 },
      );
    }

    // Validar restricción UTI
    if (payload.pasa_uti) {
      const { data: configUti, error: utiError } = await supabase
        .from("config_uti")
        .select("dias_permitidos")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (utiError && utiError.code !== "PGRST116") {
        console.error("[POST /api/turnos/create-manual] uti error:", utiError);
        return NextResponse.json(
          { error: "No se pudo validar la configuración de UTI" },
          { status: 500 },
        );
      }

      const diasPermitidos = (configUti?.dias_permitidos ?? []) as number[];
      if (!diasPermitidos.includes(diaSemana)) {
        return NextResponse.json(
          {
            error:
              "Los pacientes que van a UTI solo pueden operarse en los días configurados",
          },
          { status: 400 },
        );
      }
    }

    // Verificar que el quirófano esté activo
    const { data: quirofano, error: quirofanoError } = await supabase
      .from("quirofanos")
      .select("id, activo")
      .eq("id", payload.quirofano_id)
      .single();

    if (quirofanoError || !quirofano) {
      return NextResponse.json(
        { error: "El quirófano seleccionado no existe" },
        { status: 400 },
      );
    }

    if (!quirofano.activo) {
      return NextResponse.json(
        { error: "El quirófano seleccionado no está activo" },
        { status: 400 },
      );
    }

    // Verificar que el quirófano tenga horario habilitado ese día
    const { data: horarioQuirofano } = await supabase
      .from("horarios_habilitados")
      .select("id")
      .eq("quirofano_id", payload.quirofano_id)
      .eq("dia", diaSemana)
      .limit(1);

    if (!horarioQuirofano || horarioQuirofano.length === 0) {
      return NextResponse.json(
        { error: "El quirófano seleccionado no tiene horario habilitado para ese día" },
        { status: 400 },
      );
    }

    // Detectar conflictos en el quirófano seleccionado
    const adminClient = getAdminClient();
    const conflictos = await detectarConflictos(
      adminClient,
      payload.quirofano_id,
      fechaHora,
      payload.duracion_minutos,
    );

    if (conflictos.length > 0) {
      const conflicto = conflictos[0];
      return NextResponse.json(
        {
          error: "Este quirófano ya tiene una cirugía en ese horario",
          conflicto: {
            id: conflicto.id,
            paciente_nombre: conflicto.paciente_nombre,
            fecha_hora: conflicto.fecha_hora,
            duracion_minutos: conflicto.duracion_minutos,
          },
        },
        { status: 409 },
      );
    }

    // Obtener nombre del usuario que carga para el registro
    const { data: userFull } = await supabase
      .from("users")
      .select("nombre")
      .eq("id", user.id)
      .single();

    // Insertar turno directamente como confirmado
    const { data: inserted, error: insertError } = await adminClient
      .from("turnos")
      .insert({
        medico_id: null,
        quirofano_id: payload.quirofano_id,
        paciente_nombre: payload.paciente_nombre,
        paciente_dni: payload.paciente_dni,
        paciente_edad: payload.paciente_edad,
        obra_social_id: payload.obra_social_id,
        tipo_cirugia: payload.tipo_cirugia,
        tipo_anestesia_id: payload.tipo_anestesia_id,
        medico_nombre: payload.medico_nombre,
        medico_email: payload.medico_email,
        medico_celular: payload.medico_celular,
        usa_idi: payload.usa_idi,
        pasa_uti: payload.pasa_uti,
        duracion_minutos: payload.duracion_minutos,
        fecha_hora: fechaHora.toISOString(),
        estado: "confirmada",
        cargado_por_rol: userProfile.rol,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[POST /api/turnos/create-manual] insert error:", insertError);
      const msg = insertError.message.includes("validate_turno_day")
        ? "El día seleccionado no está habilitado para cirugías"
        : insertError.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Enviar email de confirmación al médico externo (fire and forget)
    sendTurnoConfirmadoExterno(inserted.id, {
      medico_nombre: payload.medico_nombre,
      medico_email: payload.medico_email,
      cargado_por_nombre: userFull?.nombre ?? "Encargada",
    }).catch((err) => {
      console.error("[POST /api/turnos/create-manual] email error:", err);
    });

    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (error) {
    console.error("[POST /api/turnos/create-manual] unexpected error:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
