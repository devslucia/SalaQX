"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CardTable, type CardTableColumn } from "@/components/ui/card-table";
import { SkeletonList } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Power, Building2 } from "lucide-react";
import type { Quirofano } from "@/lib/types";
import { QUIROFANO_COLOR_PALETTE } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

export default function QuirofanosPage() {
  const { user } = useAuth();
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quirofano | null>(null);
  const [form, setForm] = useState({ nombre: "" });
  const [error, setError] = useState("");
  const [pendingToggle, setPendingToggle] = useState<Quirofano | null>(null);
  const supabase = createClient();

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("quirofanos").select("*").order("nombre");
    if (data) setQuirofanos(data);
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: "" });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (q: Quirofano) => {
    setEditing(q);
    setForm({ nombre: q.nombre });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    try {
      if (editing) {
        const { error } = await supabase.from("quirofanos").update({ nombre: form.nombre }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Quirófano actualizado");
      } else {
        const nextColor =
          QUIROFANO_COLOR_PALETTE[
            quirofanos.length % QUIROFANO_COLOR_PALETTE.length
          ];
        const { error } = await supabase
          .from("quirofanos")
          .insert({ nombre: form.nombre, color: nextColor });
        if (error) throw error;
        toast.success("Quirófano creado", { description: form.nombre });
      }
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
  };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const q = pendingToggle;
    setPendingToggle(null);
    const { error } = await supabase.from("quirofanos").update({ activo: !q.activo }).eq("id", q.id);
    if (error) { toast.error("Error"); return; }
    toast.success(q.activo ? "Quirófano desactivado" : "Quirófano activado");
    fetchData();
  };

  if (!user || !["admin", "encargada"].includes(user.rol)) {
    return <Alert variant="destructive"><AlertDescription>No tenés acceso</AlertDescription></Alert>;
  }

  const columns: CardTableColumn<Quirofano>[] = [
    {
      key: "quirofano",
      label: "Quirófano",
      primary: true,
      render: (q) => (
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-card shadow-sm"
            style={{ backgroundColor: q.color }}
            aria-hidden
          />
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 size={16} />
          </div>
          <span className="font-medium">{q.nombre}</span>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      render: (q) => (
        <Badge variant={q.activo ? "success" : "secondary"}>
          {q.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "right",
      render: (q) => (
        <div className="inline-flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(q)} title="Editar">
            <Pencil size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPendingToggle(q)}
            title={q.activo ? "Desactivar" : "Activar"}
          >
            <Power size={16} className={q.activo ? "text-destructive" : "text-success"} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Quirófanos"
        description="Gestioná los quirófanos disponibles para asignar a las cirugías"
        actions={
          <Button onClick={openCreate} size="lg">
            <Plus size={16} />
            Crear Quirófano
          </Button>
        }
      />

      <CardTable
        columns={columns}
        data={quirofanos}
        keyOf={(q) => q.id}
        loading={loading}
        skeleton={<SkeletonList rows={4} />}
        emptyState={
          <EmptyState
            icon={Building2}
            title="Sin quirófanos"
            description="Aún no hay quirófanos registrados. Creá el primero para empezar"
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Crear el primero
              </Button>
            }
          />
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {(onClose) => (
          <DialogContent onClose={() => { onClose(false); setDialogOpen(false); }}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Quirófano" : "Nuevo Quirófano"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label>Nombre / Número</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Quirófano 1"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? "Guardar" : "Crear Quirófano"}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={pendingToggle !== null}
        onOpenChange={(o) => { if (!o) setPendingToggle(null); }}
        title={pendingToggle?.activo ? "¿Desactivar este quirófano?" : "¿Activar este quirófano?"}
        description={
          pendingToggle?.activo
            ? `${pendingToggle.nombre} dejará de estar disponible para asignar a nuevos turnos.`
            : `${pendingToggle?.nombre} volverá a estar disponible para nuevos turnos.`
        }
        confirmText={pendingToggle?.activo ? "Desactivar" : "Activar"}
        variant={pendingToggle?.activo ? "warning" : "info"}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
