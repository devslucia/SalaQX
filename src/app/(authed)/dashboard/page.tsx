"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { WeekChart } from "@/components/week-chart";
import { EmptyState, StatusIcons } from "@/components/empty-state";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PauseCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Stethoscope,
  LayoutDashboard,
  Sparkles,
  Activity,
  CalendarCheck,
  Inbox,
  Sun,
  Moon,
} from "lucide-react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addDays, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { ESTADO_BORDER_COLORS, ESTADO_LABELS, type EstadoTurno, type Turno } from "@/lib/types";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface DashboardStats {
  totalMes: number;
  confirmadas: number;
  pendientes: number;
  rechazadas: number;
  suspendidas: number;
  cirugiasHoy: number;
  cirugiasManana: number;
  solicitudesPendientes: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats>({
    totalMes: 0,
    confirmadas: 0,
    pendientes: 0,
    rechazadas: 0,
    suspendidas: 0,
    cirugiasHoy: 0,
    cirugiasManana: 0,
    solicitudesPendientes: 0,
  });
  const [proximas, setProximas] = React.useState<Turno[]>([]);
  const [solicitudes, setSolicitudes] = React.useState<Turno[]>([]);
  const [weekData, setWeekData] = React.useState<{ day: string; count: number }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [trends, setTrends] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = addDays(hoy, 1);
        const finManana = new Date(manana);
        finManana.setHours(23, 59, 59, 999);

        let q = supabase.from("turnos").select("*");
        if (user.rol === "medico") q = q.eq("medico_id", user.id);
        const { data: turnos, error } = await q;
        if (error) throw error;

        if (turnos) {
          const enMes = turnos.filter((t) => {
            const fh = new Date(t.fecha_hora);
            return fh >= inicioMes && fh <= finMes;
          });
          const statsNew: DashboardStats = {
            totalMes: enMes.length,
            confirmadas: enMes.filter((t) => t.estado === "confirmada").length,
            pendientes: enMes.filter((t) => t.estado === "pendiente").length,
            rechazadas: enMes.filter((t) => t.estado === "rechazada").length,
            suspendidas: enMes.filter((t) => t.estado === "suspendida").length,
            cirugiasHoy: turnos.filter((t) => {
              const fh = new Date(t.fecha_hora);
              return fh >= hoy && fh < addDays(hoy, 1) && t.estado === "confirmada";
            }).length,
            cirugiasManana: turnos.filter((t) => {
              const fh = new Date(t.fecha_hora);
              return fh >= manana && fh <= finManana && t.estado === "confirmada";
            }).length,
            solicitudesPendientes: turnos.filter(
              (t) => t.estado === "solicitud_eliminacion" || t.estado === "solicitud_reprogramacion",
            ).length,
          };
          setStats(statsNew);

          const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const finMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          const mesAnteriorTotal = turnos.filter((t) => {
            const fh = new Date(t.fecha_hora);
            return fh >= mesAnterior && fh <= finMesAnterior;
          }).length;
          setTrends({
            total:
              mesAnteriorTotal > 0
                ? Math.round(((statsNew.totalMes - mesAnteriorTotal) / mesAnteriorTotal) * 100)
                : 0,
          });

          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
          const chartData = days.map((day) => {
            const dayStr = format(day, "EEE", { locale: es });
            const count = turnos.filter((t) => {
              const fh = new Date(t.fecha_hora);
              return (
                fh.toDateString() === day.toDateString() && t.estado === "confirmada"
              );
            }).length;
            return { day: dayStr.charAt(0).toUpperCase() + dayStr.slice(1), count };
          });
          setWeekData(chartData);

          const ahora = new Date();
          const prox = turnos
            .filter((t) => {
              const fh = new Date(t.fecha_hora);
              return fh >= ahora && t.estado === "confirmada";
            })
            .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
            .slice(0, 5);
          const proxEnriched = await Promise.all(
            prox.map(async (t) => {
              const { data: qData } = await supabase
                .from("quirofanos")
                .select("nombre, color")
                .eq("id", t.quirofano_id)
                .maybeSingle();
              return { ...t, quirofano: qData ?? undefined };
            }),
          );
          setProximas(proxEnriched as Turno[]);

          const sols = turnos
            .filter((t) => t.estado === "solicitud_eliminacion" || t.estado === "solicitud_reprogramacion")
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
          const solsEnriched = await Promise.all(
            sols.map(async (t) => {
              const [medicoRes, qRes] = await Promise.all([
                supabase.from("users").select("nombre").eq("id", t.medico_id).maybeSingle(),
                t.quirofano_id
                  ? supabase.from("quirofanos").select("nombre, color").eq("id", t.quirofano_id).maybeSingle()
                  : Promise.resolve({ data: null }),
              ]);
              return {
                ...t,
                medico_nombre: medicoRes.data?.nombre,
                quirofano: qRes.data ?? undefined,
              };
            }),
          );
          setSolicitudes(solsEnriched as Turno[]);
        }
      } catch (e) {
        console.error("[Dashboard] error:", e);
      }
      setLoading(false);
    };
    void fetchData();
  }, [user]);

  if (!user) return null;

  const isReviewer = ["admin", "encargada"].includes(user.rol);

  const statCards = [
    {
      label: "Total del mes",
      value: stats.totalMes,
      sub: `vs. mes anterior`,
      trend: trends.total,
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
      ring: "ring-primary/20",
    },
    {
      label: "Confirmadas",
      value: stats.confirmadas,
      sub: `${stats.totalMes > 0 ? Math.round((stats.confirmadas / stats.totalMes) * 100) : 0}% del mes`,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
      ring: "ring-success/20",
    },
    {
      label: "Pendientes",
      value: stats.pendientes,
      sub: stats.pendientes > 0 ? "Requieren revisión" : "Al día",
      icon: AlertCircle,
      color: "text-warning",
      bg: "bg-warning/10",
      ring: "ring-warning/20",
    },
    {
      label: "Suspendidas",
      value: stats.suspendidas,
      sub: stats.suspendidas > 0 ? "Revisar causa" : "Sin suspensiones",
      icon: PauseCircle,
      color: "text-muted-foreground",
      bg: "bg-muted",
      ring: "ring-border",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={`Bienvenido de vuelta, ${user.nombre.split(" ")[0]}. Acá tenés el resumen del sistema.`}
        badge={
          <Badge variant="outline" className="font-normal text-xs">
            <Activity size={12} className="mr-1" />
            {isReviewer ? "Vista global" : "Mis turnos"}
          </Badge>
        }
      />

      {/* Hero metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card, idx) => {
              const Icon = card.icon;
              const trend = card.trend;
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04, ease: "easeOut" }}
                >
                  <Card interactive>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {card.label}
                        </p>
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
                            card.bg,
                            card.color,
                            card.ring,
                          )}
                        >
                          <Icon size={18} />
                        </div>
                      </div>
                      <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {typeof trend === "number" && trend !== 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 font-semibold",
                              trend > 0 ? "text-success" : "text-destructive",
                            )}
                          >
                            {trend > 0 ? (
                              <TrendingUp size={11} />
                            ) : (
                              <TrendingDown size={11} />
                            )}
                            {Math.abs(trend)}%
                          </span>
                        )}
                        <span>{card.sub}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {/* Today & Tomorrow highlight */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="overflow-hidden bg-gradient-to-br from-info/8 via-card to-primary/5 border-info/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-warning to-warning/70 text-warning-foreground shadow-md">
                  <Sun size={26} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cirugías hoy
                  </p>
                  <p className="text-3xl font-bold tracking-tight mt-0.5">
                    {stats.cirugiasHoy}
                  </p>
                </div>
                <Link
                  href="/calendario"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Ver <ArrowRight size={12} />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card className="overflow-hidden bg-gradient-to-br from-primary/8 via-card to-info/5 border-primary/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-md">
                  <Moon size={26} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cirugías mañana
                  </p>
                  <p className="text-3xl font-bold tracking-tight mt-0.5">
                    {stats.cirugiasManana}
                  </p>
                </div>
                <Link
                  href="/calendario"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Ver <ArrowRight size={12} />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Chart + Solicitudes */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp size={16} />
                </div>
                Cirugías esta semana
              </CardTitle>
              <CardDescription>Cirugías confirmadas por día</CardDescription>
            </div>
            {!loading && (
              <Badge variant="outline" className="font-semibold">
                {weekData.reduce((acc, d) => acc + d.count, 0)} totales
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonChart />
            ) : (
              <WeekChart data={weekData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Inbox size={16} />
              </div>
              Solicitudes pendientes
              {!loading && stats.solicitudesPendientes > 0 && (
                <Badge variant="warning" className="ml-auto text-[10px]">
                  {stats.solicitudesPendientes}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Reprogramaciones y eliminaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <SkeletonList rows={3} />
            ) : solicitudes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
                <CheckCircle2 size={28} className="text-success mb-2" />
                <p className="text-sm font-medium">Sin solicitudes</p>
                <p className="text-xs">Todo al día</p>
              </div>
            ) : (
              solicitudes.map((s) => {
                const Icon = StatusIcons[s.estado as EstadoTurno] || AlertCircle;
                return (
                  <Link
                    key={s.id}
                    href={`/turnos/${s.id}`}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-l-4 p-3 hover:bg-muted/50 transition-colors",
                      s.estado === "solicitud_eliminacion"
                        ? "border-l-orange-500"
                        : "border-l-violet-500",
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        "shrink-0 mt-0.5",
                        s.estado === "solicitud_eliminacion"
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-violet-600 dark:text-violet-400",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {s.paciente_nombre}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.medico_nombre} · {ESTADO_LABELS[s.estado]}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximas cirugías */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                <CalendarCheck size={16} />
              </div>
              Próximas cirugías
            </CardTitle>
            <CardDescription>Las próximas 5 cirugías confirmadas</CardDescription>
          </div>
          <Link
            href="/calendario"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Ver calendario <ArrowRight size={12} />
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonList rows={3} />
          ) : proximas.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Sin cirugías próximas"
              description="No hay cirugías confirmadas para los próximos días"
            />
          ) : (
            <div className="space-y-2">
              {proximas.map((t) => {
                const fh = new Date(t.fecha_hora);
                const dayLabel = isToday(fh)
                  ? "Hoy"
                  : isTomorrow(fh)
                    ? "Mañana"
                    : format(fh, "EEE d", { locale: es });
                return (
                  <Link
                    key={t.id}
                    href={`/turnos/${t.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/5 text-primary shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {format(fh, "MMM", { locale: es })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(fh, "d")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {t.paciente_nombre}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.tipo_cirugia}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {format(fh, "HH:mm")} hs
                        </span>
                        {t.quirofano?.nombre && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{
                                  background: t.quirofano.color ?? "var(--primary)",
                                }}
                                aria-hidden
                              />
                              {t.quirofano.nombre}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="success" className="shrink-0">
                      {dayLabel}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {user.rol === "medico" && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-info/5">
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-md">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="font-semibold">¿Necesitás un nuevo turno?</p>
                <p className="text-sm text-muted-foreground">
                  Solicitá un turno de quirófano en pocos pasos
                </p>
              </div>
            </div>
            <Link href="/solicitar-turno">
              <Button size="lg">
                Solicitar Turno
                <ArrowRight size={16} />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
