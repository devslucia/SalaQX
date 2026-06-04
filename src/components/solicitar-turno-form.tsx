"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import {
  User, Stethoscope, Clock, AlertTriangle, Info, ArrowRight, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DIAS_SEMANA,
  type DiaSemana,
  type ObraSocial,
  type TipoAnestesia,
  type HorarioHabilitado,
  type ConfigUTI,
  type Quirofano,
  type TurnoOcupado,
  type User as AuthUser,
} from "@/lib/types";
import { format, getDay, parseISO, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { notify } from "@/lib/notify-client";

interface SolicitarTurnoFormProps {
  user: AuthUser;
  initialDate?: string;
  initialTime?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SolicitarTurnoForm({
  user,
  initialDate,
  initialTime,
  onSuccess,
  onCancel,
}: SolicitarTurnoFormProps) {
  const supabase = createClient();

  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [tiposAnestesia, setTiposAnestesia] = useState<TipoAnestesia[]>([]);
  const [horarios, setHorarios] = useState<HorarioHabilitado[]>([]);
  const [configUTI, setConfigUTI] = useState<ConfigUTI | null>(null);
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [turnosDelDia, setTurnosDelDia] = useState<TurnoOcupado[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotInvalidoPorDuracion, setSlotInvalidoPorDuracion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    paciente_nombre: "",
    paciente_dni: "",
    paciente_edad: "",
    obra_social_id: "",
    tipo_cirugia: "",
    tipo_anestesia_id: "",
    medico_telefono: user.telefono || "",
    usa_idi: false,
    pasa_uti: false,
    duracion_horas: "1",
    duracion_minutos: "0",
    fecha: initialDate || "",
    hora: initialTime || "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const [os, ta, h, uti, q] = await Promise.all([
        supabase.from("obras_sociales").select("*").eq("activo", true).order("nombre"),
        supabase.from("tipos_anestesia").select("*").eq("activo", true).order("nombre"),
        supabase.from("horarios_habilitados").select("*"),
        supabase.from("config_uti").select("*").order("updated_at", { ascending: false }).limit(1).single(),
        supabase.from("quirofanos").select("*").eq("activo", true).order("nombre"),
      ]);
      if (os.data) setObrasSociales(os.data);
      if (ta.data) setTiposAnestesia(ta.data);
      if (h.data) setHorarios(h.data);
      if (uti.data) setConfigUTI(uti.data);
      if (q.data) setQuirofanos(q.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const slotsOcupadosPorQuirofano = (
    turnos: TurnoOcupado[],
    quirofanoId: string,
  ): { inicio: Date; fin: Date }[] =>
    turnos
      .filter((t) => t.quirofano_id === quirofanoId)
      .map((t) => ({
        inicio: new Date(t.fecha_hora),
        fin: new Date(new Date(t.fecha_hora).getTime() + t.duracion_minutos * 60_000),
      }));

  const overlaps = (
    aInicio: Date,
    aFin: Date,
    bInicio: Date,
    bFin: Date,
  ): boolean => aInicio < bFin && aFin > bInicio;

  type SlotInfo = {
    hora: string;
    inicio: Date;
    fin: Date;
    disponible: boolean;
    quirofanosLibres: number;
    quirofanosTotales: number;
  };

  const getSlots = (dateStr: string, duracionMin: number): SlotInfo[] => {
    if (!dateStr || duracionMin <= 0) return [];
    const date = parseISO(dateStr);
    const dayOfWeek = getDay(date) as DiaSemana;

    const applicableHorarios = horarios.filter((h) => h.dia === dayOfWeek);
    if (applicableHorarios.length === 0) return [];

    const quirofanosActivosIds = new Set(quirofanos.map((q) => q.id));
    const quirofanosConHorarioEseDia = new Map<string, HorarioHabilitado>();
    for (const h of applicableHorarios) {
      if (
        quirofanosActivosIds.has(h.quirofano_id) &&
        !quirofanosConHorarioEseDia.has(h.quirofano_id)
      ) {
        quirofanosConHorarioEseDia.set(h.quirofano_id, h);
      }
    }
    const quirofanosTotales = quirofanosConHorarioEseDia.size;
    if (quirofanosTotales === 0) return [];

    const slotsMap = new Map<string, SlotInfo>();
    for (const h of quirofanosConHorarioEseDia.values()) {
      const [startH, startM] = h.hora_inicio.split(":").map(Number);
      const [endH, endM] = h.hora_fin.split(":").map(Number);
      let current = startH * 60 + startM;
      const end = endH * 60 + endM;
      while (current + duracionMin <= end) {
        const hh = String(Math.floor(current / 60)).padStart(2, "0");
        const mm = String(current % 60).padStart(2, "0");
        const hora = `${hh}:${mm}`;
        if (!slotsMap.has(hora)) {
          const slotInicio = new Date(date);
          slotInicio.setHours(Math.floor(current / 60), current % 60, 0, 0);
          const slotFin = new Date(slotInicio.getTime() + duracionMin * 60_000);
          slotsMap.set(hora, {
            hora,
            inicio: slotInicio,
            fin: slotFin,
            disponible: false,
            quirofanosLibres: 0,
            quirofanosTotales,
          });
        }
        current += 30;
      }
    }

    for (const slot of slotsMap.values()) {
      const libres = Array.from(quirofanosConHorarioEseDia.keys()).filter(
        (qId) =>
          !slotsOcupadosPorQuirofano(turnosDelDia, qId).some((b) =>
            overlaps(slot.inicio, slot.fin, b.inicio, b.fin),
          ),
      ).length;
      slot.quirofanosLibres = libres;
      slot.disponible = libres > 0;
    }

    return Array.from(slotsMap.values()).sort((a, b) =>
      a.hora.localeCompare(b.hora),
    );
  };

  useEffect(() => {
    if (!form.fecha) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTurnosDelDia([]);
      return;
    }
    let cancelled = false;
    const fetchTurnosDelDia = async () => {
       
      setSlotsLoading(true);
      const inicio = new Date(`${form.fecha}T00:00:00`);
      const fin = new Date(`${form.fecha}T23:59:59`);
      const { data, error: qErr } = await supabase
        .from("turnos")
        .select("id, fecha_hora, duracion_minutos, quirofano_id, estado")
        .in("estado", ["confirmada", "pendiente", "solicitud_reprogramacion"])
        .gte("fecha_hora", inicio.toISOString())
        .lte("fecha_hora", fin.toISOString());
      if (cancelled) return;
      if (qErr) {
        console.error("[SolicitarTurnoForm] turnos del día error:", qErr);
         
        setTurnosDelDia([]);
      } else {
         
        setTurnosDelDia((data ?? []) as TurnoOcupado[]);
      }
       
      setSlotsLoading(false);
    };
    fetchTurnosDelDia();
    return () => {
      cancelled = true;
    };
  }, [form.fecha, supabase]);

  useEffect(() => {
    if (user?.telefono && !form.medico_telefono) {
      setForm((f) => ({ ...f, medico_telefono: user.telefono || "" }));
    }
  }, [user]);

  useEffect(() => {
    if (!form.fecha || !form.hora) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlotInvalidoPorDuracion(false);
      return;
    }
    const duracionMin = parseInt(form.duracion_horas) * 60 + parseInt(form.duracion_minutos);
    if (duracionMin <= 0) {
      setForm((f) => (f.hora ? { ...f, hora: "" } : f));
       
      setSlotInvalidoPorDuracion(false);
      return;
    }
    const slots = getSlots(form.fecha, duracionMin);
    const slot = slots.find((s) => s.hora === form.hora);
    if (!slot || !slot.disponible) {
      setForm((f) => (f.hora ? { ...f, hora: "" } : f));
       
      setSlotInvalidoPorDuracion(true);
    } else {
       
      setSlotInvalidoPorDuracion(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.duracion_horas, form.duracion_minutos, form.fecha, turnosDelDia, quirofanos]);

  const isUTIDayAllowed = (dateStr: string): boolean => {
    if (!form.pasa_uti || !configUTI) return true;
    const date = parseISO(dateStr);
    const dayOfWeek = getDay(date) as DiaSemana;
    return (configUTI.dias_permitidos as DiaSemana[]).includes(dayOfWeek);
  };

  const diasHabilitados: DiaSemana[] = Array.from(
    new Set(horarios.map((h) => h.dia)),
  );
  const diasUTIPermitidos: DiaSemana[] =
    (configUTI?.dias_permitidos as DiaSemana[] | undefined) ?? [];

  type DayDisabledReason = "pasado" | "no-habilitado" | "uti";

  const getDayDisabledReason = (date: Date): DayDisabledReason | null => {
    const start = startOfDay(new Date());
    if (isBefore(startOfDay(date), start)) return "pasado";
    const dia = getDay(date) as DiaSemana;
    if (!diasHabilitados.includes(dia)) return "no-habilitado";
    if (form.pasa_uti && !diasUTIPermitidos.includes(dia)) return "uti";
    return null;
  };

  const isDayDisabled = (date: Date): boolean =>
    getDayDisabledReason(date) !== null;

  const getDayTooltip = (date: Date): string | undefined => {
    const reason = getDayDisabledReason(date);
    if (reason === "pasado") return "No se pueden agendar turnos en días pasados";
    if (reason === "no-habilitado")
      return "No hay turnos disponibles este día";
    if (reason === "uti")
      return "Pacientes con UTI solo pueden agendarse los días habilitados para UTI";
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.paciente_nombre || !form.paciente_dni || !form.paciente_edad || !form.obra_social_id || !form.tipo_cirugia || !form.tipo_anestesia_id || !form.fecha || !form.hora) {
      setError("Todos los campos obligatorios deben estar completos");
      return;
    }

    if (form.pasa_uti && !isUTIDayAllowed(form.fecha)) {
      setError("Los pacientes que van a UTI solo pueden operarse en los días configurados");
      return;
    }

    const duracionTotal = parseInt(form.duracion_horas) * 60 + parseInt(form.duracion_minutos);
    if (duracionTotal <= 0) {
      setError("La duración debe ser mayor a 0");
      return;
    }

    const fechaHora = new Date(`${form.fecha}T${form.hora}:00`);
    if (isBefore(fechaHora, startOfDay(new Date()))) {
      setError("No se pueden solicitar turnos en el pasado");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/turnos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente_nombre: form.paciente_nombre,
          paciente_dni: form.paciente_dni,
          paciente_edad: parseInt(form.paciente_edad),
          obra_social_id: form.obra_social_id,
          tipo_cirugia: form.tipo_cirugia,
          tipo_anestesia_id: form.tipo_anestesia_id,
          medico_telefono: form.medico_telefono || null,
          usa_idi: form.usa_idi,
          pasa_uti: form.pasa_uti,
          duracion_minutos: duracionTotal,
          fecha_hora: fechaHora.toISOString(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        const msg = data.error || `Error ${res.status}`;
        console.error("[SolicitarTurnoForm] api error:", msg);
        setError(msg);
        toast.error("Error al solicitar el turno", { description: msg });
        return;
      }

      console.log("[SolicitarTurnoForm] turno creado:", data.id);
      toast.success("¡Turno solicitado!", {
        description: "Recibirás una notificación cuando sea revisado",
      });
      if (data.id) {
        void notify("nueva-solicitud", { turno_id: data.id });
      }
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[SolicitarTurnoForm] unexpected throw:", err);
      setError(message);
      toast.error("Error inesperado", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="spinner mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  const duracionTotal = parseInt(form.duracion_horas) * 60 + parseInt(form.duracion_minutos);
  const slotsDelDia = form.fecha && duracionTotal > 0 ? getSlots(form.fecha, duracionTotal) : [];
  const fechaInvalida = form.fecha && !isUTIDayAllowed(form.fecha) && form.pasa_uti;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Datos del paciente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User size={16} />
            </div>
            Datos del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paciente_nombre">Nombre completo *</Label>
              <Input
                id="paciente_nombre"
                value={form.paciente_nombre}
                onChange={(e) => setForm({ ...form, paciente_nombre: e.target.value })}
                required
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paciente_dni">DNI *</Label>
              <Input
                id="paciente_dni"
                value={form.paciente_dni}
                onChange={(e) => setForm({ ...form, paciente_dni: e.target.value })}
                required
                placeholder="12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paciente_edad">Edad *</Label>
              <Input
                id="paciente_edad"
                type="number"
                min="0"
                max="150"
                value={form.paciente_edad}
                onChange={(e) => setForm({ ...form, paciente_edad: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra_social">Obra Social *</Label>
              <Select
                id="obra_social"
                value={form.obra_social_id}
                onChange={(e) => setForm({ ...form, obra_social_id: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {obrasSociales.map((os) => (
                  <option key={os.id} value={os.id}>{os.nombre}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos de la cirugía */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
              <Stethoscope size={16} />
            </div>
            Datos de la Cirugía
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_cirugia">Tipo de Cirugía *</Label>
              <Input
                id="tipo_cirugia"
                value={form.tipo_cirugia}
                onChange={(e) => setForm({ ...form, tipo_cirugia: e.target.value })}
                placeholder="Ej: Apendicectomía"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_anestesia">Tipo de Anestesia *</Label>
              <Select
                id="tipo_anestesia"
                value={form.tipo_anestesia_id}
                onChange={(e) => setForm({ ...form, tipo_anestesia_id: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {tiposAnestesia.map((ta) => (
                  <option key={ta.id} value={ta.id}>{ta.nombre}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Médico a Cargo</Label>
              <Input value={user.nombre} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medico_telefono">Teléfono de Contacto</Label>
              <Input
                id="medico_telefono"
                value={form.medico_telefono}
                onChange={(e) => setForm({ ...form, medico_telefono: e.target.value })}
                placeholder="11-1234-5678"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label
              htmlFor="usa_idi"
              className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id="usa_idi"
                checked={form.usa_idi}
                onCheckedChange={(checked) => setForm({ ...form, usa_idi: checked })}
              />
              <div>
                <p className="text-sm font-medium">¿Usa IDI?</p>
                <p className="text-xs text-muted-foreground">Implante de dispositivo intraoperatorio</p>
              </div>
            </label>
            <label
              htmlFor="pasa_uti"
              className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id="pasa_uti"
                checked={form.pasa_uti}
                onCheckedChange={(checked) => setForm({ ...form, pasa_uti: checked })}
              />
              <div>
                <p className="text-sm font-medium">¿Pasa a UTI?</p>
                <p className="text-xs text-muted-foreground">Unidad de Terapia Intensiva</p>
              </div>
            </label>
          </div>

          {form.pasa_uti && configUTI && (
            <Alert variant="warning">
              <Info size={16} />
              <AlertDescription>
                Las cirugías con UTI solo pueden programarse los:{" "}
                <strong>
                  {(configUTI.dias_permitidos as DiaSemana[])
                    .map((d) => DIAS_SEMANA[d])
                    .join(", ")}
                </strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duración (Horas)</Label>
              <Select
                value={form.duracion_horas}
                onChange={(e) => setForm({ ...form, duracion_horas: e.target.value })}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duración (Minutos)</Label>
              <Select
                value={form.duracion_minutos}
                onChange={(e) => setForm({ ...form, duracion_minutos: e.target.value })}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{m}min</option>
                ))}
              </Select>
            </div>
          </div>
          {duracionTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              Duración total: <strong>{duracionTotal} minutos</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fecha y hora */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Clock size={16} />
            </div>
            Fecha y Hora
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <div className="rounded-lg border border-input bg-background p-1 dark:bg-[#0D1117]">
                <Calendar
                  mode="single"
                  selected={form.fecha ? parseISO(form.fecha) : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    setForm({
                      ...form,
                      fecha: format(d, "yyyy-MM-dd"),
                      hora: "",
                    });
                  }}
                  disabled={isDayDisabled}
                  startMonth={new Date()}
                  components={{
                    DayButton: ({ day, ...buttonProps }) => {
                      const tooltip = getDayTooltip(day.date);
                      return (
                        <button
                          type="button"
                          {...buttonProps}
                          title={tooltip ?? buttonProps.title}
                          aria-label={tooltip ?? buttonProps["aria-label"]}
                        />
                      );
                    },
                  }}
                />
              </div>
              {form.fecha && (
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(form.fecha), "EEEE d 'de' MMMM", { locale: es })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora *</Label>
              {!form.fecha ? (
                <p className="text-xs text-muted-foreground">
                  Elegí primero una fecha para ver los horarios disponibles.
                </p>
              ) : duracionTotal <= 0 ? (
                <Alert variant="warning">
                  <Info size={16} />
                  <AlertDescription>
                    Ingresá primero la duración estimada para ver los horarios disponibles.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="spinner h-3 w-3" />
                      Cargando horarios…
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {slotsDelDia.filter((s) => s.disponible).length} libres de {slotsDelDia.length} slots
                        {quirofanos.length > 0 && (
                          <> · {quirofanos.length} quirófano{quirofanos.length === 1 ? "" : "s"}</>
                        )}
                      </p>
                      {slotsDelDia.length === 0 ? (
                        <Alert variant="destructive">
                          <AlertTriangle size={16} />
                          <AlertDescription>
                            No hay horarios disponibles para esta fecha y duración.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                          {slotsDelDia.map((s) => {
                            const seleccionado = form.hora === s.hora;
                            return (
                              <button
                                key={s.hora}
                                type="button"
                                disabled={!s.disponible}
                                onClick={() => setForm({ ...form, hora: s.hora })}
                                title={
                                  !s.disponible
                                    ? "No hay quirófanos disponibles en este horario"
                                    : undefined
                                }
                                className={cn(
                                  "inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-sm font-medium transition-colors",
                                  seleccionado
                                    ? "bg-[#1B4F72] dark:bg-[#2E86C1] text-white border-[#1B4F72] dark:border-[#2E86C1] hover:bg-[#154360] dark:hover:bg-[#1B4F72]"
                                    : s.disponible
                                      ? "border-input bg-background hover:bg-[#1B4F72] hover:text-white hover:border-[#1B4F72] dark:hover:bg-[#2E86C1] dark:hover:border-[#2E86C1] cursor-pointer"
                                      : "opacity-30 cursor-not-allowed text-[#8B949E] border-input bg-background line-through",
                                )}
                              >
                                {!s.disponible && <Lock size={12} aria-hidden />}
                                {s.hora}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {fechaInvalida && (
            <Alert variant="destructive">
              <AlertTriangle size={16} />
              <AlertDescription>
                Esta fecha no está habilitada para pacientes que van a UTI. Elegí un día permitido.
              </AlertDescription>
            </Alert>
          )}
          {slotInvalidoPorDuracion && (
            <Alert variant="warning">
              <Info size={16} />
              <AlertDescription>
                El horario seleccionado ya no está disponible para esa duración, elegí otro.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="lg" disabled={submitting || Boolean(fechaInvalida)}>
          {submitting ? "Enviando..." : "Solicitar Turno"}
          <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
