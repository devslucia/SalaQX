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
import {
  User, Stethoscope, Clock, AlertTriangle, Info, ArrowRight,
} from "lucide-react";
import {
  DIAS_SEMANA,
  type DiaSemana,
  type ObraSocial,
  type TipoAnestesia,
  type HorarioHabilitado,
  type ConfigUTI,
  type User as AuthUser,
} from "@/lib/types";
import { format, getDay, parseISO, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

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
      const [os, ta, h, uti] = await Promise.all([
        supabase.from("obras_sociales").select("*").eq("activo", true).order("nombre"),
        supabase.from("tipos_anestesia").select("*").eq("activo", true).order("nombre"),
        supabase.from("horarios_habilitados").select("*"),
        supabase.from("config_uti").select("*").order("updated_at", { ascending: false }).limit(1).single(),
      ]);
      if (os.data) setObrasSociales(os.data);
      if (ta.data) setTiposAnestesia(ta.data);
      if (h.data) setHorarios(h.data);
      if (uti.data) setConfigUTI(uti.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (user?.telefono && !form.medico_telefono) {
      setForm((f) => ({ ...f, medico_telefono: user.telefono || "" }));
    }
  }, [user]);

  const getAvailableSlots = (dateStr: string): string[] => {
    if (!dateStr) return [];
    const date = parseISO(dateStr);
    const dayOfWeek = getDay(date) as DiaSemana;

    const slots: string[] = [];
    const applicableHorarios = horarios.filter((h) => h.dia === dayOfWeek);

    for (const h of applicableHorarios) {
      const [startH, startM] = h.hora_inicio.split(":").map(Number);
      const [endH, endM] = h.hora_fin.split(":").map(Number);
      let current = startH * 60 + startM;
      const end = endH * 60 + endM;
      const duracionMin = parseInt(form.duracion_horas) * 60 + parseInt(form.duracion_minutos);

      while (current + duracionMin <= end) {
        const hh = String(Math.floor(current / 60)).padStart(2, "0");
        const mm = String(current % 60).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
        current += 30;
      }
    }

    return slots;
  };

  const isUTIDayAllowed = (dateStr: string): boolean => {
    if (!form.pasa_uti || !configUTI) return true;
    const date = parseISO(dateStr);
    const dayOfWeek = getDay(date) as DiaSemana;
    return (configUTI.dias_permitidos as DiaSemana[]).includes(dayOfWeek);
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

    const { error: insertError } = await supabase.from("turnos").insert({
      medico_id: user.id,
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
      estado: "pendiente",
    });

    if (insertError) {
      setError(insertError.message);
      toast.error("Error al solicitar el turno", { description: insertError.message });
      setSubmitting(false);
      return;
    }

    toast.success("¡Turno solicitado!", {
      description: "Recibirás una notificación cuando sea revisado",
    });
    setSubmitting(false);
    onSuccess?.();
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

  const availableSlots = getAvailableSlots(form.fecha);
  const duracionTotal = parseInt(form.duracion_horas) * 60 + parseInt(form.duracion_minutos);
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
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setForm({ ...form, fecha: e.target.value, hora: "" })}
                required
              />
              {form.fecha && (
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(form.fecha), "EEEE d 'de' MMMM", { locale: es })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora *</Label>
              <Select
                id="hora"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                required
              >
                <option value="">Seleccionar horario...</option>
                {availableSlots.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              {form.fecha && availableSlots.length === 0 && (
                <p className="text-xs text-destructive">No hay horarios disponibles para esta fecha</p>
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
