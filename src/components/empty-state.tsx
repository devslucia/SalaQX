"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, XCircle, PauseCircle, MinusCircle } from "lucide-react";
import type { EstadoTurno } from "@/lib/types";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export const StatusIcons: Record<EstadoTurno, LucideIcon> = {
  pendiente: AlertCircle,
  confirmada: CheckCircle2,
  rechazada: XCircle,
  suspendida: PauseCircle,
  eliminada: MinusCircle,
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center shadow-card",
        className
      )}
    >
      {Icon && (
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl text-primary mb-5 ring-1 ring-primary/10"
          style={{
            background:
              "linear-gradient(135deg, rgba(27, 79, 114, 0.08) 0%, rgba(174, 214, 241, 0.18) 100%)",
          }}
        >
          <Icon size={36} strokeWidth={1.6} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground leading-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground/90 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
