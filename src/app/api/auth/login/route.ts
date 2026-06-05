import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loginRatelimit, getClientIp, applyRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await applyRateLimit(loginRatelimit, `login:${ip}`);
  if (!limited.ok) return limited.response;

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son obligatorios" },
      { status: 400 },
    );
  }

  const supabaseResponse = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: "Email o contraseña incorrectos" },
      { status: 401 },
    );
  }

  return supabaseResponse;
}
