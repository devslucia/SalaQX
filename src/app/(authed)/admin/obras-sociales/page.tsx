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
import { Plus, Pencil, Power, Heart, Search, Building2 } from "lucide-react";
import type { ObraSocial } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export default function ObrasSocialesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ObraSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ObraSocial | null>(null);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("obras_sociales").select("*").order("nombre");
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setNombre(""); setError(""); setDialogOpen(true); };
  const openEdit = (i: ObraSocial) => { setEditing(i); setNombre(i.nombre); setError(""); setDialogOpen(true); };

  const handleSave = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    try {
      if (editing) {
        const { error } = await supabase.from("obras_sociales").update({ nombre }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Obra social actualizada");
      } else {
        const { error } = await supabase.from("obras_sociales").insert({ nombre });
        if (error) throw error;
        toast.success("Obra social creada", { description: nombre });
      }
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      setError(e.message);
      toast.error("Error", { description: e.message });
    }
  };

  const toggleActive = async (i: ObraSocial) => {
    const { error } = await supabase.from("obras_sociales").update({ activo: !i.activo }).eq("id", i.id);
    if (error) { toast.error("Error al cambiar estado"); return; }
    toast.success(i.activo ? "Obra social desactivada" : "Obra social activada");
    fetchData();
  };

  if (!user || !["admin", "encargada"].includes(user.rol)) {
    return <Alert variant="destructive"><AlertDescription>No tenés acceso</AlertDescription></Alert>;
  }

  const filteredItems = items.filter((i) =>
    !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Heart}
        title="Obras Sociales"
        description="Gestioná las obras sociales disponibles en el sistema para asignar a los turnos."
        actions={
          <Button onClick={openCreate} size="lg">
            <Plus size={18} />
            Crear Obra Social
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar obra social..."
          className="pl-9 h-10"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState label="Cargando obras sociales..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin obras sociales"
          description="Creá la primera obra social con el botón + Crear para empezar a gestionar las disponibles en el sistema."
          action={
            <Button onClick={openCreate} size="lg">
              <Plus size={18} />
              Crear la primera
            </Button>
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description={`No se encontraron obras sociales con "${busqueda}"`}
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
                {filteredItems.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Heart size={16} />
                        </div>
                        <span>{i.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.activo ? "success" : "secondary"}>
                        {i.activo ? "Activa" : "Inactiva"}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Obra Social" : "Nueva Obra Social"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: OSDE, Swiss Medical..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Guardar Cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
