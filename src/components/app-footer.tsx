"use client";

import { useSanatorioConfig } from "@/lib/sanatorio-config-context";

export function AppFooter() {
  const { config } = useSanatorioConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="pointer-events-none fixed bottom-0 right-0 z-10 px-3 py-1.5 text-xs text-[#8B949E] md:ml-72">
      <span>
        © {year} {config.nombre} · Desarrollado por{" "}
        <span className="font-medium">Lucía Cristaldo</span>
      </span>
    </footer>
  );
}
