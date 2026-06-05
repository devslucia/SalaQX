"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, XCircle, PauseCircle, MinusCircle } from "lucide-react";
import type { EstadoTurno } from "@/lib/types";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  variant?: "default" | "search" | "welcome";
}

export const StatusIcons: Record<EstadoTurno, LucideIcon> = {
  pendiente: AlertCircle,
  confirmada: CheckCircle2,
  rechazada: XCircle,
  suspendida: PauseCircle,
  eliminada: MinusCircle,
  solicitud_eliminacion: AlertCircle,
  solicitud_reprogramacion: AlertCircle,
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  action,
  variant = "default",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center",
        variant === "search" && "py-10",
        variant === "welcome" && "py-20",
        className,
      )}
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "flex items-center justify-center rounded-2xl text-primary mb-5 ring-1 ring-primary/10",
            "bg-gradient-to-br from-primary/8 to-info/15",
            variant === "welcome" ? "h-24 w-24" : "h-20 w-20",
          )}
        >
          <Icon size={variant === "welcome" ? 44 : 36} strokeWidth={1.5} />
        </motion.div>
      )}
      <h3 className="text-lg font-semibold text-foreground leading-tight tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
