"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify-client";
import { toast } from "sonner";
import {
  CalendarDays, CheckCircle2, Pencil, Pause, Trash2, Lock, X, ChevronDown,
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventClickArg, EventContentArg, EventInput, DateSelectArg, DatesSetArg,
} from "@fullcalendar/core";
import {
  type TurnoCalendarEvent, type Quirofano, type HorarioHabilitado,
  type EstadoTurno, DIAS_SEMANA,
} from "@/lib/types";
import { SolicitarTurnoForm } from "@/components/solicitar-turno-form";
import { ESTADO_BADGE_COLORS, ESTADO_LABELS } from "@/lib/calendar";
import { isBefore, isSameDay, startOfDay } from "date-fns";

const ESTADOS_BLOQUEANTES = new Set([
  "confirmada",
  "pendiente",
  "solicitud_reprogramacion",
]);

const STORAGE_KEY = "salaqx-calendar-quirofanos";

const OCCUPIED_COLOR = "#8B949E";
const MOBILE_BREAKPOINT = 768;

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isTimeWithinHorarios(
  date: Date,
  timeMinutes: number,
  horarios: HorarioHabilitado[],
): boolean {
  const jsDay = date.getDay();
  return horarios.some((h) => {
    if (h.dia !== jsDay) return false;
    const [sh, sm] = h.hora_inicio.split(":").map(Number);
    const [eh, em] = h.hora_fin.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    return timeMinutes >= start && timeMinutes < end;
  });
}

interface SelectedRange {
  date: string;
  time: string;
}

export default function CalendarioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [horarios, setHorarios] = useState<HorarioHabilitado[]>([]);
  const [turnos, setTurnos] = useState<TurnoCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuirofanos, setSelectedQuirofanos] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [requestDialog, setRequestDialog] = useState<SelectedRange | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // -------- load data --------
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [qRes, hRes, tRes] = await Promise.all([
        supabase.from("quirofanos").select("*").order("nombre"),
        supabase.from("horarios_habilitados").select("*"),
        supabase.rpc("get_turnos_for_calendar"),
      ]);
      if (qRes.data) setQuirofanos(qRes.data);
      if (hRes.data) setHorarios(hRes.data);
      if (tRes.data) setTurnos(tRes.data as TurnoCalendarEvent[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // -------- mobile detection --------
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // -------- persist filter --------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    try {
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr)) setSelectedQuirofanos(new Set(arr));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (quirofanos.length === 0) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(selectedQuirofanos)),
    );
  }, [selectedQuirofanos, quirofanos.length]);

  // -------- initial filter: all selected by default --------
  useEffect(() => {
    if (quirofanos.length === 0) return;
    if (selectedQuirofanos.size === 0) {
      setSelectedQuirofanos(new Set(quirofanos.map((q) => q.id)));
    }
  }, [quirofanos, selectedQuirofanos.size]);

  // -------- time grid bounds from horarios --------
  const { slotMinTime, slotMaxTime, slotDuration } = useMemo(() => {
    if (horarios.length === 0) {
      return { slotMinTime: "07:00:00", slotMaxTime: "20:00:00", slotDuration: "00:30:00" };
    }
    let minMin = 24 * 60;
    let maxMin = 0;
    for (const h of horarios) {
      const [sh, sm] = h.hora_inicio.split(":").map(Number);
      const [eh, em] = h.hora_fin.split(":").map(Number);
      minMin = Math.min(minMin, sh * 60 + sm);
      maxMin = Math.max(maxMin, eh * 60 + em);
    }
    return {
      slotMinTime: minutesToHHMM(Math.max(0, minMin - 30)) + ":00",
      slotMaxTime: minutesToHHMM(Math.min(24 * 60, maxMin + 30)) + ":00",
      slotDuration: "00:30:00",
    };
  }, [horarios]);

  // -------- filtered events --------
  const events: EventInput[] = useMemo(() => {
    return turnos
      .filter((t) => t.quirofano_id && selectedQuirofanos.has(t.quirofano_id))
      .map((t) => {
        const start = new Date(t.fecha_hora);
        const end = new Date(start.getTime() + t.duracion_minutos * 60_000);
        const isMine = user?.id === t.medico_id;
        const isOpaqueToUser =
          user?.rol === "medico" && !isMine;
        const quirofanoColor = isOpaqueToUser
          ? OCCUPIED_COLOR
          : t.quirofano_color || "#1B4F72";

        return {
          id: t.id,
          start: start.toISOString(),
          end: end.toISOString(),
          title: isOpaqueToUser
            ? "Quirófano ocupado"
            : `${t.paciente_nombre ?? "—"} · ${t.tipo_cirugia}`,
          backgroundColor: quirofanoColor,
          borderColor: quirofanoColor,
          textColor: isOpaqueToUser ? "#1C2833" : "#FFFFFF",
          classNames: isOpaqueToUser ? ["fc-event-locked"] : [],
          extendedProps: {
            ...t,
            isOpaqueToUser,
            stateColor: ESTADO_BADGE_COLORS[t.estado] || "#8B949E",
          },
        } satisfies EventInput;
      });
  }, [turnos, selectedQuirofanos, user]);

  // -------- day cell classNames: marca días con turnos bloqueantes --------
  const dayCellClassNames = useCallback((arg: { date: Date }) => {
    const cellDate = arg.date;
    if (isBefore(startOfDay(cellDate), startOfDay(new Date()))) return "";
    const tieneBloqueantes = turnos.some(
      (t) =>
        t.estado &&
        ESTADOS_BLOQUEANTES.has(t.estado) &&
        isSameDay(new Date(t.fecha_hora), cellDate),
    );
    return tieneBloqueantes ? ["day-with-bookings"] : [];
  }, [turnos]);

  // -------- event rendering --------
  const renderEventContent = (arg: EventContentArg) => {
    const ext = arg.event.extendedProps as any;
    const isOpaque = ext.isOpaqueToUser === true;
    return (
      <div className="fc-event-inner px-2 py-1">
        <div className="flex items-start gap-1.5">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ring-2 ring-white/80"
            style={{ background: ext.stateColor }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wide leading-tight opacity-90">
              {arg.timeText}
            </div>
            <div className="text-[12px] font-semibold leading-tight truncate">
              {arg.event.title}
            </div>
            {!isOpaque && ext.quirofano_nombre && (
              <div className="text-[11px] leading-tight opacity-85 truncate">
                {ext.quirofano_nombre}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // -------- date click handler (medico creates request) --------
  const handleDateClick = (arg: { date: Date; dateStr: string }) => {
    if (!user) return;
    if (user.rol !== "medico") return;
    const date = arg.date;
    const minutes = date.getHours() * 60 + date.getMinutes();
    if (!isTimeWithinHorarios(date, minutes, horarios)) {
      toast.error("Este horario no está disponible para cirugías");
      return;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    setRequestDialog({ date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` });
  };

  const handleSelect = (arg: DateSelectArg) => {
    if (!user || user.rol !== "medico") return;
    const minutes = arg.start.getHours() * 60 + arg.start.getMinutes();
    if (!isTimeWithinHorarios(arg.start, minutes, horarios)) {
      toast.error("Este horario no está disponible para cirugías");
      calendarRef.current?.getApi().unselect();
      return;
    }
    const yyyy = arg.start.getFullYear();
    const mm = String(arg.start.getMonth() + 1).padStart(2, "0");
    const dd = String(arg.start.getDate()).padStart(2, "0");
    const hh = String(arg.start.getHours()).padStart(2, "0");
    const mi = String(arg.start.getMinutes()).padStart(2, "0");
    setRequestDialog({ date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` });
    calendarRef.current?.getApi().unselect();
  };

  // -------- event click → detail modal (role-based) --------
  const handleEventClick = (arg: EventClickArg) => {
    const ext = arg.event.extendedProps as any;
    if (ext.isOpaqueToUser) return; // medico viewing others: no modal
    setDetailId(arg.event.id);
  };

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    (async () => {
      const { data } = await supabase
        .from("turnos")
        .select("*, users!turnos_medico_id_fkey(nombre,telefono), quirofanos(nombre,color), obras_sociales(nombre), tipos_anestesia(nombre)")
        .eq("id", detailId)
        .single();
      if (data) setDetail(data);
      setDetailLoading(false);
    })();
  }, [detailId, supabase]);

  const refreshTurnos = async () => {
    const { data } = await supabase.rpc("get_turnos_for_calendar");
    if (data) setTurnos(data as TurnoCalendarEvent[]);
  };

  const handleSuspend = async () => {
    if (!detail) return;
    const ok = window.confirm("¿Suspender esta cirugía?");
    if (!ok) return;
    const { error } = await supabase.from("turnos").update({ estado: "suspendida" }).eq("id", detail.id);
    if (error) { toast.error("Error al suspender"); return; }
    void notify("cirugia-suspendida", { turno_id: detail.id });
    toast.success("Cirugía suspendida");
    setDetailId(null);
    refreshTurnos();
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = window.confirm("¿Estás seguro que querés eliminar este turno? Esta acción no se puede deshacer.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/turnos/${detail.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al eliminar");
      }
      toast.success("Turno eliminado correctamente");
      setDetailId(null);
      refreshTurnos();
    } catch (err: any) {
      toast.error("Error al eliminar", { description: err.message });
    }
  };

  const handleEditRedirect = () => {
    if (!detail) return;
    router.push(`/turnos/${detail.id}`);
  };

  const toggleQuirofano = (id: string) => {
    setSelectedQuirofanos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedQuirofanos.size === quirofanos.length) {
      setSelectedQuirofanos(new Set());
    } else {
      setSelectedQuirofanos(new Set(quirofanos.map((q) => q.id)));
    }
  };

  const allSelected = selectedQuirofanos.size === quirofanos.length && quirofanos.length > 0;

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-sm ring-1 ring-primary/20"
            style={{ background: "linear-gradient(135deg, #1B4F72 0%, #2E86AB 100%)" }}
          >
            <CalendarDays size={24} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h1 className="text-[26px] font-bold tracking-tight text-foreground leading-tight">
              Calendario
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground/90 leading-relaxed">
              {user.rol === "medico"
                ? "Tus cirugías y la disponibilidad de los quirófanos. Click en un slot libre para solicitar un turno."
                : "Vista global de todas las cirugías programadas. Click en un slot libre para ver disponibilidad."}
            </p>
          </div>
        </div>

        {/* Quirofano filter */}
        <div className="relative sm:shrink-0">
          <Button
            variant="outline"
            onClick={() => setFilterOpen((o) => !o)}
            className="gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            Quirófanos
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {selectedQuirofanos.size}/{quirofanos.length}
            </Badge>
            <ChevronDown size={14} className={cn("transition-transform", filterOpen && "rotate-180")} />
          </Button>
          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-40 w-72 rounded-xl border bg-card text-card-foreground shadow-card p-3 animate-in">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                      allSelected
                        ? "bg-primary border-primary"
                        : "border-input",
                    )}
                    aria-hidden
                  >
                    {allSelected && <CheckCircle2 size={12} className="text-primary-foreground" />}
                  </span>
                  Todos los quirófanos
                </button>
                <div className="my-2 border-t" />
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {quirofanos.length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground">
                      No hay quirófanos cargados
                    </p>
                  )}
                  {quirofanos.map((q) => {
                    const checked = selectedQuirofanos.has(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => toggleQuirofano(q.id)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted transition-colors"
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                            checked
                              ? "bg-primary border-primary"
                              : "border-input",
                          )}
                          aria-hidden
                        >
                          {checked && <CheckCircle2 size={12} className="text-primary-foreground" />}
                        </span>
                        <span
                          className="h-3 w-3 shrink-0 rounded-full ring-1 ring-border"
                          style={{ backgroundColor: q.color }}
                          aria-hidden
                        />
                        <span className="truncate">{q.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Calendar */}
      <Card className="p-0 overflow-hidden">
        <div
          className={cn(
            "calendario-wrapper",
            user.rol === "medico" && "medico-can-create",
          )}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
            key={isMobile ? "mobile" : "desktop"}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            locale="es"
            firstDay={1}
            allDaySlot={false}
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
            slotDuration={slotDuration}
            slotLabelInterval="01:00"
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            dayMaxEvents={3}
            expandRows
            height="auto"
            contentHeight="auto"
            stickyHeaderDates
            nowIndicator
            events={events}
            eventContent={renderEventContent}
            dayCellClassNames={dayCellClassNames}
            dateClick={handleDateClick}
            selectable={user.rol === "medico"}
            selectMirror
            select={handleSelect}
            selectAllow={(selectInfo) =>
              user.rol === "medico" &&
              isTimeWithinHorarios(
                selectInfo.start,
                selectInfo.start.getHours() * 60 + selectInfo.start.getMinutes(),
                horarios,
              )
            }
            eventClick={handleEventClick}
            datesSet={(_arg: DatesSetArg) => {
              // hook for future range-bound optimizations
            }}
            buttonText={{
              today: "Hoy",
              month: "Mes",
              week: "Semana",
              day: "Día",
            }}
            viewDidMount={(arg) => {
              // ensure first day of week sticks on view change
              arg.view.calendar.setOption("firstDay", 1);
            }}
          />
        </div>
      </Card>

      {/* Request dialog (medico) */}
      <Dialog open={requestDialog !== null} onOpenChange={(o) => { if (!o) setRequestDialog(null); }}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          onClose={() => setRequestDialog(null)}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays size={20} className="text-primary" />
              Solicitar Turno
            </DialogTitle>
            {requestDialog && (
              <p className="text-sm text-muted-foreground">
                {new Date(`${requestDialog.date}T${requestDialog.time}`).toLocaleString("es-AR", {
                  weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </DialogHeader>
          {requestDialog && user && (
            <SolicitarTurnoForm
              user={user}
              initialDate={requestDialog.date}
              initialTime={requestDialog.time}
              onSuccess={() => {
                setRequestDialog(null);
                refreshTurnos();
                toast.success("Turno solicitado", { description: "Aparecerá en el calendario cuando sea confirmado" });
              }}
              onCancel={() => setRequestDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailId !== null} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-lg" onClose={() => setDetailId(null)}>
          <DialogHeader>
            <DialogTitle>Detalle del Turno</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center py-8">
              <div className="spinner" />
            </div>
          ) : (
            <DetailContent detail={detail} user={user} />
          )}
          {detail && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailId(null)}>
                Cerrar
              </Button>
              {(user.rol === "admin" || user.rol === "encargada" || detail.medico_id === user.id) && (
                <Button variant="outline" onClick={handleEditRedirect}>
                  <Pencil size={14} /> Editar
                </Button>
              )}
              {detail.medico_id === user.id && detail.estado !== "suspendida" && (
                <Button variant="outline" onClick={handleSuspend}>
                  <Pause size={14} /> Suspender
                </Button>
              )}
              {(user.rol === "admin" || user.rol === "encargada") && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 size={14} /> Eliminar
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailContent({ detail, user }: { detail: any; user: any }) {
  const isOpaque = user.rol === "medico" && detail.medico_id !== user.id;
  const fh = new Date(detail.fecha_hora);
  const end = new Date(fh.getTime() + detail.duracion_minutos * 60_000);

  if (isOpaque) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <Lock size={18} className="text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Quirófano ocupado</p>
            <p className="text-xs text-muted-foreground">No tenés acceso a los datos de esta cirugía</p>
          </div>
        </div>
        <Row label="Quirófano" value={detail.quirofanos?.nombre || "—"} />
        <Row label="Inicio" value={fh.toLocaleString("es-AR")} />
        <Row label="Fin" value={end.toLocaleString("es-AR")} />
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <Row label="Paciente" value={detail.paciente_nombre} />
      <Row label="DNI" value={detail.paciente_dni} />
      <Row label="Tipo de cirugía" value={detail.tipo_cirugia} />
      <Row label="Médico" value={detail.users?.nombre || "—"} />
      <Row label="Quirófano" value={detail.quirofanos?.nombre || "—"} />
      <Row label="Anestesia" value={detail.tipos_anestesia?.nombre || "—"} />
      <Row label="Obra Social" value={detail.obras_sociales?.nombre || "—"} />
      <Row label="Inicio" value={fh.toLocaleString("es-AR")} />
      <Row label="Fin" value={end.toLocaleString("es-AR")} />
      <Row label="Duración" value={`${detail.duracion_minutos} min`} />
      <div className="pt-1">
        <Badge
          variant={
            detail.estado === "confirmada" ? "success" :
            detail.estado === "pendiente" ? "warning" :
            detail.estado === "rechazada" ? "destructive" : "secondary"
          }
        >
          {ESTADO_LABELS[detail.estado] || detail.estado}
        </Badge>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed pb-1.5 last:border-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="font-semibold text-right truncate">{value}</span>
    </div>
  );
}
