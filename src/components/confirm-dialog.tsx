"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  icon?: React.ReactNode;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

const VARIANT_STYLES: Record<
  NonNullable<ConfirmDialogProps["variant"]>,
  { ring: string; iconBg: string; iconColor: string; Icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  danger: {
    ring: "ring-destructive/20",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    Icon: Trash2,
  },
  warning: {
    ring: "ring-warning/20",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    Icon: AlertTriangle,
  },
  info: {
    ring: "ring-primary/20",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    Icon: Info,
  },
  success: {
    ring: "ring-success/20",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    Icon: CheckCircle2,
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  icon,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.Icon;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      // parent handles errors
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {() => (
        <DialogContent size="sm" onClose={() => onOpenChange(false)}>
          <DialogHeader className="items-center text-center sm:items-start sm:text-left">
            <div
              className={cn(
                "mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full ring-4",
                styles.iconBg,
                styles.iconColor,
                styles.ring,
              )}
            >
              {icon ?? <Icon size={20} />}
            </div>
            <DialogTitle className="pt-1">{title}</DialogTitle>
            {description && (
              <DialogDescription className="pt-1">{description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="sm:gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === "danger" ? "destructive" : variant === "success" ? "success" : "default"}
              onClick={handleConfirm}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Procesando..." : confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
