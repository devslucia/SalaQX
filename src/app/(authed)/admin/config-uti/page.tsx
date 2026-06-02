"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Check, Info, Save } from "lucide-react";
import { DIAS_SEMANA, type DiaSemana, type ConfigUTI } from "@/lib/types";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export default function ConfigUTIPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ConfigUTI | null>(null);
  const [selectedDays, setSelectedDays] = useState<DiaSemana[]>([1, 2, 3]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("config_uti")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setConfig(data);
        setSelectedDays(data.dias_permitidos as DiaSemana[]);
      }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const toggleDay = (day: DiaSemana) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      toast.error("Seleccioná al menos un día");
      return;
    }
    setSaving(true);
    try {
      if (config) {
        const { error } = await supabase.from("config_uti").update({
          dias_permitidos: selectedDays,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("config_uti").insert({
          dias_permitidos: selectedDays,
          updated_by: user?.id,
        });
        if (error) throw error;
      }
      toast.success("Configuración guardada");
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setSaving(false);
  };

  if (!user || !["admin", "encargada"].includes(user.rol)) {
    return <Alert variant="destructive"><AlertDescription>No tenés acceso</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Settings}
        title="Configuración UTI"
        description="Días permitidos para programar cirugías de pacientes que van a UTI"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info size={16} className="text-primary" />
            Días Permitidos
          </CardTitle>
          <CardDescription>
            Seleccioná los días de la semana habilitados. Por defecto: <strong>Lunes, Martes y Miércoles</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <LoadingState label="Cargando configuración..." minHeight="min-h-[200px]" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(DIAS_SEMANA) as [string, string][]).map(([key, label]) => {
                  const day = parseInt(key) as DiaSemana;
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleDay(day)}
                      type="button"
                      className={`flex items-center justify-center gap-2 rounded-lg border p-3.5 text-sm font-semibold transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card border-input hover:bg-muted hover:border-primary/50"
                      }`}
                    >
                      {isSelected && <Check size={16} />}
                      {label}
                    </button>
                  );
                })}
              </div>

              <Alert variant="info">
                <Info size={16} />
                <AlertDescription>
                  Días seleccionados:{" "}
                  <strong>
                    {selectedDays.map((d) => DIAS_SEMANA[d]).join(", ") || "Ninguno"}
                  </strong>
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || selectedDays.length === 0}>
                  <Save size={16} />
                  {saving ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
