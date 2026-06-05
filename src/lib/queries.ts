"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ObraSocial, TipoAnestesia, Quirofano, User } from "@/lib/types";

const supabase = createClient();

export function useObrasSociales() {
  return useQuery({
    queryKey: ["obras-sociales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras_sociales")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as ObraSocial[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTiposAnestesia() {
  return useQuery({
    queryKey: ["tipos-anestesia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_anestesia")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as TipoAnestesia[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuirofanos(opts: { onlyActive?: boolean } = {}) {
  return useQuery({
    queryKey: ["quirofanos", opts.onlyActive ?? false],
    queryFn: async () => {
      let q = supabase.from("quirofanos").select("*").order("nombre");
      if (opts.onlyActive) q = q.eq("activo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Quirofano[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useHorariosHabilitados() {
  return useQuery({
    queryKey: ["horarios-habilitados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horarios_habilitados")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useConfigUTI() {
  return useQuery({
    queryKey: ["config-uti"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_uti")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as User[];
    },
    staleTime: 60 * 1000,
  });
}
