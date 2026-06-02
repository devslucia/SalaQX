import { cn } from "@/lib/utils";
import React from "react";

interface LoadingStateProps {
  label?: string;
  className?: string;
  minHeight?: string;
}

export function LoadingState({ label = "Cargando...", className, minHeight = "min-h-[320px]" }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border bg-card p-12 shadow-card",
        minHeight,
        className
      )}
    >
      <div className="spinner" style={{ width: "3rem", height: "3rem", borderWidth: "4px" }} />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
