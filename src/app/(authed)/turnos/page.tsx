"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ESTADO_BORDER_COLORS,
  type Turno,
  type EstadoTurno,
} from "@/lib/types";
import { formatDateTime, cn } from "@/lib/utils";
import { Calendar, Filter, Search, User, Building2, CalendarPlus, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusIcons } from "@/components/empty-state";

const estadoVariant: Record<EstadoTurno, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  pendiente: "warning",
  confirmada: "success",
  rechazada: "destructive",
  suspendida: "secondary",
  eliminada: "secondary",
};

export default function TurnosPage() {
  const { user } = useAuth();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
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
            const [medicoRes, osRes, taRes, qRes] = await Promise.all([
              supabase.from("users").select("nombre,telefono").eq("id", t.medico_id).single(),
              supabase.from("obras_sociales").select("nombre").eq("id", t.obra_social_id).single(),
              supabase.from("tipos_anestesia").select("nombre").eq("id", t.tipo_anestesia_id).single(),
              t.quirofano_id
                ? supabase.from("quirofanos").select("nombre").eq("id", t.quirofano_id).single()
                : { data: null },
            ]);
            return {
              ...t,
              medico_nombre: medicoRes.data?.nombre || "—",
              medico_telefono: medicoRes.data?.telefono,
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
    const matchesEstado = filtroEstado === "todos" || t.estado === filtroEstado;
    const matchesBusqueda =
      !busqueda ||
      t.paciente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.paciente_dni.includes(busqueda) ||
      t.tipo_cirugia.toLowerCase().includes(busqueda.toLowerCase());
    return matchesEstado && matchesBusqueda;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Calendar}
        title="Turnos"
        description={user?.rol === "medico" ? "Tus cirugías programadas" : "Todas las cirugías del sistema"}
        actions={
          user?.rol === "medico" ? (
            <Link href="/solicitar-turno">
              <Button size="lg">
                <CalendarPlus size={16} />
                Solicitar Turno
              </Button>
            </Link>
          ) : undefined
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
            <option value="pendiente">Pendientes</option>
            <option value="confirmada">Confirmadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="suspendida">Suspendidas</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Cargando turnos..." />
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
          {filteredTurnos.map((t) => {
            const Icon = StatusIcons[t.estado] || Calendar;
            return (
              <Link key={t.id} href={`/turnos/${t.id}`} className="block group">
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
                      <Badge variant={estadoVariant[t.estado]} className="capitalize">
                        {t.estado}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
