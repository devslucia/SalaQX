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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ESTADO_BORDER_COLORS, type Turno, type Quirofano, type EstadoTurno } from "@/lib/types";
import { formatDateTime, cn } from "@/lib/utils";
import { notify } from "@/lib/notify-client";
import {
  ArrowLeft, CheckCircle, XCircle, Pause, Trash2, Pencil, User, Phone, Clock, Building2,
  Stethoscope, Syringe, Heart, Hash, FileText,
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

  const fetchTurno = async () => {
    const { data } = await supabase.from("turnos").select("*").eq("id", id).single();
    if (data) {
      const [medicoRes, osRes, taRes, qRes] = await Promise.all([
        supabase.from("users").select("nombre,telefono").eq("id", data.medico_id).single(),
        supabase.from("obras_sociales").select("nombre").eq("id", data.obra_social_id).single(),
        supabase.from("tipos_anestesia").select("nombre").eq("id", data.tipo_anestesia_id).single(),
        data.quirofano_id
          ? supabase.from("quirofanos").select("nombre").eq("id", data.quirofano_id).single()
          : { data: null },
      ]);
      setTurno({
        ...data,
        medico_nombre: medicoRes.data?.nombre || "—",
        medico_telefono: medicoRes.data?.telefono,
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

  const handleConfirm = async () => {
    if (!selectedQuirofano || !turno) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("turnos")
        .update({ estado: "confirmada", quirofano_id: selectedQuirofano })
        .eq("id", turno.id);

      if (error) throw error;

      void notify("turno-confirmado", { turno_id: turno.id });

      toast.success("Turno confirmado", {
        description: "Se notificó al médico por email",
      });
      setConfirmDialogOpen(false);
      fetchTurno();
    } catch (e: any) {
      toast.error("Error al confirmar", { description: e.message });
    }
    setActionLoading(false);
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

  const handleDelete = async () => {
    if (!turno) return;
    if (!confirm("¿Eliminar este turno permanentemente?")) return;
    setActionLoading(true);
    try {
      await supabase.from("turnos").update({ estado: "eliminada" }).eq("id", turno.id);
      toast.success("Turno eliminado");
      router.push("/turnos");
    } catch (e: any) {
      toast.error("Error", { description: e.message });
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!turno || !editForm.fecha || !editForm.hora) return;
    setActionLoading(true);
    try {
      const fechaHora = new Date(`${editForm.fecha}T${editForm.hora}:00`);
      const duracionTotal = parseInt(editForm.duracion_horas) * 60 + parseInt(editForm.duracion_minutos);

      const cambios: string[] = [];
      const fechaAnterior = new Date(turno.fecha_hora);
      if (fechaAnterior.toISOString() !== fechaHora.toISOString()) {
        cambios.push(
          `Fecha y hora: de ${fechaAnterior.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} a ${fechaHora.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`,
        );
      }
      if (turno.duracion_minutos !== duracionTotal) {
        const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
        cambios.push(`Duración: de ${fmt(turno.duracion_minutos)} a ${fmt(duracionTotal)}`);
      }
      if (cambios.length === 0) {
        cambios.push("Datos actualizados");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="spinner mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando turno...</p>
        </div>
      </div>
    );
  }

  if (!turno) {
    return <Alert variant="destructive"><AlertDescription>Turno no encontrado</AlertDescription></Alert>;
  }

  const isAdminOrEncargada = user && ["admin", "encargada"].includes(user.rol);
  const canAct = isAdminOrEncargada && (turno.estado === "pendiente" || turno.estado === "confirmada");

  const estadoBadgeVariant: Record<EstadoTurno, "default" | "success" | "destructive" | "warning" | "secondary"> = {
    pendiente: "warning",
    confirmada: "success",
    rechazada: "destructive",
    suspendida: "secondary",
    eliminada: "secondary",
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
          <Badge variant={estadoBadgeVariant[turno.estado]} className="capitalize text-sm px-3 py-1.5">
            {turno.estado}
          </Badge>
        }
      />

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
              <Field
                label="Quirófano"
                value={turno.quirofano?.nombre || "Sin asignar"}
              />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Clock size={16} />
              </div>
              Fecha y Hora
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-semibold text-lg">{formatDateTime(turno.fecha_hora)}</p>
            {turno.quirofano && (
              <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Building2 size={14} />
                {turno.quirofano.nombre}
              </p>
            )}
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

      {canAct && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {turno.estado === "pendiente" && (
              <>
                <Button
                  variant="success"
                  onClick={() => {
                    setSelectedQuirofano("");
                    setConfirmDialogOpen(true);
                  }}
                >
                  <CheckCircle size={16} /> Confirmar
                </Button>
                <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>
                  <XCircle size={16} /> Rechazar
                </Button>
              </>
            )}
            {turno.estado === "confirmada" && (
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
            {isAdminOrEncargada && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 size={16} /> Eliminar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent onClose={() => setConfirmDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Confirmar Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Asigná el quirófano para el turno de <strong>{turno.paciente_nombre}</strong> el{" "}
              <strong>{formatDateTime(turno.fecha_hora)}</strong>
            </p>
            <div className="space-y-2">
              <Label>Quirófano</Label>
              <Select value={selectedQuirofano} onChange={(e) => setSelectedQuirofano(e.target.value)}>
                <option value="">Seleccionar quirófano...</option>
                {quirofanos.map((q) => (
                  <option key={q.id} value={q.id}>{q.nombre}</option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleConfirm}
              disabled={!selectedQuirofano || actionLoading}
            >
              {actionLoading ? "Confirmando..." : "Confirmar Turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
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
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!motivoRechazo.trim() || actionLoading}
            >
              {actionLoading ? "Rechazando..." : "Rechazar Turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent onClose={() => setEditDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Editar Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={editForm.hora}
                  onChange={(e) => setEditForm({ ...editForm, hora: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Horas</Label>
                <Select
                  value={editForm.duracion_horas}
                  onChange={(e) => setEditForm({ ...editForm, duracion_horas: e.target.value })}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                    <option key={h} value={h}>{h}h</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minutos</Label>
                <Select
                  value={editForm.duracion_minutos}
                  onChange={(e) => setEditForm({ ...editForm, duracion_minutos: e.target.value })}
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{m}min</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={actionLoading}>
              {actionLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
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
