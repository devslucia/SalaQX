import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateTurnoPayload {
  paciente_nombre: string;
  paciente_dni: string;
  paciente_edad: number;
  obra_social_id: string;
  tipo_cirugia: string;
  tipo_anestesia_id: string;
  medico_telefono?: string | null;
  usa_idi: boolean;
  pasa_uti: boolean;
  duracion_minutos: number;
  fecha_hora: string;
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

    const body = (await request.json()) as Partial<CreateTurnoPayload>;

    const requiredFields: (keyof CreateTurnoPayload)[] = [
      "paciente_nombre",
      "paciente_dni",
      "paciente_edad",
      "obra_social_id",
      "tipo_cirugia",
      "tipo_anestesia_id",
      "duracion_minutos",
      "fecha_hora",
    ];

    for (const f of requiredFields) {
      const v = body[f];
      if (v === undefined || v === null || v === "") {
        return NextResponse.json(
          { error: `Falta el campo obligatorio: ${f}` },
          { status: 400 },
        );
      }
    }

    const payload: CreateTurnoPayload = {
      paciente_nombre: String(body.paciente_nombre),
      paciente_dni: String(body.paciente_dni),
      paciente_edad: Number(body.paciente_edad),
      obra_social_id: String(body.obra_social_id),
      tipo_cirugia: String(body.tipo_cirugia),
      tipo_anestesia_id: String(body.tipo_anestesia_id),
      medico_telefono: body.medico_telefono ?? null,
      usa_idi: Boolean(body.usa_idi),
      pasa_uti: Boolean(body.pasa_uti),
      duracion_minutos: Number(body.duracion_minutos),
      fecha_hora: String(body.fecha_hora),
    };

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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (fechaHora.getTime() < startOfToday.getTime()) {
      return NextResponse.json(
        { error: "No se pueden solicitar turnos en el pasado" },
        { status: 400 },
      );
    }

    const diaSemana = fechaHora.getDay();

    const { data: horarios, error: horariosError } = await supabase
      .from("horarios_habilitados")
      .select("dia")
      .eq("dia", diaSemana)
      .limit(1);

    if (horariosError) {
      console.error("[POST /api/turnos/create] horarios error:", horariosError);
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

    if (payload.pasa_uti) {
      const { data: configUti, error: utiError } = await supabase
        .from("config_uti")
        .select("dias_permitidos")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (utiError && utiError.code !== "PGRST116") {
        console.error("[POST /api/turnos/create] uti error:", utiError);
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

    const nuevoInicio = fechaHora;
    const nuevoFin = new Date(nuevoInicio.getTime() + payload.duracion_minutos * 60_000);
    const diaInicio = new Date(nuevoInicio);
    diaInicio.setHours(0, 0, 0, 0);
    const diaFin = new Date(nuevoInicio);
    diaFin.setHours(23, 59, 59, 999);

    const { data: quirofanosActivos, error: quirofanosError } = await supabase
      .from("quirofanos")
      .select("id")
      .eq("activo", true);

    if (quirofanosError) {
      console.error("[POST /api/turnos/create] quirofanos error:", quirofanosError);
      return NextResponse.json(
        { error: "No se pudieron cargar los quirófanos" },
        { status: 500 },
      );
    }

    if (quirofanosActivos && quirofanosActivos.length > 0) {
      const { data: turnosDelDia, error: turnosDelDiaError } = await supabase
        .from("turnos")
        .select("id, fecha_hora, duracion_minutos, quirofano_id, estado")
        .in("estado", ["confirmada", "pendiente", "solicitud_reprogramacion"])
        .gte("fecha_hora", diaInicio.toISOString())
        .lte("fecha_hora", diaFin.toISOString());

      if (turnosDelDiaError) {
        console.error(
          "[POST /api/turnos/create] turnos del día error:",
          turnosDelDiaError,
        );
        return NextResponse.json(
          { error: "No se pudieron validar los turnos del día" },
          { status: 500 },
        );
      }

      const hayConflicto = (quirofanoId: string): boolean => {
        if (!turnosDelDia) return false;
        return turnosDelDia
          .filter((t) => t.quirofano_id === quirofanoId)
          .some((t) => {
            const tInicio = new Date(t.fecha_hora);
            const tFin = new Date(tInicio.getTime() + t.duracion_minutos * 60_000);
            return nuevoInicio < tFin && nuevoFin > tInicio;
          });
      };

      const quirofanosLibres = quirofanosActivos.filter(
        (q) => !hayConflicto(q.id),
      );

      if (quirofanosLibres.length === 0) {
        return NextResponse.json(
          { error: "El horario seleccionado ya fue tomado. Elegí otro." },
          { status: 400 },
        );
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("turnos")
      .insert({
        medico_id: user.id,
        paciente_nombre: payload.paciente_nombre,
        paciente_dni: payload.paciente_dni,
        paciente_edad: payload.paciente_edad,
        obra_social_id: payload.obra_social_id,
        tipo_cirugia: payload.tipo_cirugia,
        tipo_anestesia_id: payload.tipo_anestesia_id,
        medico_telefono: payload.medico_telefono,
        usa_idi: payload.usa_idi,
        pasa_uti: payload.pasa_uti,
        duracion_minutos: payload.duracion_minutos,
        fecha_hora: fechaHora.toISOString(),
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[POST /api/turnos/create] insert error:", insertError);
      const msg = insertError.message.includes("validate_turno_day")
        ? "El día seleccionado no está habilitado para cirugías"
        : insertError.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (error) {
    console.error("[POST /api/turnos/create] unexpected error:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
