"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Power, Building2 } from "lucide-react";
import type { Quirofano } from "@/lib/types";
import { QUIROFANO_COLOR_PALETTE } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export default function QuirofanosPage() {
  const { user } = useAuth();
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quirofano | null>(null);
  const [form, setForm] = useState({ nombre: "" });
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("quirofanos").select("*").order("nombre");
    if (data) setQuirofanos(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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

  const toggleActive = async (q: Quirofano) => {
    const { error } = await supabase.from("quirofanos").update({ activo: !q.activo }).eq("id", q.id);
    if (error) { toast.error("Error"); return; }
    toast.success(q.activo ? "Quirófano desactivado" : "Quirófano activado");
    fetchData();
  };

  if (!user || !["admin", "encargada"].includes(user.rol)) {
    return <Alert variant="destructive"><AlertDescription>No tenés acceso</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-8">
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

      {loading ? (
        <LoadingState label="Cargando quirófanos..." />
      ) : quirofanos.length === 0 ? (
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quirófano</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quirofanos.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                          style={{ backgroundColor: q.color }}
                          aria-hidden
                        />
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 size={16} />
                        </div>
                        <span>{q.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={q.activo ? "success" : "secondary"}>
                        {q.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(q)} title="Editar">
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(q)}
                          title={q.activo ? "Desactivar" : "Activar"}
                        >
                          <Power size={16} className={q.activo ? "text-destructive" : "text-success"} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
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
      </Dialog>
    </div>
  );
}
