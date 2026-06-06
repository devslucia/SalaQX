import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { apiRatelimit, getClientIp, applyRateLimit } from "@/lib/ratelimit";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rate-limit API general por IP.
  // Excluimos:
  //   - /api/cron/*  → autenticado con Bearer, no es tráfico de usuario
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/cron/")
  ) {
    const ip = getClientIp(request);
    const limited = await applyRateLimit(apiRatelimit, `api:${ip}`);
    if (!limited.ok) return limited.response;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
