import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
let _warnedMissingEnv = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!_warnedMissingEnv) {
      console.warn(
        "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN no configuradas. " +
          "Rate limiting deshabilitado (fail-open).",
      );
      _warnedMissingEnv = true;
    }
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

function buildLimiter(
  prefix: string,
  limiter: Ratelimit["limiter"],
): Ratelimit {
  const redis = getRedis();
  if (!redis) {
    // Fallback dummy: always success, no enforcement
    return new Ratelimit({
      redis: new Redis({
        url: "https://placeholder.invalid",
        token: "placeholder",
      }),
      limiter,
      analytics: false,
      prefix,
    });
  }
  return new Ratelimit({
    redis,
    limiter,
    analytics: true,
    prefix,
  });
}

// API general: 60 requests por minuto por IP
export const apiRatelimit = buildLimiter(
  "ratelimit:api",
  Ratelimit.slidingWindow(60, "1 m"),
);

// Acciones sensibles: 20 por minuto por usuario autenticado
export const actionRatelimit = buildLimiter(
  "ratelimit:action",
  Ratelimit.slidingWindow(20, "1 m"),
);

/**
 * Extrae la IP real del cliente respetando headers estándar de proxy.
 * Prioridad: x-forwarded-for (primera IP) > x-real-ip > 127.0.0.1
 */
export function getClientIp(req: Request | { headers: Headers }): string {
  const h = "headers" in req ? req.headers : (req as Request).headers;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "127.0.0.1";
}

export type RateLimitResult =
  | { ok: true; limit: number; remaining: number; reset: number }
  | { ok: false; response: Response };

/**
 * Aplica un limit. Si pasa, devuelve { ok: true }.
 * Si se excede, devuelve una Response 429 lista para retornar.
 * Si Redis falla, fail-open (permite la request y loggea).
 */
export async function applyRateLimit(
  limiter: Ratelimit,
  key: string,
): Promise<RateLimitResult> {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(key);
    if (success) {
      return { ok: true, limit, remaining, reset };
    }
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "Demasiadas solicitudes. Intentá en un momento.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(retryAfter),
          },
        },
      ),
    };
  } catch (err) {
    // Fail-open: si Upstash está caído, NO romper la app
    console.error("[ratelimit] Redis error, allowing request:", err);
    return { ok: true, limit: 0, remaining: 0, reset: 0 };
  }
}
