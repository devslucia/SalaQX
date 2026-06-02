"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Power, Search, Users as UsersIcon, Mail, Phone } from "lucide-react";
import type { User, Rol } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

const ROL_BADGE: Record<Rol, { label: string; class: string }> = {
  admin: { label: "Admin", class: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  encargada: { label: "Encargada", class: "bg-primary/10 text-primary border-primary/20" },
  medico: { label: "Médico", class: "bg-success/10 text-success border-success/20" },
};

export default function UsuariosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", rol: "medico" as Rol, telefono: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ nombre: "", email: "", rol: "medico", telefono: "", password: "" });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, telefono: u.telefono || "", password: "" });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");
    if (!form.nombre || !form.email) {
      setError("Nombre y email son obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        const res = await fetch("/api/usuarios", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingUser.id,
            nombre: form.nombre,
            email: form.email,
            rol: form.rol,
            telefono: form.telefono || null,
            activo: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al actualizar");
        toast.success("Usuario actualizado");
      } else {
        if (!form.password || form.password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres");
        }
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            email: form.email,
            password: form.password,
            rol: form.rol,
            telefono: form.telefono || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al crear");
        toast.success("Usuario creado", { description: form.email });
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
      toast.error("Error", { description: e.message });
    }
    setSubmitting(false);
  };

  const toggleActive = async (u: User) => {
    const { error } = await supabase.from("users").update({ activo: !u.activo }).eq("id", u.id);
    if (error) { toast.error("Error al cambiar estado"); return; }
    toast.success(u.activo ? "Usuario desactivado" : "Usuario activado");
    fetchUsers();
  };

  if (user?.rol !== "admin") {
    return <Alert variant="destructive"><AlertDescription>No tenés acceso a esta sección</AlertDescription></Alert>;
  }

  const filteredUsers = users.filter((u) =>
    !busqueda ||
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={UsersIcon}
        title="Usuarios"
        description="Gestioná los usuarios con acceso al sistema"
        actions={
          <Button onClick={openCreate} size="lg">
            <Plus size={16} />
            Crear Usuario
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          className="pl-9"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState label="Cargando usuarios..." />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Sin usuarios"
          description="Aún no hay usuarios registrados en el sistema"
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              Crear el primero
            </Button>
          }
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description={`No se encontraron usuarios con "${busqueda}"`}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {u.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{u.nombre}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Mail size={12} />
                          {u.email}
                        </p>
                        {u.telefono && (
                          <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                            <Phone size={12} />
                            {u.telefono}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROL_BADGE[u.rol].class}>{ROL_BADGE[u.rol].label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.activo ? "success" : "secondary"}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar">
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(u)}
                          title={u.activo ? "Desactivar" : "Activar"}
                        >
                          <Power size={16} className={u.activo ? "text-destructive" : "text-success"} />
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
            <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@hospital.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
                  <option value="admin">Admin</option>
                  <option value="encargada">Encargada</option>
                  <option value="medico">Médico</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? "Guardando..." : editingUser ? "Guardar" : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
