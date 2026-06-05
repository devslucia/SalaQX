"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Stethoscope,
  Clock,
  Users as UsersIcon,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "sanatorio",
    title: "Configurar el sanatorio",
    description: "Personalizá el nombre y subí el logo. Aparecerá en toda la app y en los emails automáticos.",
    icon: Building2,
    href: "/admin/sanatorio",
  },
  {
    id: "quirofanos",
    title: "Crear quirófanos",
    description: "Sumá los quirófanos disponibles. Por ejemplo: Quirófano 1, Quirófano 2, Endoscopía, etc.",
    icon: Stethoscope,
    href: "/admin/quirofanos",
  },
  {
    id: "horarios",
    title: "Configurar horarios",
    description: "Definí qué días y horarios está habilitado cada quirófano para recibir cirugías.",
    icon: Clock,
    href: "/admin/horarios",
  },
  {
    id: "usuarios",
    title: "Crear usuarios",
    description: "Sumá a tu equipo: la encargada que gestionará los turnos y los médicos que los solicitarán.",
    icon: UsersIcon,
    href: "/admin/usuarios",
  },
] as const;

interface OnboardingState {
  hasSanatorio: boolean;
  hasQuirofanos: boolean;
  hasHorarios: boolean;
  hasUsuarios: boolean;
}

export function OnboardingWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = React.useState(0);
  const [state, setState] = React.useState<OnboardingState>({
    hasSanatorio: false,
    hasQuirofanos: false,
    hasHorarios: false,
    hasUsuarios: false,
  });
  const [loading, setLoading] = React.useState(true);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("salaqx-onboarding-dismissed") === "1") {
      setDismissed(true);
    }
  }, []);

  React.useEffect(() => {
    if (!user || user.rol !== "admin") {
      setLoading(false);
      return;
    }
    const check = async () => {
      const [san, q, h, u] = await Promise.all([
        supabase.from("config_sanatorio").select("id, nombre, logo_url").limit(1).maybeSingle(),
        supabase.from("quirofanos").select("id", { count: "exact", head: true }).eq("activo", true),
        supabase.from("horarios_habilitados").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("activo", true),
      ]);
      const hasSanatorio = !!(
        san.data &&
        ((san.data as { nombre?: string }).nombre || san.data.logo_url) &&
        (san.data as { nombre?: string }).nombre !== "SalaQX"
      );
      const hasQuirofanos = (q.count ?? 0) > 0;
      const hasHorarios = (h.count ?? 0) > 0;
      const hasUsuarios = (u.count ?? 0) > 1;
      setState({ hasSanatorio, hasQuirofanos, hasHorarios, hasUsuarios });
      setLoading(false);

      const allDone = hasQuirofanos && hasHorarios && hasUsuarios;
      const nothingYet = !hasSanatorio && !hasQuirofanos && !hasHorarios && !hasUsuarios;
      if (allDone && !dismissed) {
        setDismissed(true);
        window.localStorage.setItem("salaqx-onboarding-dismissed", "1");
      }
    };
    void check();
  }, [user, supabase, dismissed]);

  if (!user || user.rol !== "admin" || loading || dismissed) return null;

  const completed = STEPS.filter((s) => {
    if (s.id === "sanatorio") return state.hasSanatorio;
    if (s.id === "quirofanos") return state.hasQuirofanos;
    if (s.id === "horarios") return state.hasHorarios;
    if (s.id === "usuarios") return state.hasUsuarios;
    return false;
  });

  if (completed.length === STEPS.length) return null;

  const currentStep = STEPS[step];
  const allDone = completed.length === STEPS.length;
  const progress = (completed.length / STEPS.length) * 100;

  const handleDismiss = () => {
    setDismissed(true);
    window.localStorage.setItem("salaqx-onboarding-dismissed", "1");
    toast.success("Onboarding descartado", {
      description: "Podés volver a mostrarlo limpiando el almacenamiento del navegador",
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/[0.03] via-card to-info/[0.04]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-info/5 pointer-events-none" />
          <CardContent className="p-6 sm:p-8 relative">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-md">
                  <Sparkles size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    {allDone ? "¡Tu sanatorio está listo para usar!" : "Configurá tu sanatorio"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {allDone
                      ? "Completaste todos los pasos. Ya podés empezar a gestionar turnos."
                      : `${completed.length} de ${STEPS.length} pasos completados`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDismiss}
                aria-label="Saltar onboarding"
                title="Saltar"
              >
                <X size={14} />
              </Button>
            </div>

            {!allDone && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                    <span>Progreso</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-info"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {STEPS.map((s, i) => {
                    const done = completed.some((c) => c.id === s.id);
                    const current = i === step && !done;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setStep(i)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                          done && "border-success/30 bg-success/5",
                          current && "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/10",
                          !done && !current && "border-border bg-card hover:bg-muted/50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            done && "bg-success text-success-foreground",
                            current && "bg-primary text-primary-foreground",
                            !done && !current && "bg-muted text-muted-foreground",
                          )}
                        >
                          {done ? <Check size={16} /> : <Icon size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">
                            {i + 1}. {s.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {done ? "Completado" : s.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-muted/30 border"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <currentStep.icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{currentStep.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {currentStep.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      {step > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStep((s) => Math.max(0, s - 1))}
                        >
                          <ArrowLeft size={14} />
                          Anterior
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => router.push(currentStep.href)}
                      >
                        Ir
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </>
            )}

            {allDone && (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-4 p-5 rounded-xl bg-success/5 border border-success/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Configuración inicial completa</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Empezá a recibir solicitudes de turno de tus médicos.
                  </p>
                </div>
                <Button
                  variant="success"
                  onClick={() => router.push("/dashboard")}
                >
                  Ir al dashboard
                  <ArrowRight size={16} />
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
