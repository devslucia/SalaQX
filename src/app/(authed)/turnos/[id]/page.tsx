"use client";

import React, { useEffect, useState, use } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ESTADO_BORDER_COLORS, ESTADO_LABELS, type Turno, type Quirofano, type EstadoTurno } from "@/lib/types";
import { formatDateTime, formatTime, cn } from "@/lib/utils";
import { notify } from "@/lib/notify-client";
import { detectarConflictos, detectarConflictosTodosLosQuirofanos, type ConflictoInfo } from "@/lib/turnos-conflict";
import {
  ArrowLeft, CheckCircle, XCircle, Pause, Trash2, Pencil, User, Phone, Clock, Building2,
  Stethoscope, Syringe, Heart, Hash, FileText, MessageSquareWarning, CalendarClock, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";

export default function TurnoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [turno, setTurno] = useState<Turno | null>(null);
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedQuirofano, setSelectedQuirofano] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ fecha: "", hora: "", duracion_horas: "1", duracion_minutos: "0" });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [solicitarEliminacionOpen, setSolicitarEliminacionOpen] = useState(false);
  const [solicitudEliminacionMotivo, setSolicitudEliminacionMotivo] = useState("");

  const [rechazarEliminacionOpen, setRechazarEliminacionOpen] = useState(false);
  const [rechazoEliminacionMotivo, setRechazoEliminacionMotivo] = useState("");

  const [solicitarReprogOpen, setSolicitarReprogOpen] = useState(false);
  const [reprogForm, setReprogForm] = useState({ fecha: "", hora: "", motivo: "" });

  const [rechazarReprogOpen, setRechazarReprogOpen] = useState(false);
  const [rechazoReprogMotivo, setRechazoReprogMotivo] = useState("");

  const [asignarReprogOpen, setAsignarReprogOpen] = useState(false);
  const [asignarReprogForm, setAsignarReprogForm] = useState({ fecha: "", hora: "" });

  const [disponibilidadPorQuirofano, setDisponibilidadPorQuirofano] = useState<Map<string, ConflictoInfo[]>>(new Map());
  const [disponibilidadLoading, setDisponibilidadLoading] = useState(false);
  const [conflictoDetectado, setConflictoDetectado] = useState<ConflictoInfo[] | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [reassignTimeModalOpen, setReassignTimeModalOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reassignError, setReassignError] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);

  const fetchTurno = async () => {
    const { data } = await supabase.from("turnos").select("*").eq("id", id).single();
    if (data) {
      const [osRes, taRes, qRes] = await Promise.all([
        supabase.from("obras_sociales").select("nombre").eq("id", data.obra_social_id).single(),
        supabase.from("tipos_anestesia").select("nombre").eq("id", data.tipo_anestesia_id).single(),
        data.quirofano_id
          ? supabase.from("quirofanos").select("nombre").eq("id", data.quirofano_id).single()
          : { data: null },
      ]);

      // Para médicos externos (medico_id = null), usar datos del turno
      let medicoNombre = "—";
      let medicoTelefono = null;
      if (data.medico_id) {
        const { data: medicoData } = await supabase
          .from("users")
          .select("nombre,telefono")
          .eq("id", data.medico_id)
          .single();
        medicoNombre = medicoData?.nombre || "—";
        medicoTelefono = medicoData?.telefono;
      } else if (data.medico_nombre) {
        medicoNombre = data.medico_nombre;
        medicoTelefono = data.medico_celular;
      }

      setTurno({
        ...data,
        medico_nombre: medicoNombre,
        medico_telefono: medicoTelefono,
        obra_social: osRes.data,
        tipo_anestesia: taRes.data,
        quirofano: qRes.data,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTurno();
    const fetchQuirofanos = async () => {
      const { data } = await supabase.from("quirofanos").select("*").eq("activo", true);
      if (data) setQuirofanos(data);
    };
    fetchQuirofanos();
  }, [id]);

  const loadDisponibilidad = async () => {
    if (!turno) return;
    setDisponibilidadLoading(true);
    try {
      const map = await detectarConflictosTodosLosQuirofanos(
        supabase,
        new Date(turno.fecha_hora),
        turno.duracion_minutos,
        turno.id,
        quirofanos.map((q) => q.id),
      );
      setDisponibilidadPorQuirofano(map);
    } catch (e) {
      console.error("[loadDisponibilidad] error:", e);
    }
    setDisponibilidadLoading(false);
  };

  const handleConfirm = async () => {
    if (!selectedQuirofano || !turno) return;
    setActionLoading(true);
    try {
      const conflictos = await detectarConflictos(
        supabase,
        selectedQuirofano,
        new Date(turno.fecha_hora),
        turno.duracion_minutos,
        turno.id,
      );
      if (conflictos.length > 0) {
        setConflictoDetectado(conflictos);
        setConflictModalOpen(true);
        return;
      }
      const { error } = await supabase
        .from("turnos")
        .update({ estado: "confirmada", quirofano_id: selectedQuirofano })
        .eq("id", turno.id);
      if (error) throw error;
      void notify("turno-confirmado", { turno_id: turno.id });
      toast.success("Turno confirmado", { description: "Se notificó al médico por email" });
      setConfirmDialogOpen(false);
      setSelectedQuirofano("");
      fetchTurno();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error("Error al confirmar", { description: message });
    }
    setActionLoading(false);
  };

  const handleReassignTime = async () => {
    if (!newDate || !newTime || !turno || !selectedQuirofano) return;
    setReassignLoading(true);
    setReassignError("");
    try {
      const nuevaFechaHora = new Date(`${newDate}T${newTime}:00`);
      if (Number.isNaN(nuevaFechaHora.getTime())) {
        setReassignError("Fecha u hora inválida");
        setReassignLoading(false);
        return;
      }
      const conflictos = await detectarConflictos(
        supabase,
        selectedQuirofano,
        nuevaFechaHora,
        turno.duracion_minutos,
        turno.id,
      );
      if (conflictos.length > 0) {
        setReassignError(
          "Ese horario también está ocupado en el quirófano seleccionado. Elegí otro.",
        );
        return;
      }
      const fechaAnterior = turno.fecha_hora;
      const { error } = await supabase
        .from("turnos")
        .update({
          estado: "confirmada",
          quirofano_id: selectedQuirofano,
          fecha_hora: nuevaFechaHora.toISOString(),
        })
        .eq("id", turno.id);
      if (error) throw error;
      void notify("turno-confirmado-con-cambio", {
        turno_id: turno.id,
        fecha_hora_anterior: fechaAnterior,
      });
      toast.success("Turno confirmado con horario modificado", {
        description: "Se notificó al médico por email",
      });
      setReassignTimeModalOpen(false);
      setConfirmDialogOpen(false);
      setSelectedQuirofano("");
      setNewDate("");
      setNewTime("");
      fetchTurno();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setReassignError(message);
    }
    setReassignLoading(false);
  };

  const handleReject = async () => {
    if (!motivoRechazo.trim() || !turno) return;
    setActionLoading(true);
    try {
      const motivo = motivoRechazo.trim();
      const { error } = await supabase
        .from("turnos")
        .update({ estado: "rechazada", motivo_rechazo: motivo })
        .eq("id", turno.id);
      if (error) throw error;
      void notify("turno-rechazado", { turno_id: turno.id, motivo });
      toast.success("Turno rechazado", { description: "Se notificó al médico con el motivo" });
      setRejectDialogOpen(false);
      setMotivoRechazo("");
      fetchTurno();
    } catch (e: any) {
      toast.error("Error al rechazar", { description: e.message });
    }
    setActionLoading(false);
  };

  const handleSuspend = async () => {
    if (!turno) return;
    setActionLoading(true);
    try {
      await supabase.from("turnos").update({ estado: "suspendida" }).eq("id", turno.id);
      void notify("cirugia-suspendida", { turno_id: turno.id });
      toast.success("Cirugía suspendida");
      fetchTurno();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setActionLoading(false);
  };

  const handleEdit = async () => {
    if (!turno || !editForm.fecha || !editForm.hora) return;
    setActionLoading(true);
    try {
      const fechaHora = new Date(`${editForm.fecha}T${editForm.hora}:00`);
      const duracionTotal = parseInt(editForm.duracion_horas) * 60 + parseInt(editForm.duracion_minutos);
      const fechaAnterior = new Date(turno.fecha_hora);
      const cambios: { campo: "fecha_hora" | "duracion_minutos"; anterior: string | number; nuevo: string | number }[] = [];
      if (fechaAnterior.toISOString() !== fechaHora.toISOString()) {
        cambios.push({ campo: "fecha_hora", anterior: fechaAnterior.toISOString(), nuevo: fechaHora.toISOString() });
      }
      if (turno.duracion_minutos !== duracionTotal) {
        cambios.push({ campo: "duracion_minutos", anterior: turno.duracion_minutos, nuevo: duracionTotal });
      }
      await supabase.from("turnos").update({
        fecha_hora: fechaHora.toISOString(),
        duracion_minutos: duracionTotal,
      }).eq("id", turno.id);
      void notify("cirugia-editada", { turno_id: turno.id, cambios });
      toast.success("Turno actualizado");
      setEditDialogOpen(false);
      fetchTurno();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setActionLoading(false);
  };

  // Admin: hard-delete the turno. Notifies the medico if the turno was in
  // solicitud_eliminacion state (the api route handles that branching).
  const handleDelete = async () => {
    if (!turno) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/turnos/${turno.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al eliminar");
      }
      toast.success("Turno eliminado correctamente");
      setDeleteDialogOpen(false);
      router.push("/turnos");
    } catch (e: any) {
      toast.error("Error al eliminar", { description: e.message });
      setActionLoading(false);
    }
  };

  // Medico: request deletion of a confirmed turno
  const handleSolicitarEliminacion = async () => {
    if (!turno) return;
    setActionLoading(true);
    try {
      const motivo = solicitudEliminacionMotivo.trim() || null;
      const { error } = await supabase.from("turnos").update({
        estado: "solicitud_eliminacion",
        solicitud_motivo: motivo,
      }).eq("id", turno.id);
      if (error) throw error;
      void notify("solicitud-eliminacion", { turno_id: turno.id, motivo: motivo ?? "" });
      toast.success("Solicitud enviada", { description: "La encargada/admin la revisará" });
      setSolicitarEliminacionOpen(false);
      setSolicitudEliminacionMotivo("");
      fetchTurno();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setActionLoading(false);
  };

  // Admin: approve a deletion request (= hard delete, with email to medico)
  const handleAprobarEliminacion = async () => {
    if (!turno) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/turnos/${turno.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al aprobar eliminación");
      }
      toast.success("Eliminación aprobada", { description: "Se notificó al médico" });
      router.push("/turnos");
    } catch (e: any) {
      toast.error("Error", { description: e.message });
      setActionLoading(false);
    }
  };

  // Admin: reject a deletion request (keeps the turno, notifies medico)
  const handleRechazarEliminacion = async () => {
    if (!rechazoEliminacionMotivo.trim() || !turno) return;
    setActionLoading(true);
    try {
      const motivo = rechazoEliminacionMotivo.trim();
      const { error } = await supabase.from("turnos").update({
        estado: "confirmada",
        solicitud_rechazo_motivo: motivo,
        solicitud_rechazo_at: new Date().toISOString(),
        solicitud_rechazo_por: user?.id ?? null,
        solicitud_motivo: null,
      }).eq("id", turno.id);
      if (error) throw error;
      void notify("eliminacion-rechazada", { turno_id: turno.id, motivo });
      toast.success("Solicitud rechazada", { description: "Se notificó al médico" });
      setRechazarEliminacionOpen(false);
      setRechazoEliminacionMotivo("");
      fetchTurno();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setActionLoading(false);
  };

  // Medico: request reprogramación
  const handleSolicitarReprogramacion = async () => {
    if (!turno || !reprogForm.fecha || !reprogForm.hora) return;
    setActionLoading(true);
    try {
      const fechaPropuesta = new Date(`${reprogForm.fecha}T${reprogForm.hora}:00`);
      if (isNaN(fechaPropuesta.getTime())) {
        toast.error("Fecha inválida");
        setActionLoading(false);
        return;
      }
      const motivo = reprogForm.motivo.trim() || null;
      const { error } = await supabase.from("turnos").update({
        estado: "solicitud_reprogramacion",
        solicitud_motivo: motivo,
        solicitud_fecha_propuesta: fechaPropuesta.toISOString(),
      }).eq("id", turno.id);
      if (error) throw error;
      void notify("solicitud-reprogramacion", {
        turno_id: turno.id,
        motivo: motivo ?? "",
        fecha_propuesta: fechaPropuesta.toISOString(),
      });
      toast.success("Solicitud enviada", { description: "La encargada/admin la revisará" });
      setSolicitarReprogOpen(false);
      setReprogForm({ fecha: "", hora: "", motivo: "" });
      fetchTurno();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setActionLoading(false);
  };

  // Admin: accept the medico's proposed date
  const handleAceptarReprogramacion = async () => {
    if (!turno || !turno.solicitud_fecha_propuesta) return;
    setActionLoading(true);
    try {
      const fechaAnterior = turno.fecha_hora;
      const { error } = await supabase.from("turnos").update({
        estado: "confirmada",
        fecha_hora: turno.solicitud_fecha_propuesta,
        solicitud_motivo: null,
        solicitud_fecha_propuesta: null,
        solicitud_rechazo_motivo: null,
        solicitud_rechazo_at: null,
        solicitud_rechazo_por: null,
      }).eq("id", turno.id);
      if (error) throw error;
      void notify("reprogramacion-confirmada", {
        turno_id: turno.id,
        fecha_propuesta: fechaAnterior,
        motivo: "propuesta",
      });
      toast.success("Reprogramación aceptada", { description: "Se notificó al médico" });
      fetchTurno();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setActionLoading(false);
  };

  // Admin: assign a different date than the medico proposed
  const handleAsignarReprogramacion = async () => {
    if (!turno || !asignarReprogForm.fecha || !asignarReprogForm.hora) return;
    setActionLoading(true);
    try {
      const fechaNueva = new Date(`${asignarReprogForm.fecha}T${asignarReprogForm.hora}:00`);
      if (isNaN(fechaNueva.getTime())) {
        toast.error("Fecha inválida");
        setActionLoading(false);
        return;
      }
      const fechaAnterior = turno.fecha_hora;
      const { error } = await supabase.from("turnos").update({
        estado: "confirmada",
        fecha_hora: fechaNueva.toISOString(),
        solicitud_motivo: null,
        solicitud_fecha_propuesta: null,
        solicitud_rechazo_motivo: null,
        solicitud_rechazo_at: null,
        solicitud_rechazo_por: null,
      }).eq("id", turno.id);
      if (error) throw error;
      void notify("reprogramacion-confirmada", {
        turno_id: turno.id,
        fecha_propuesta: fechaAnterior,
        motivo: "asignada",
      });
      toast.success("Nueva fecha asignada", { description: "Se notificó al médico" });
      setAsignarReprogOpen(false);
      setAsignarReprogForm({ fecha: "", hora: "" });
      fetchTurno();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setActionLoading(false);
  };

  // Admin: reject reprogramación
  const handleRechazarReprogramacion = async () => {
    if (!rechazoReprogMotivo.trim() || !turno || !turno.solicitud_fecha_propuesta) return;
    setActionLoading(true);
    try {
      const motivo = rechazoReprogMotivo.trim();
      const { error } = await supabase.from("turnos").update({
        estado: "confirmada",
        solicitud_rechazo_motivo: motivo,
        solicitud_rechazo_at: new Date().toISOString(),
        solicitud_rechazo_por: user?.id ?? null,
        solicitud_motivo: null,
        solicitud_fecha_propuesta: null,
      }).eq("id", turno.id);
      if (error) throw error;
      void notify("reprogramacion-rechazada", {
        turno_id: turno.id,
        motivo,
        fecha_propuesta: turno.solicitud_fecha_propuesta,
      });
      toast.success("Reprogramación rechazada", { description: "Se notificó al médico" });
      setRechazarReprogOpen(false);
      setRechazoReprogMotivo("");
      fetchTurno();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-24 bg-muted rounded-lg animate-shimmer" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-muted animate-shimmer" />
          <div className="space-y-2 flex-1">
            <div className="h-7 w-56 bg-muted rounded animate-shimmer" />
            <div className="h-3 w-72 bg-muted rounded animate-shimmer" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-card space-y-3">
              <div className="h-5 w-32 bg-muted rounded animate-shimmer" />
              <div className="space-y-2">
                <div className="h-3 w-24 bg-muted rounded animate-shimmer" />
                <div className="h-4 w-full bg-muted rounded animate-shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 bg-muted rounded animate-shimmer" />
                <div className="h-4 w-3/4 bg-muted rounded animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!turno) {
    return <Alert variant="destructive"><AlertDescription>Turno no encontrado</AlertDescription></Alert>;
  }

  const isAdminOrEncargada = user && ["admin", "encargada"].includes(user.rol);
  const isMedicoOwner = user?.id === turno.medico_id;

  // Permission flags
  const canConfirmReject = isAdminOrEncargada && turno.estado === "pendiente";
  const canEditOrSuspend = isAdminOrEncargada && turno.estado === "confirmada";
  const canMedicoRequestDelete = isMedicoOwner && turno.estado === "confirmada";
  const canMedicoRequestReprog = isMedicoOwner && (turno.estado === "confirmada" || turno.estado === "pendiente");
  const isEliminacionSolicitada = turno.estado === "solicitud_eliminacion";
  const isReprogSolicitada = turno.estado === "solicitud_reprogramacion";

  const estadoBadgeClass: Record<EstadoTurno, string> = {
    pendiente: "bg-warning/15 text-warning border-warning/30",
    confirmada: "bg-success/15 text-success border-success/30",
    rechazada: "bg-destructive/15 text-destructive border-destructive/30",
    suspendida: "bg-muted text-muted-foreground border-border",
    eliminada: "bg-muted text-muted-foreground border-border",
    solicitud_eliminacion: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    solicitud_reprogramacion: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/turnos"
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
      </div>

      <PageHeader
        icon={FileText}
        title="Detalle del Turno"
        description={`${turno.paciente_nombre} · DNI ${turno.paciente_dni}`}
        actions={
          <Badge className={cn("capitalize text-sm px-3 py-1.5 border", estadoBadgeClass[turno.estado])}>
            {ESTADO_LABELS[turno.estado] ?? turno.estado}
          </Badge>
        }
      />

      {/* Solicitud info banners */}
      {isEliminacionSolicitada && (
        <Alert className="border-orange-500/30 bg-orange-500/10">
          <MessageSquareWarning className="text-orange-600" size={16} />
          <AlertDescription>
            <strong>Eliminación solicitada por el médico</strong>
            {turno.solicitud_motivo && (
              <span className="block mt-1 text-sm">Motivo: {turno.solicitud_motivo}</span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {isReprogSolicitada && turno.solicitud_fecha_propuesta && (
        <Alert className="border-violet-500/30 bg-violet-500/10">
          <CalendarClock className="text-violet-600" size={16} />
          <AlertDescription>
            <strong>Reprogramación solicitada por el médico</strong>
            <span className="block mt-1 text-sm">
              Propone: {formatDateTime(turno.solicitud_fecha_propuesta)}
            </span>
            {turno.solicitud_motivo && (
              <span className="block text-sm">Motivo: {turno.solicitud_motivo}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={cn("border-l-4", ESTADO_BORDER_COLORS[turno.estado])}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User size={16} />
              </div>
              Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <Field label="Nombre" value={turno.paciente_nombre} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="DNI" value={turno.paciente_dni} />
              <Field label="Edad" value={`${turno.paciente_edad} años`} />
            </div>
            <Field label="Obra Social" value={turno.obra_social?.nombre || "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                <Stethoscope size={16} />
              </div>
              Cirugía
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <Field label="Tipo" value={turno.tipo_cirugia} />
            <Field label="Anestesia" value={turno.tipo_anestesia?.nombre || "—"} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duración" value={`${turno.duracion_minutos} min`} />
              <Field label="Quirófano" value={turno.quirofano?.nombre || "Sin asignar"} />
            </div>
            <div className="flex gap-2 pt-1">
              {turno.usa_idi && <Badge variant="default">Usa IDI</Badge>}
              {turno.pasa_uti && <Badge variant="warning">Pasa a UTI</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <User size={16} />
              </div>
              Médico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <Field label="Nombre" value={turno.medico_nombre || "—"} />
            <Field label="Teléfono" value={turno.medico_telefono || "—"} />
            {turno.medico_email && (
              <Field label="Email" value={turno.medico_email} />
            )}
            {turno.cargado_por_rol && turno.cargado_por_rol !== "medico" && (
              <div className="pt-2 mt-2 border-t border-dashed">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-violet-600 dark:text-violet-400">Cargado manualmente</span>
                  {" "}por {turno.cargado_por_rol === "admin" ? "un administrador" : "la encargada"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Clock size={16} />
              </div>
              Programación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <Field label="Fecha y hora" value={formatDateTime(turno.fecha_hora)} />
            <Field label="Creado" value={new Date(turno.created_at).toLocaleString("es-AR")} />
          </CardContent>
        </Card>
      </div>

      {turno.estado === "rechazada" && turno.motivo_rechazo && (
        <Alert variant="destructive">
          <XCircle size={16} />
          <AlertDescription>
            <strong>Motivo de rechazo:</strong> {turno.motivo_rechazo}
          </AlertDescription>
        </Alert>
      )}
      {turno.solicitud_rechazo_motivo && (
        <Alert variant="destructive">
          <AlertTriangle size={16} />
          <AlertDescription>
            <strong>Última solicitud rechazada:</strong> {turno.solicitud_rechazo_motivo}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions card */}
      {(canConfirmReject || canEditOrSuspend || isAdminOrEncargada || canMedicoRequestDelete || canMedicoRequestReprog || isEliminacionSolicitada || isReprogSolicitada) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canConfirmReject && (
              <>
                <Button
                  variant="success"
                  onClick={() => {
                    setSelectedQuirofano("");
                    setConfirmDialogOpen(true);
                    void loadDisponibilidad();
                  }}
                >
                  <CheckCircle size={16} /> Confirmar
                </Button>
                <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>
                  <XCircle size={16} /> Rechazar
                </Button>
              </>
            )}
            {canEditOrSuspend && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const fh = new Date(turno.fecha_hora);
                    setEditForm({
                      fecha: fh.toISOString().split("T")[0],
                      hora: `${String(fh.getHours()).padStart(2, "0")}:${String(fh.getMinutes()).padStart(2, "0")}`,
                      duracion_horas: String(Math.floor(turno.duracion_minutos / 60)),
                      duracion_minutos: String(turno.duracion_minutos % 60),
                    });
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil size={16} /> Editar
                </Button>
                <Button variant="outline" onClick={handleSuspend}>
                  <Pause size={16} /> Suspender
                </Button>
              </>
            )}
            {isEliminacionSolicitada && isAdminOrEncargada && (
              <>
                <Button variant="destructive" onClick={handleAprobarEliminacion} disabled={actionLoading}>
                  <CheckCircle size={16} /> Aprobar eliminación
                </Button>
                <Button variant="outline" onClick={() => setRechazarEliminacionOpen(true)}>
                  <XCircle size={16} /> Rechazar solicitud
                </Button>
              </>
            )}
            {isReprogSolicitada && isAdminOrEncargada && (
              <>
                <Button variant="success" onClick={handleAceptarReprogramacion} disabled={actionLoading}>
                  <CheckCircle size={16} /> Aceptar fecha propuesta
                </Button>
                <Button variant="outline" onClick={() => {
                  const fh = turno.solicitud_fecha_propuesta ? new Date(turno.solicitud_fecha_propuesta) : new Date();
                  setAsignarReprogForm({
                    fecha: fh.toISOString().split("T")[0],
                    hora: `${String(fh.getHours()).padStart(2, "0")}:${String(fh.getMinutes()).padStart(2, "0")}`,
                  });
                  setAsignarReprogOpen(true);
                }}>
                  <CalendarClock size={16} /> Asignar otra fecha
                </Button>
                <Button variant="destructive" onClick={() => setRechazarReprogOpen(true)}>
                  <XCircle size={16} /> Rechazar
                </Button>
              </>
            )}
            {canMedicoRequestReprog && (
              <Button
                variant="outline"
                onClick={() => {
                  const fh = new Date(turno.fecha_hora);
                  setReprogForm({
                    fecha: fh.toISOString().split("T")[0],
                    hora: `${String(fh.getHours()).padStart(2, "0")}:${String(fh.getMinutes()).padStart(2, "0")}`,
                    motivo: "",
                  });
                  setSolicitarReprogOpen(true);
                }}
              >
                <CalendarClock size={16} /> Solicitar reprogramación
              </Button>
            )}
            {canMedicoRequestDelete && (
              <Button variant="outline" onClick={() => setSolicitarEliminacionOpen(true)}>
                <Trash2 size={16} /> Solicitar eliminación
              </Button>
            )}
            {isAdminOrEncargada && (turno.estado === "pendiente" || turno.estado === "confirmada" || turno.estado === "suspendida" || turno.estado === "rechazada") && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 size={16} /> Eliminar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        {(onClose) => (
        <DialogContent onClose={() => { onClose(false); setConfirmDialogOpen(false); }} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar Turno</DialogTitle>
            <DialogDescription>
              Asigná el quirófano para el turno de <strong>{turno.paciente_nombre}</strong> el{" "}
              <strong>{formatDateTime(turno.fecha_hora)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quirófano</Label>
              {disponibilidadLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="spinner h-3 w-3" />
                  Verificando disponibilidad...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quirofanos.map((q) => {
                    const conflictos = disponibilidadPorQuirofano.get(q.id) ?? [];
                    const libre = conflictos.length === 0;
                    const seleccionado = selectedQuirofano === q.id;
                    const tooltipText = libre
                      ? `Quirófano libre · click para seleccionar`
                      : conflictos
                          .map((c) => {
                            const ini = new Date(c.fecha_hora);
                            const fin = new Date(
                              ini.getTime() + c.duracion_minutos * 60_000,
                            );
                            return `Ocupado ${formatTime(ini)}-${formatTime(fin)} · ${c.paciente_nombre}${c.medico ? ` · ${c.medico.nombre}` : ""}`;
                          })
                          .join("\n");
                    return (
                      <button
                        key={q.id}
                        type="button"
                        disabled={!libre}
                        onClick={() => libre && setSelectedQuirofano(q.id)}
                        title={tooltipText}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-colors",
                          seleccionado
                            ? "border-success bg-success/10 ring-2 ring-success/30"
                            : libre
                              ? "border-success/40 bg-success/5 hover:border-success hover:bg-success/10 cursor-pointer"
                              : "border-destructive/40 bg-destructive/5 opacity-60 cursor-not-allowed",
                        )}
                      >
                        {libre ? (
                          <CheckCircle
                            size={18}
                            className="text-success shrink-0"
                            aria-hidden
                          />
                        ) : (
                          <AlertTriangle
                            size={18}
                            className="text-destructive shrink-0"
                            aria-hidden
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{q.nombre}</p>
                          <p
                            className={cn(
                              "text-xs",
                              libre ? "text-success" : "text-destructive",
                            )}
                          >
                            {libre
                              ? "Libre en este horario"
                              : `Ocupado · ${conflictos.length} conflicto${conflictos.length === 1 ? "" : "s"}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setSelectedQuirofano("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleConfirm}
              disabled={!selectedQuirofano || actionLoading || disponibilidadLoading}
            >
              {actionLoading ? "Confirmando..." : "Confirmar Turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        {(onClose) => (
        <DialogContent onClose={() => setRejectDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Rechazar Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Indicá el motivo del rechazo para <strong>{turno.paciente_nombre}</strong>
            </p>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Motivo del rechazo (obligatorio)..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!motivoRechazo.trim() || actionLoading}>
              {actionLoading ? "Rechazando..." : "Rechazar Turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        {(onClose) => (
        <DialogContent onClose={() => setEditDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Editar Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={editForm.fecha}
                  onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={editForm.hora}
                  onChange={(e) => setEditForm({ ...editForm, hora: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Horas</Label>
                <Select value={editForm.duracion_horas}
                  onChange={(e) => setEditForm({ ...editForm, duracion_horas: e.target.value })}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                    <option key={h} value={h}>{h}h</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minutos</Label>
                <Select value={editForm.duracion_minutos}
                  onChange={(e) => setEditForm({ ...editForm, duracion_minutos: e.target.value })}>
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{m}min</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={actionLoading}>
              {actionLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Delete confirmation dialog (admin/encargada) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        {(onClose) => (
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Eliminar turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              ¿Estás seguro que querés eliminar este turno? Esta acción no se puede deshacer.
            </p>
            <p className="text-sm text-muted-foreground">
              Paciente: <strong>{turno.paciente_nombre}</strong> ·{" "}
              Fecha: <strong>{formatDateTime(turno.fecha_hora)}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? "Eliminando..." : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Solicitar eliminación (médico) */}
      <Dialog open={solicitarEliminacionOpen} onOpenChange={setSolicitarEliminacionOpen}>
        {(onClose) => (
        <DialogContent onClose={() => setSolicitarEliminacionOpen(false)}>
          <DialogHeader>
            <DialogTitle>Solicitar eliminación de turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La encargada o admin recibirá tu solicitud y decidirá si la aprueba.
              Tu turno seguirá confirmado mientras tanto.
            </p>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                placeholder="¿Por qué querés que se elimine este turno?"
                value={solicitudEliminacionMotivo}
                onChange={(e) => setSolicitudEliminacionMotivo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSolicitarEliminacionOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSolicitarEliminacion} disabled={actionLoading}>
              {actionLoading ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Rechazar eliminación (admin) */}
      <Dialog open={rechazarEliminacionOpen} onOpenChange={setRechazarEliminacionOpen}>
        {(onClose) => (
        <DialogContent onClose={() => setRechazarEliminacionOpen(false)}>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud de eliminación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              El médico será notificado con el motivo. El turno volverá a estado confirmada.
            </p>
            <div className="space-y-2">
              <Label>Motivo del rechazo (obligatorio)</Label>
              <Textarea
                placeholder="Explicá por qué no se aprueba la eliminación..."
                value={rechazoEliminacionMotivo}
                onChange={(e) => setRechazoEliminacionMotivo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarEliminacionOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRechazarEliminacion}
              disabled={!rechazoEliminacionMotivo.trim() || actionLoading}>
              {actionLoading ? "Rechazando..." : "Rechazar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Solicitar reprogramación (médico) */}
      <Dialog open={solicitarReprogOpen} onOpenChange={setSolicitarReprogOpen}>
        {(onClose) => (
        <DialogContent onClose={() => { onClose(false); setSolicitarReprogOpen(false); }} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar reprogramación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Proponé una nueva fecha y hora. La encargada o admin la revisará.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nueva fecha</Label>
                <Input type="date" value={reprogForm.fecha}
                  onChange={(e) => setReprogForm({ ...reprogForm, fecha: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nueva hora</Label>
                <Input type="time" value={reprogForm.hora}
                  onChange={(e) => setReprogForm({ ...reprogForm, hora: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo o aclaración (opcional)</Label>
              <Textarea
                placeholder="Contanos por qué necesitás reprogramar..."
                value={reprogForm.motivo}
                onChange={(e) => setReprogForm({ ...reprogForm, motivo: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSolicitarReprogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSolicitarReprogramacion}
              disabled={!reprogForm.fecha || !reprogForm.hora || actionLoading}>
              {actionLoading ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Asignar otra fecha (admin) */}
      <Dialog open={asignarReprogOpen} onOpenChange={setAsignarReprogOpen}>
        {(onClose) => (
        <DialogContent onClose={() => setAsignarReprogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Asignar otra fecha al turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              El médico propuso {turno.solicitud_fecha_propuesta && formatDateTime(turno.solicitud_fecha_propuesta)}.
              Asigná una fecha y hora diferente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={asignarReprogForm.fecha}
                  onChange={(e) => setAsignarReprogForm({ ...asignarReprogForm, fecha: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={asignarReprogForm.hora}
                  onChange={(e) => setAsignarReprogForm({ ...asignarReprogForm, hora: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAsignarReprogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAsignarReprogramacion}
              disabled={!asignarReprogForm.fecha || !asignarReprogForm.hora || actionLoading}>
              {actionLoading ? "Asignando..." : "Asignar y notificar"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Rechazar reprogramación (admin) */}
      <Dialog open={rechazarReprogOpen} onOpenChange={setRechazarReprogOpen}>
        {(onClose) => (
        <DialogContent onClose={() => setRechazarReprogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Rechazar reprogramación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              El médico será notificado. El turno queda en su fecha y hora original.
            </p>
            <div className="space-y-2">
              <Label>Motivo del rechazo (obligatorio)</Label>
              <Textarea
                placeholder="Explicá por qué no se aprueba la reprogramación..."
                value={rechazoReprogMotivo}
                onChange={(e) => setRechazoReprogMotivo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarReprogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRechazarReprogramacion}
              disabled={!rechazoReprogMotivo.trim() || actionLoading}>
              {actionLoading ? "Rechazando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Conflict warning modal (encargada forced confirmation with conflict) */}
      <Dialog open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        {(onClose) => (
        <DialogContent onClose={() => { onClose(false); setConflictModalOpen(false); }} className="max-w-lg">
          <DialogHeader>
            <div className="mx-auto sm:mx-0 mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" aria-hidden />
            </div>
            <DialogTitle>
              Conflicto de horario en {quirofanos.find((q) => q.id === selectedQuirofano)?.nombre ?? "el quirófano"}
            </DialogTitle>
            <DialogDescription>
              Ya existe una cirugía agendada en ese quirófano que se superpone con este turno.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {conflictoDetectado?.map((c) => {
              const ini = new Date(c.fecha_hora);
              const fin = new Date(ini.getTime() + c.duracion_minutos * 60_000);
              return (
                <Card key={c.id} className="border-l-4 border-l-destructive">
                  <CardContent className="p-3 space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Paciente:</span>{" "}
                      <strong>{c.paciente_nombre}</strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Tipo de cirugía:</span>{" "}
                      <strong>{c.tipo_cirugia}</strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Horario:</span>{" "}
                      <strong>
                        {formatTime(ini)} - {formatTime(fin)}
                      </strong>
                    </p>
                    {c.medico && (
                      <p>
                        <span className="text-muted-foreground">Médico:</span>{" "}
                        <strong>{c.medico.nombre}</strong>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">¿Qué querés hacer?</p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setConflictModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                setConflictModalOpen(false);
                setSelectedQuirofano("");
                await loadDisponibilidad();
              }}
            >
              Cambiar quirófano
            </Button>
            <Button
              variant="warning"
              onClick={() => {
                setConflictModalOpen(false);
                const fh = new Date(turno.fecha_hora);
                setNewDate(fh.toISOString().split("T")[0]);
                setNewTime(
                  `${String(fh.getHours()).padStart(2, "0")}:${String(fh.getMinutes()).padStart(2, "0")}`,
                );
                setReassignError("");
                setReassignTimeModalOpen(true);
              }}
            >
              Cambiar horario al médico
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>

      {/* Reassign time modal (cambiar horario al médico) */}
      <Dialog open={reassignTimeModalOpen} onOpenChange={setReassignTimeModalOpen}>
        {(onClose) => (
        <DialogContent onClose={() => setReassignTimeModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Cambiar horario al médico</DialogTitle>
            <DialogDescription>
              Proponé un nuevo horario para el turno de <strong>{turno.paciente_nombre}</strong>{" "}
              en <strong>{quirofanos.find((q) => q.id === selectedQuirofano)?.nombre ?? "el quirófano"}</strong>.
              La duración ({turno.duracion_minutos} min) se mantiene. El médico será notificado del cambio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nueva fecha</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nueva hora</Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>
            {reassignError && (
              <Alert variant="destructive">
                <AlertTriangle size={16} />
                <AlertDescription>{reassignError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReassignTimeModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="warning"
              onClick={handleReassignTime}
              disabled={!newDate || !newTime || reassignLoading}
            >
              {reassignLoading ? "Guardando..." : "Confirmar con nuevo horario"}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
