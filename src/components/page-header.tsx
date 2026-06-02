import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import React from "react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ icon: Icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex items-start gap-4 min-w-0">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-sm ring-1 ring-primary/20"
          style={{
            background:
              "linear-gradient(135deg, #1B4F72 0%, #2E86AB 100%)",
          }}
        >
          <Icon size={24} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 pt-0.5">
          <h1 className="text-[26px] font-bold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground/90 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:ml-auto sm:shrink-0">{actions}</div>
      )}
    </div>
  );
}
