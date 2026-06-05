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
import { Plus, Pencil, Power, Syringe } from "lucide-react";
import type { TipoAnestesia } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

export default function AnestesiaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<TipoAnestesia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipoAnestesia | null>(null);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [pendingToggle, setPendingToggle] = useState<TipoAnestesia | null>(null);
  const supabase = createClient();

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("tipos_anestesia").select("*").order("nombre");
    if (data) setItems(data);
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setNombre(""); setError(""); setDialogOpen(true); };
  const openEdit = (i: TipoAnestesia) => { setEditing(i); setNombre(i.nombre); setError(""); setDialogOpen(true); };

  const handleSave = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    try {
      if (editing) {
        const { error } = await supabase.from("tipos_anestesia").update({ nombre }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Tipo de anestesia actualizado");
      } else {
        const { error } = await supabase.from("tipos_anestesia").insert({ nombre });
        if (error) throw error;
        toast.success("Tipo de anestesia creado", { description: nombre });
      }
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
  };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const i = pendingToggle;
    setPendingToggle(null);
    await supabase.from("tipos_anestesia").update({ activo: !i.activo }).eq("id", i.id);
    toast.success(i.activo ? "Desactivado" : "Activado");
    fetchData();
  };

  if (!user || !["admin", "encargada"].includes(user.rol)) {
    return <Alert variant="destructive"><AlertDescription>No tenés acceso</AlertDescription></Alert>;
  }

  const columns: CardTableColumn<TipoAnestesia>[] = [
    {
      key: "nombre",
      label: "Nombre",
      primary: true,
      render: (i) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Syringe size={16} />
          </div>
          <span className="font-medium">{i.nombre}</span>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      render: (i) => (
        <Badge variant={i.activo ? "success" : "secondary"}>
          {i.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "right",
      render: (i) => (
        <div className="inline-flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(i)} title="Editar">
            <Pencil size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPendingToggle(i)}
            title={i.activo ? "Desactivar" : "Activar"}
          >
            <Power size={16} className={i.activo ? "text-destructive" : "text-success"} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Syringe}
        title="Tipos de Anestesia"
        description="Gestioná los tipos de anestesia disponibles para las cirugías"
        actions={
          <Button onClick={openCreate} size="lg">
            <Plus size={16} />
            Crear Tipo
          </Button>
        }
      />

      <CardTable
        columns={columns}
        data={items}
        keyOf={(i) => i.id}
        loading={loading}
        skeleton={<SkeletonList rows={4} />}
        emptyState={
          <EmptyState
            icon={Syringe}
            title="Sin tipos de anestesia"
            description="Aún no hay tipos de anestesia registrados"
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
              <DialogTitle>{editing ? "Editar Tipo de Anestesia" : "Nuevo Tipo de Anestesia"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: General, Regional, Local..."
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={pendingToggle !== null}
        onOpenChange={(o) => { if (!o) setPendingToggle(null); }}
        title={pendingToggle?.activo ? "¿Desactivar este tipo de anestesia?" : "¿Activar este tipo de anestesia?"}
        description={
          pendingToggle?.activo
            ? `${pendingToggle.nombre} no estará disponible al solicitar nuevos turnos.`
            : `${pendingToggle?.nombre} volverá a estar disponible al solicitar turnos.`
        }
        confirmText={pendingToggle?.activo ? "Desactivar" : "Activar"}
        variant={pendingToggle?.activo ? "warning" : "info"}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
