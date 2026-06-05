"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Sun, Moon, Hourglass } from "lucide-react";
import { useTheme } from "next-themes";
import { useSanatorioConfig, getIniciales } from "@/lib/sanatorio-config-context";
import { motion } from "framer-motion";

interface RateLimitInfo {
  message: string;
  resetAt: number;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { config: sanatorio } = useSanatorioConfig();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!rateLimit) return;
    const tick = () => {
      const diff = Math.max(0, rateLimit.resetAt - Date.now());
      setCountdown(Math.ceil(diff / 1000));
      if (diff <= 0) {
        setRateLimit(null);
        setError("");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [rateLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRateLimit(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 429) {
        const resetHeader = res.headers.get("X-RateLimit-Reset");
        const retryAfter = res.headers.get("Retry-After");
        const resetAt = resetHeader
          ? Number(resetHeader)
          : Date.now() + Number(retryAfter ?? 60) * 1000;
        setRateLimit({
          message: "Demasiados intentos. Esperá unos minutos antes de volver a intentar.",
          resetAt,
        });
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo iniciar sesión");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("[login] fetch error:", err);
      setError("Error de red. Verificá tu conexión.");
      setLoading(false);
    }
  };

  const isDark = mounted && resolvedTheme === "dark";
  const logoIsExternal =
    sanatorio.logo_url?.startsWith("http") ||
    sanatorio.logo_url?.startsWith("https");

  const formatCountdown = (s: number) => {
    if (s <= 0) return "0s";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={isDark ? "Modo claro" : "Modo oscuro"}
        aria-label="Cambiar tema"
        className="fixed top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted transition-colors"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          {sanatorio.logo_url && logoIsExternal ? (
            <div className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg mb-4 ring-1 ring-border">
              <Image
                src={sanatorio.logo_url}
                alt={sanatorio.nombre}
                width={64}
                height={64}
                className="h-full w-full object-contain"
                unoptimized
                priority
              />
            </div>
          ) : sanatorio.logo_url ? (
            <div className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg mb-4 ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sanatorio.logo_url}
                alt={sanatorio.nombre}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg mb-4 bg-primary text-primary-foreground">
              <span className="text-lg font-bold tracking-wide">
                {getIniciales(sanatorio.nombre)}
              </span>
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{sanatorio.nombre}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Sistema de Gestión de Turnos Quirúrgicos</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
            <CardDescription>Ingresá con tu cuenta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {rateLimit ? (
                <Alert variant="destructive">
                  <Hourglass size={16} className="animate-pulse" />
                  <AlertDescription>
                    <strong>{rateLimit.message}</strong>
                    <span className="block mt-1 text-xs font-mono">
                      Reintentá en {formatCountdown(countdown)}
                    </span>
                  </AlertDescription>
                </Alert>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    disabled={Boolean(rateLimit)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={Boolean(rateLimit)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || Boolean(rateLimit)}
              >
                {loading ? "Ingresando..." : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sistema cerrado · Solo usuarios autorizados
        </p>
      </motion.div>
    </div>
  );
}
