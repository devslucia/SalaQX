import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendEliminacionAprobada } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// DELETE: hard-delete a turno. Admin/encargada only.
// Notifies the medico that the deletion was approved (if the turno was in
// a state where they had requested it; for direct deletes by admin we still
// log the deletion in the medico's notifications).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "encargada"].includes(profile.rol)) {
    return NextResponse.json(
      { error: "Solo admin/encargada pueden eliminar turnos" },
      { status: 403 },
    );
  }

  const admin = getAdminClient();
  const { data: turno, error: fetchError } = await admin
    .from("turnos")
    .select("id, medico_id, estado")
    .eq("id", id)
    .single();

  if (fetchError || !turno) {
    return NextResponse.json({ error: "turno no encontrado" }, { status: 404 });
  }

  const wasSolicitud = turno.estado === "solicitud_eliminacion";

  const { error: deleteError } = await admin
    .from("turnos")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  if (wasSolicitud) {
    void sendEliminacionAprobada(id).catch((err) =>
      console.error("[turnos/[id] DELETE] notify error:", err),
    );
  }

  return NextResponse.json({ ok: true });
}
