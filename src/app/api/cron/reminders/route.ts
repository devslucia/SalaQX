import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendRecordatorio24hs, isResendConfigured } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: turnos, error } = await supabase
      .from("turnos")
      .select("id, fecha_hora")
      .eq("estado", "confirmada")
      .gte("fecha_hora", now.toISOString())
      .lte("fecha_hora", in24h.toISOString());

    if (error) {
      console.error("[cron/reminders] query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!turnos || turnos.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, total: 0 });
    }

    if (!isResendConfigured()) {
      console.warn("[cron/reminders] RESEND_API_KEY not configured, skipping send");
      return NextResponse.json({ ok: true, skipped: true, total: turnos.length });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const t of turnos) {
      const result = await sendRecordatorio24hs(t.id);
      if (result.ok) sent++;
      else {
        failed++;
        if (result.error) errors.push(`${t.id}: ${result.error}`);
      }
    }

    return NextResponse.json({ ok: true, sent, failed, total: turnos.length, errors });
  } catch (err) {
    console.error("[cron/reminders] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
