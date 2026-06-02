"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "default" | "on-sidebar";
}

export function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-9 w-9 rounded-lg border bg-card",
          variant === "on-sidebar" && "border-white/20 bg-white/10"
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextLabel = isDark ? "Modo claro" : "Modo oscuro";

  if (variant === "on-sidebar") {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={nextLabel}
        aria-label={nextLabel}
        className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
      >
        <Sun
          size={15}
          className={cn(
            "absolute transition-all duration-200",
            isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          )}
        />
        <Moon
          size={15}
          className={cn(
            "absolute transition-all duration-200",
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          )}
        />
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1 text-xs font-semibold text-popover-foreground shadow-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition-opacity z-50">
          {nextLabel}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={nextLabel}
      aria-label={nextLabel}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-card-foreground hover:bg-muted transition-colors"
    >
      <Sun
        size={16}
        className={cn(
          "absolute transition-all duration-200",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      />
      <Moon
        size={16}
        className={cn(
          "absolute transition-all duration-200",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )}
      />
    </button>
  );
}
