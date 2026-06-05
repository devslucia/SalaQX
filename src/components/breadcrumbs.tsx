"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  calendario: "Calendario",
  "solicitar-turno": "Solicitar Turno",
  turnos: "Turnos",
  admin: "Administración",
  usuarios: "Usuarios",
  quirofanos: "Quirófanos",
  anestesia: "Tipos de Anestesia",
  "obras-sociales": "Obras Sociales",
  horarios: "Horarios",
  "config-uti": "Configuración UTI",
  sanatorio: "Configuración",
};

function humanize(segment: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  if (segment.length > 20) return segment.slice(0, 8) + "…";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const computedItems: BreadcrumbItem[] =
    items ??
    segments.map((seg, i) => {
      const href = "/" + segments.slice(0, i + 1).join("/");
      const isLast = i === segments.length - 1;
      return {
        label: humanize(seg),
        href: isLast ? undefined : href,
      };
    });

  if (computedItems.length === 0) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1 min-w-0 flex-wrap">
        <li>
          <Link
            href="/dashboard"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Inicio"
          >
            <Home size={14} />
          </Link>
        </li>
        {computedItems.map((item, i) => (
          <li key={i} className="flex items-center gap-1 min-w-0">
            <ChevronRight
              size={14}
              className="text-muted-foreground/60 shrink-0"
              aria-hidden
            />
            {item.href ? (
              <Link
                href={item.href}
                className="px-1.5 py-0.5 rounded-md font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors truncate max-w-[160px]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="px-1.5 py-0.5 font-semibold text-foreground truncate max-w-[200px]"
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </motion.nav>
  );
}
