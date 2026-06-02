"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, cn } from "@/lib/utils";
import { ESTADO_BORDER_COLORS, type EstadoTurno } from "@/lib/types";
import { WeekChart } from "@/components/week-chart";
import { EmptyState, StatusIcons } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Stethoscope,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pendientes: 0, confirmadas: 0, rechazadas: 0, suspendidas: 0 });
  const [recentTurnos, setRecentTurnos] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ day: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        let query = supabase.from("turnos").select("*");

        if (user.rol === "medico") {
          query = query.eq("medico_id", user.id);
        }

        const { data: turnos, error } = await query;

        if (error) throw error;

        if (turnos) {
          setStats({
            total: turnos.length,
            pendientes: turnos.filter((t) => t.estado === "pendiente").length,
            confirmadas: turnos.filter((t) => t.estado === "confirmada").length,
            rechazadas: turnos.filter((t) => t.estado === "rechazada").length,
            suspendidas: turnos.filter((t) => t.estado === "suspendida").length,
          });

          const recent = [...turnos]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);

          const enriched = await Promise.all(
            recent.map(async (t) => {
              const { data: medico } = await supabase
                .from("users")
                .select("nombre")
                .eq("id", t.medico_id)
                .single();
              return { ...t, medico_nombre: medico?.nombre || "—" };
            })
          );
          setRecentTurnos(enriched);

          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
          const chartData = days.map((day) => {
            const dayStr = format(day, "EEE", { locale: es });
            const count = turnos.filter((t) => {
              const fh = new Date(t.fecha_hora);
              return fh.toDateString() === day.toDateString() && t.estado === "confirmada";
            }).length;
            return { day: dayStr.charAt(0).toUpperCase() + dayStr.slice(1), count };
          });
          setWeekData(chartData);
        }
      } catch (e: any) {
        toast.error("Error al cargar datos", { description: e.message });
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (!user) return null;

  const statCards = [
    { label: "Total Turnos", value: stats.total, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pendientes", value: stats.pendientes, icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
    { label: "Confirmadas", value: stats.confirmadas, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Rechazadas", value: stats.rechazadas, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={`Bienvenido de vuelta, ${user.nombre.split(" ")[0]}. Acá tenés el resumen del sistema.`}
      />

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold tracking-tight mt-2">{card.value}</p>
                  </div>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", card.bg)}>
                    <Icon size={18} className={card.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart + Recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Cirugías esta semana
              </CardTitle>
              <CardDescription>Cirugías confirmadas por día</CardDescription>
            </div>
            <Badge variant="outline" className="font-normal">
              {weekData.reduce((acc, d) => acc + d.count, 0)} totales
            </Badge>
          </CardHeader>
          <CardContent>
            <WeekChart data={weekData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Turnos Recientes</CardTitle>
            <Link
              href="/turnos"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <LoadingState label="Cargando turnos..." minHeight="min-h-[220px]" />
            ) : recentTurnos.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sin turnos aún"
                description="No hay turnos registrados todavía"
              />
            ) : (
              recentTurnos.map((turno) => {
                const Icon = StatusIcons[turno.estado as EstadoTurno] || Calendar;
                return (
                  <Link
                    key={turno.id}
                    href={`/turnos/${turno.id}`}
                    className={cn(
                      "block rounded-lg border border-l-4 bg-card p-3 hover:bg-muted/50 transition-colors",
                      ESTADO_BORDER_COLORS[turno.estado as EstadoTurno]
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{turno.paciente_nombre}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {turno.tipo_cirugia}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock size={10} />
                          {formatDateTime(turno.fecha_hora)}
                        </p>
                      </div>
                      <Icon
                        size={16}
                        className={cn(
                          turno.estado === "confirmada" && "text-success",
                          turno.estado === "pendiente" && "text-warning",
                          turno.estado === "rechazada" && "text-destructive",
                          (turno.estado === "suspendida" || turno.estado === "eliminada") && "text-muted-foreground"
                        )}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick action card for medicos */}
      {user.rol === "medico" && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <p className="font-semibold">¿Necesitás un nuevo turno?</p>
                  <p className="text-sm text-muted-foreground">
                    Solicitá un turno de quirófano en pocos pasos
                  </p>
                </div>
              </div>
              <Link href="/solicitar-turno">
                <Button>
                  Solicitar Turno
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
