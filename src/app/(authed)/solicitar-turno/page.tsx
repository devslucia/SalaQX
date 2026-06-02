"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SolicitarTurnoForm } from "@/components/solicitar-turno-form";

export default function SolicitarTurnoPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  if (user.rol !== "medico") {
    return <Alert variant="destructive"><AlertDescription>Solo los médicos pueden solicitar turnos</AlertDescription></Alert>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        icon={CalendarPlus}
        title="Solicitar Turno"
        description="Completá los datos para solicitar un turno de quirófano"
      />
      <SolicitarTurnoForm
        user={user}
        onSuccess={() => setTimeout(() => router.push("/turnos"), 1500)}
        onCancel={() => router.push("/turnos")}
      />
    </div>
  );
}
