"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Trash2, Plus, Building2, Calendar } from "lucide-react";
import { DIAS_SEMANA, type DiaSemana, type Quirofano, type HorarioHabilitado } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function HorariosPage() {
  const { user } = useAuth();
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [horarios, setHorarios] = useState<HorarioHabilitado[]>([]);
  const [selectedQuirofano, setSelectedQuirofano] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ dia: "1", hora_inicio: "08:00", hora_fin: "17:00" });
  const [pendingDelete, setPendingDelete] = useState<HorarioHabilitado | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const [qRes, hRes] = await Promise.all([
      supabase.from("quirofanos").select("*").eq("activo", true).order("nombre"),
      supabase.from("horarios_habilitados").select("*"),
    ]);
    if (qRes.data) setQuirofanos(qRes.data);
    if (hRes.data) setHorarios(hRes.data);
    setLoading(false);
  };

  React.useEffect(() => { fetchData(); }, []);

  const filteredHorarios = horarios.filter((h) => h.quirofano_id === selectedQuirofano);

  const handleAdd = async () => {
    if (!selectedQuirofano) return;
    try {
      const exists = filteredHorarios.find((h) => h.dia === parseInt(form.dia));
      if (exists) {
        const { error } = await supabase.from("horarios_habilitados").update({ hora_inicio: form.hora_inicio, hora_fin: form.hora_fin }).eq("id", exists.id);
        if (error) throw error;
        toast.success("Horario actualizado");
      } else {
        const { error } = await supabase.from("horarios_habilitados").insert({
          quirofano_id: selectedQuirofano,
          dia: parseInt(form.dia),
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin,
        });
        if (error) throw error;
        toast.success("Horario agregado");
      }
      fetchData();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const h = pendingDelete;
    setPendingDelete(null);
    await supabase.from("horarios_habilitados").delete().eq("id", h.id);
    toast.success("Horario eliminado");
    fetchData();
  };

  if (!user || !["admin", "encargada"].includes(user.rol)) {
    return <Alert variant="destructive"><AlertDescription>No tenés acceso</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Clock}
        title="Horarios Habilitados"
        description="Configurá los horarios disponibles para cada quirófano"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            Seleccionar Quirófano
          </CardTitle>
          <CardDescription>Elegí un quirófano para ver y editar sus horarios</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedQuirofano} onChange={(e) => setSelectedQuirofano(e.target.value)}>
            <option value="">Seleccionar quirófano...</option>
            {quirofanos.map((q) => (
              <option key={q.id} value={q.id}>{q.nombre}</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {selectedQuirofano && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus size={16} className="text-primary" />
                Agregar / Actualizar Horario
              </CardTitle>
              <CardDescription>
                Si el día ya tiene un horario, se actualizará. Si no, se creará.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Día</Label>
                  <Select value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })}>
                    {(Object.entries(DIAS_SEMANA) as [string, string][]).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Hora Inicio</Label>
                  <Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Hora Fin</Label>
                  <Input type="time" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} />
                </div>
                <Button onClick={handleAdd}>
                  <Plus size={16} />
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                Horarios Configurados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonList rows={4} />
              ) : filteredHorarios.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No hay horarios configurados para este quirófano
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {filteredHorarios
                      .sort((a, b) => a.dia - b.dia)
                      .map((h, i) => (
                        <motion.div
                          key={h.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2, delay: i * 0.04 }}
                          className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Clock size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{DIAS_SEMANA[h.dia as DiaSemana]}</p>
                              <p className="text-xs text-muted-foreground font-mono">{h.hora_inicio} — {h.hora_fin}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setPendingDelete(h)} title="Eliminar">
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="¿Eliminar este horario?"
        description={`Se eliminará ${pendingDelete ? DIAS_SEMANA[pendingDelete.dia as DiaSemana] : ""} ${pendingDelete?.hora_inicio}-${pendingDelete?.hora_fin} de este quirófano.`}
        confirmText="Eliminar"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
