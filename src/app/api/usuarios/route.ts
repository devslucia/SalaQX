import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { actionRatelimit, applyRateLimit } from "@/lib/ratelimit";

// Service role client (bypasses RLS)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is an admin
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await applyRateLimit(actionRatelimit, `action:user:${user.id}`);
    if (!limited.ok) return limited.response;

    const { data: profile } = await supabase
      .from("users")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (!profile || profile.rol !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, email, password, rol, telefono } = body;

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const service = getServiceClient();

    // 1) Create the auth user
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Error creating user" }, { status: 400 });
    }

    // 2) Insert the public profile (manual, no trigger)
    const { error: profileError } = await service.from("users").insert({
      id: authData.user.id,
      nombre,
      email,
      rol,
      telefono: telefono || null,
      activo: true,
    });

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await service.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user_id: authData.user.id });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await applyRateLimit(actionRatelimit, `action:user:${user.id}`);
    if (!limited.ok) return limited.response;

    const { data: profile } = await supabase
      .from("users")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (!profile || profile.rol !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, email, rol, telefono, activo } = body;

    const service = getServiceClient();
    const { error } = await service
      .from("users")
      .update({ nombre, email, rol, telefono, activo })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
