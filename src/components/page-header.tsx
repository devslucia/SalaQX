"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-4 min-w-0">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
            "text-primary-foreground shadow-sm ring-1 ring-primary/20",
            "bg-gradient-to-br from-primary to-info",
          )}
        >
          <Icon size={24} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 pt-0.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[26px] font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:ml-auto sm:shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
