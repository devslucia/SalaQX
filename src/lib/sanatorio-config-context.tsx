"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConfigSanatorio } from "@/lib/types";

interface SanatorioConfigContextType {
  config: ConfigSanatorio;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_CONFIG: ConfigSanatorio = {
  id: "",
  nombre: "SalaQX",
  logo_url: null,
  updated_by: null,
  updated_at: "",
};

const SanatorioConfigContext = createContext<SanatorioConfigContextType>({
  config: DEFAULT_CONFIG,
  loading: true,
  refresh: async () => {},
});

export function SanatorioConfigProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [config, setConfig] = useState<ConfigSanatorio>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("config_sanatorio")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      setConfig(data as ConfigSanatorio);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (config.nombre) {
      document.title = `${config.nombre} — Gestión de Turnos Quirúrgicos`;
    }
  }, [config.nombre]);

  return (
    <SanatorioConfigContext.Provider value={{ config, loading, refresh: load }}>
      {children}
    </SanatorioConfigContext.Provider>
  );
}

export function useSanatorioConfig() {
  return useContext(SanatorioConfigContext);
}

export function getIniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
