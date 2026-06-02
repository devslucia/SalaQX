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
import { Plus, Pencil, Power, Syringe } from "lucide-react";
import type { TipoAnestesia } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export default function AnestesiaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<TipoAnestesia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipoAnestesia | null>(null);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("tipos_anestesia").select("*").order("nombre");
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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

  const toggleActive = async (i: TipoAnestesia) => {
    await supabase.from("tipos_anestesia").update({ activo: !i.activo }).eq("id", i.id);
    toast.success(i.activo ? "Desactivado" : "Activado");
    fetchData();
  };

  if (!user || !["admin", "encargada"].includes(user.rol)) {
    return <Alert variant="destructive"><AlertDescription>No tenés acceso</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-8">
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

      {loading ? (
        <LoadingState label="Cargando tipos de anestesia..." />
      ) : items.length === 0 ? (
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={i.activo ? "success" : "secondary"}>
                        {i.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(i)} title="Editar">
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(i)}
                          title={i.activo ? "Desactivar" : "Activar"}
                        >
                          <Power size={16} className={i.activo ? "text-destructive" : "text-success"} />
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
      </Dialog>
    </div>
  );
}
