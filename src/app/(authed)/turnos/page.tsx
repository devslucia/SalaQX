"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ESTADO_BORDER_COLORS,
  ESTADO_LABELS,
  type Turno,
  type EstadoTurno,
} from "@/lib/types";
import { formatDateTime, cn } from "@/lib/utils";
import { Calendar, Filter, Search, User, Building2, CalendarPlus, SearchX, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusIcons } from "@/components/empty-state";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CargarTurnoManualForm } from "@/components/cargar-turno-manual-form";

const estadoVariant: Record<EstadoTurno, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  pendiente: "warning",
  confirmada: "success",
  rechazada: "destructive",
  suspendida: "secondary",
  eliminada: "secondary",
  solicitud_eliminacion: "default",
  solicitud_reprogramacion: "default",
};

const estadoBadgeClass: Record<EstadoTurno, string> = {
  pendiente: "bg-warning/15 text-warning border-warning/30",
  confirmada: "bg-success/15 text-success border-success/30",
  rechazada: "bg-destructive/15 text-destructive border-destructive/30",
  suspendida: "",
  eliminada: "",
  solicitud_eliminacion: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  solicitud_reprogramacion: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
};

const SOLICITUD_STATES: EstadoTurno[] = ["solicitud_eliminacion", "solicitud_reprogramacion"];

export default function TurnosPage() {
  const { user } = useAuth();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [cargarTurnoOpen, setCargarTurnoOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const fetchTurnos = async () => {
      setLoading(true);
      let query = supabase.from("turnos").select("*");

      if (user.rol === "medico") {
        query = query.eq("medico_id", user.id);
      }

      const { data } = await query.order("fecha_hora", { ascending: false });

      if (data) {
        const enriched = await Promise.all(
          data.map(async (t: any) => {
            const [osRes, taRes, qRes] = await Promise.all([
              supabase.from("obras_sociales").select("nombre").eq("id", t.obra_social_id).single(),
              supabase.from("tipos_anestesia").select("nombre").eq("id", t.tipo_anestesia_id).single(),
              t.quirofano_id
                ? supabase.from("quirofanos").select("nombre").eq("id", t.quirofano_id).single()
                : { data: null },
            ]);

            // Para médicos externos (medico_id = null), usar datos del turno
            let medicoNombre = "—";
            let medicoTelefono = null;
            if (t.medico_id) {
              const { data: medicoData } = await supabase
                .from("users")
                .select("nombre,telefono")
                .eq("id", t.medico_id)
                .single();
              medicoNombre = medicoData?.nombre || "—";
              medicoTelefono = medicoData?.telefono;
            } else if (t.medico_nombre) {
              medicoNombre = t.medico_nombre;
              medicoTelefono = t.medico_celular;
            }

            return {
              ...t,
              medico_nombre: medicoNombre,
              medico_telefono: medicoTelefono,
              obra_social: osRes.data,
              tipo_anestesia: taRes.data,
              quirofano: qRes.data,
            };
          })
        );
        setTurnos(enriched);
      }
      setLoading(false);
    };

    fetchTurnos();
  }, [user]);

  const filteredTurnos = turnos.filter((t) => {
    const matchesEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "solicitudes" && SOLICITUD_STATES.includes(t.estado)) ||
      t.estado === filtroEstado;
    const matchesBusqueda =
      !busqueda ||
      t.paciente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.paciente_dni.includes(busqueda) ||
      t.tipo_cirugia.toLowerCase().includes(busqueda.toLowerCase());
    return matchesEstado && matchesBusqueda;
  });

  const isReviewer = user && ["admin", "encargada"].includes(user.rol);
  const solicitudesCount = turnos.filter((t) => SOLICITUD_STATES.includes(t.estado)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calendar}
        title="Turnos"
        description={user?.rol === "medico" ? "Tus cirugías programadas" : "Todas las cirugías del sistema"}
        actions={
          <div className="flex items-center gap-2">
            {isReviewer && (
              <Button size="lg" onClick={() => setCargarTurnoOpen(true)}>
                <Plus size={16} />
                Cargar Turno
              </Button>
            )}
            {user?.rol === "medico" && (
              <Link href="/solicitar-turno">
                <Button size="lg">
                  <CalendarPlus size={16} />
                  Solicitar Turno
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, DNI o tipo de cirugía..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 sm:w-56">
          <Filter size={16} className="text-muted-foreground shrink-0" />
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {isReviewer && (
              <option value="solicitudes">
                Solicitudes pendientes{solicitudesCount > 0 ? ` (${solicitudesCount})` : ""}
              </option>
            )}
            <option value="pendiente">Pendientes</option>
            <option value="confirmada">Confirmadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="suspendida">Suspendidas</option>
          </Select>
        </div>
      </div>

      {isReviewer && solicitudesCount > 0 && filtroEstado !== "solicitudes" && (
        <button
          type="button"
          onClick={() => setFiltroEstado("solicitudes")}
          className="flex items-center gap-3 w-full text-left rounded-lg border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors p-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 shrink-0">
            <Inbox size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              Tenés {solicitudesCount} solicitud{solicitudesCount === 1 ? "" : "es"} pendiente{solicitudesCount === 1 ? "" : "s"} de revisión
            </p>
            <p className="text-xs text-muted-foreground">
              Clickeá acá para ver turnos con eliminación o reprogramación solicitada
            </p>
          </div>
        </button>
      )}

      {loading ? (
        <SkeletonGrid items={6} />
      ) : turnos.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Sin turnos registrados"
          description={user?.rol === "medico"
            ? "Aún no solicitaste ningún turno de quirófano"
            : "Aún no se cargaron turnos en el sistema"}
          action={
            user?.rol === "medico" ? (
              <Link href="/solicitar-turno">
                <Button>
                  <CalendarPlus size={16} />
                  Solicitar el primero
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : filteredTurnos.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Sin resultados"
          description="No hay turnos que coincidan con los filtros aplicados"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTurnos.map((t, i) => {
            const Icon = StatusIcons[t.estado] || Calendar;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: i * 0.03, ease: "easeOut" }}
              >
                <Link href={`/turnos/${t.id}`} className="block group">
                  <Card
                    className={cn(
                      "h-full transition-all hover:shadow-md hover:-translate-y-0.5 border-l-4",
                      ESTADO_BORDER_COLORS[t.estado]
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                            {t.paciente_nombre}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            DNI {t.paciente_dni} · {t.paciente_edad} años
                          </p>
                        </div>
                        <Icon
                          size={18}
                          className={cn(
                            "shrink-0",
                            t.estado === "confirmada" && "text-success",
                            t.estado === "pendiente" && "text-warning",
                            t.estado === "rechazada" && "text-destructive",
                            (t.estado === "suspendida" || t.estado === "eliminada") && "text-muted-foreground"
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-sm font-medium truncate">{t.tipo_cirugia}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <User size={12} />
                          {t.medico_nombre}
                        </p>
                        {t.quirofano && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Building2 size={12} />
                            {t.quirofano.nombre}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(t.fecha_hora)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {t.cargado_por_rol && t.cargado_por_rol !== "medico" && (
                            <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                              Manual
                            </Badge>
                          )}
                          <Badge
                            variant={estadoVariant[t.estado]}
                            className={cn("border", estadoBadgeClass[t.estado])}
                          >
                            {ESTADO_LABELS[t.estado] ?? t.estado}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialog para carga manual de turno */}
      <Dialog open={cargarTurnoOpen} onOpenChange={setCargarTurnoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargar Turno Manual</DialogTitle>
            <DialogDescription>
              El turno quedará confirmado directamente con quirófano asignado
            </DialogDescription>
          </DialogHeader>
          <CargarTurnoManualForm
            onSuccess={() => {
              setCargarTurnoOpen(false);
              // Recargar turnos
              window.location.reload();
            }}
            onCancel={() => setCargarTurnoOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
