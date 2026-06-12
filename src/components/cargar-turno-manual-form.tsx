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
  User, Stethoscope, Clock, AlertTriangle, Info, Building2,
  Phone, Mail, CheckCircle2, XCircle,
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
} from "@/lib/types";
import { format, getDay, parseISO, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";

interface CargarTurnoManualFormProps {
  initialDate?: string;
  initialTime?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CargarTurnoManualForm({
  initialDate,
  initialTime,
  onSuccess,
  onCancel,
}: CargarTurnoManualFormProps) {
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

  // Disponibilidad por quirófano para el slot seleccionado
  const [disponibilidadQuirofano, setDisponibilidadQuirofano] = useState<
    Map<string, boolean>
  >(new Map());

  const [form, setForm] = useState({
    paciente_nombre: "",
    paciente_dni: "",
    paciente_edad: "",
    obra_social_id: "",
    tipo_cirugia: "",
    tipo_anestesia_id: "",
    usa_idi: false,
    pasa_uti: false,
    duracion_horas: "1",
    duracion_minutos: "0",
    fecha: initialDate || "",
    hora: initialTime || "",
    // Médico externo
    medico_nombre: "",
    medico_email: "",
    medico_celular: "",
    // Quirófano
    quirofano_id: "",
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

  // Calcular disponibilidad por quirófano cuando cambia fecha/hora/duración
  useEffect(() => {
    if (!form.fecha || !form.hora) {
      setDisponibilidadQuirofano(new Map());
      return;
    }

    const duracionMin = parseInt(form.duracion_horas) * 60 + parseInt(form.duracion_minutos);
    if (duracionMin <= 0) {
      setDisponibilidadQuirofano(new Map());
      return;
    }

    const date = parseISO(form.fecha);
    const dayOfWeek = getDay(date) as DiaSemana;
    const applicableHorarios = horarios.filter((h) => h.dia === dayOfWeek);

    const [startH, startM] = form.hora.split(":").map(Number);
    const slotInicio = new Date(date);
    slotInicio.setHours(startH, startM, 0, 0);
    const slotFin = new Date(slotInicio.getTime() + duracionMin * 60_000);

    const newDisponibilidad = new Map<string, boolean>();
    for (const h of applicableHorarios) {
      if (!quirofanos.some((q) => q.id === h.quirofano_id)) continue;
      const ocupado = slotsOcupadosPorQuirofano(turnosDelDia, h.quirofano_id).some((b) =>
        overlaps(slotInicio, slotFin, b.inicio, b.fin)
      );
      newDisponibilidad.set(h.quirofano_id, !ocupado);
    }
    setDisponibilidadQuirofano(newDisponibilidad);
  }, [form.fecha, form.hora, form.duracion_horas, form.duracion_minutos, turnosDelDia, horarios, quirofanos]);

  useEffect(() => {
    if (!form.fecha) {
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
        console.error("[CargarTurnoManualForm] turnos del día error:", qErr);
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
    if (!form.fecha || !form.hora) {
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
    if (reason === "pasado") return "No se pueden cargar turnos en días pasados";
    if (reason === "no-habilitado")
      return "No hay turnos disponibles este día";
    if (reason === "uti")
      return "Pacientes con UTI solo pueden programarse los días habilitados para UTI";
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (!form.paciente_nombre || !form.paciente_dni || !form.paciente_edad || !form.obra_social_id || !form.tipo_cirugia || !form.tipo_anestesia_id || !form.fecha || !form.hora) {
      setError("Todos los campos obligatorios deben estar completos");
      return;
    }

    if (!form.medico_nombre.trim()) {
      setError("El nombre del médico responsable es obligatorio");
      return;
    }

    if (!form.medico_email.trim()) {
      setError("El email del médico responsable es obligatorio");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.medico_email.trim())) {
      setError("El email del médico no tiene un formato válido");
      return;
    }

    if (!form.medico_celular.trim()) {
      setError("El celular del médico responsable es obligatorio");
      return;
    }

    if (!form.quirofano_id) {
      setError("Debe seleccionar un quirófano");
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
      setError("No se pueden cargar turnos en el pasado");
      return;
    }

    // Verificar disponibilidad del quirófano seleccionado
    const quirofanoDisponible = disponibilidadQuirofano.get(form.quirofano_id);
    if (quirofanoDisponible === false) {
      setError("Este quirófano ya tiene una cirugía en ese horario");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/turnos/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente_nombre: form.paciente_nombre,
          paciente_dni: form.paciente_dni,
          paciente_edad: parseInt(form.paciente_edad),
          obra_social_id: form.obra_social_id,
          tipo_cirugia: form.tipo_cirugia,
          tipo_anestesia_id: form.tipo_anestesia_id,
          usa_idi: form.usa_idi,
          pasa_uti: form.pasa_uti,
          duracion_minutos: duracionTotal,
          fecha_hora: fechaHora.toISOString(),
          medico_nombre: form.medico_nombre.trim(),
          medico_email: form.medico_email.trim().toLowerCase(),
          medico_celular: form.medico_celular.trim(),
          quirofano_id: form.quirofano_id,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        const msg = data.error || `Error ${res.status}`;
        console.error("[CargarTurnoManualForm] api error:", msg);
        setError(msg);
        toast.error("Error al cargar el turno", { description: msg });
        return;
      }

      console.log("[CargarTurnoManualForm] turno creado:", data.id);
      toast.success("¡Turno cargado y confirmado!", {
        description: "El turno quedó confirmado con quirófano asignado",
      });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[CargarTurnoManualForm] unexpected throw:", err);
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

      {/* Datos del médico externo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User size={16} />
            </div>
            Médico Responsable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medico_nombre">Nombre del médico *</Label>
              <Input
                id="medico_nombre"
                value={form.medico_nombre}
                onChange={(e) => setForm({ ...form, medico_nombre: e.target.value })}
                required
                placeholder="Dr. Juan García"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medico_email">Email del médico *</Label>
              <Input
                id="medico_email"
                type="email"
                value={form.medico_email}
                onChange={(e) => setForm({ ...form, medico_email: e.target.value })}
                required
                placeholder="doctor@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medico_celular">Celular del médico *</Label>
              <Input
                id="medico_celular"
                value={form.medico_celular}
                onChange={(e) => setForm({ ...form, medico_celular: e.target.value })}
                required
                placeholder="11-1234-5678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos del paciente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
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

      {/* Quirófano */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Building2 size={16} />
            </div>
            Quirófano *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quirofanos.map((q) => {
              const disponible = disponibilidadQuirofano.get(q.id);
              const isSelected = form.quirofano_id === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setForm({ ...form, quirofano_id: q.id })}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:bg-muted/50",
                  )}
                >
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: q.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.nombre}</p>
                    {form.fecha && form.hora && disponible !== undefined && (
                      <p className={cn(
                        "text-xs",
                        disponible ? "text-success" : "text-destructive"
                      )}>
                        {disponible ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={12} /> Libre
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle size={12} /> Ocupado
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {form.quirofano_id && disponibilidadQuirofano.get(form.quirofano_id) === false && (
            <Alert variant="destructive">
              <XCircle size={16} />
              <AlertDescription>
                Este quirófano ya tiene una cirugía en ese horario
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Fecha y hora */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
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
                      quirofano_id: "",
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
              {fechaInvalida && (
                <p className="text-xs text-destructive mt-1">
                  Los pacientes con UTI solo pueden operarse en días habilitados
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Horario disponible *</Label>
              {slotsLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="spinner" />
                </div>
              ) : slotsDelDia.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                  {form.fecha
                    ? "No hay horarios disponibles para esta fecha"
                    : "Seleccioná una fecha primero"}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {slotsDelDia.map((slot) => (
                    <button
                      key={slot.hora}
                      type="button"
                      disabled={!slot.disponible}
                      onClick={() => setForm({ ...form, hora: slot.hora })}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm font-medium transition-all",
                        slot.hora === form.hora
                          ? "border-primary bg-primary text-primary-foreground"
                          : slot.disponible
                            ? "border-border hover:border-primary/50 hover:bg-primary/5"
                            : "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50",
                      )}
                    >
                      {slot.hora}
                      {slot.disponible && (
                        <span className="block text-[10px] opacity-70">
                          {slot.quirofanosLibres}/{slot.quirofanosTotales}Q
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {slotInvalidoPorDuracion && (
                <p className="text-xs text-destructive">
                  El horario seleccionado ya no está disponible con esta duración
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <div className="spinner mr-2" />
              Cargando...
            </>
          ) : (
            "Cargar Turno Confirmado"
          )}
        </Button>
      </div>
    </form>
  );
}
