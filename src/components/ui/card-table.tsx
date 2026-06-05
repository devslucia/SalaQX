"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CardTableColumn<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  mobileRender?: (item: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  primary?: boolean;
}

interface CardTableProps<T> {
  columns: CardTableColumn<T>[];
  data: T[];
  keyOf: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  skeleton?: React.ReactNode;
  className?: string;
}

export function CardTable<T>({
  columns,
  data,
  keyOf,
  onRowClick,
  emptyState,
  loading,
  skeleton,
  className,
}: CardTableProps<T>) {
  if (loading && skeleton) return <>{skeleton}</>;
  if (data.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <>
      {/* Desktop table */}
      <div className={cn("hidden md:block rounded-xl border bg-card shadow-card overflow-hidden", className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "h-10 px-4 text-left align-middle font-semibold text-muted-foreground text-xs uppercase tracking-wider",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className,
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyOf(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/50 active:bg-muted",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "p-4 align-middle",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                  >
                    {c.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={cn("md:hidden space-y-3", className)}>
        {data.map((item, i) => (
          <motion.div
            key={keyOf(item)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: i * 0.03, ease: "easeOut" }}
            onClick={onRowClick ? () => onRowClick(item) : undefined}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-card space-y-2.5",
              onRowClick && "cursor-pointer active:scale-[0.99] transition-transform",
            )}
          >
            {columns.map((c) => {
              if (c.primary) {
                return (
                  <div key={c.key} className={cn("text-base font-semibold", c.className)}>
                    {c.mobileRender ? c.mobileRender(item) : c.render(item)}
                  </div>
                );
              }
              return (
                <div
                  key={c.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </span>
                  <span className={cn("text-right", c.className)}>
                    {c.mobileRender ? c.mobileRender(item) : c.render(item)}
                  </span>
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>
    </>
  );
}
