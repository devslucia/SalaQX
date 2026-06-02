# Notificaciones SalaQX

Sistema completo de notificaciones por email construido con **Resend** + **React Email**.

## Arquitectura

```
┌─────────────────┐    ┌──────────────────────────┐    ┌──────────────┐
│ Cliente (UI)    │───▶│ POST /api/notificaciones │───▶│ lib/resend.ts│
│ dispara acción  │    │  /[tipo]                 │    │              │
└─────────────────┘    └──────────────────────────┘    └──────┬───────┘
                                                             │
                                                             ▼
                                            ┌────────────────────────┐
                                            │ Resend API + Supabase  │
                                            │  - envío de email      │
                                            │  - log en notificaciones│
                                            └────────────────────────┘
```

**Toda la lógica de envío corre server-side.** El cliente nunca toca Resend directamente.

## Tipos de notificación

| `tipo` (URL)             | Destinatario       | Disparador                                  |
|--------------------------|--------------------|---------------------------------------------|
| `nueva-solicitud`        | Admin + Encargada  | Médico envía el form de solicitud           |
| `turno-confirmado`       | Médico             | Encargada/Admin confirma + asigna quirófano |
| `turno-rechazado`        | Médico             | Encargada/Admin rechaza con motivo          |
| `cirugia-editada`        | Médico             | Encargada/Admin edita fecha/hora/duración   |
| `cirugia-suspendida`     | Médico             | Encargada/Admin (o médico) suspende         |
| `recordatorio`           | Médico             | Cron diario 8 AM para cirugías de mañana    |

## Endpoint universal

```
POST /api/notificaciones/{tipo}
Content-Type: application/json

{
  "turno_id": "uuid",
  "motivo": "...",      // solo para tipo=turno-rechazado
  "cambios": ["..."]    // solo para tipo=cirugia-editada
}
```

`GET /api/notificaciones/{tipo}` devuelve la lista de tipos válidos.

## Archivos clave

- `src/lib/resend.ts` — instancia Resend + 6 funciones de envío (server-only)
- `src/lib/notify-client.ts` — helper cliente `notify(kind, opts)`
- `src/app/api/notificaciones/[tipo]/route.ts` — endpoint universal
- `src/emails/*.tsx` — 6 templates React Email + layout compartido
- `src/app/api/cron/reminders/route.ts` — endpoint para el cron

## Variables de entorno

| Variable                  | Descripción                                | Default                              |
|---------------------------|--------------------------------------------|--------------------------------------|
| `RESEND_API_KEY`          | API key de Resend                          | (requerida)                          |
| `RESEND_FROM`             | Remitente verificado                       | `SalaQX <onboarding@resend.dev>`     |
| `SUPABASE_SERVICE_ROLE_KEY` | Para logging en tabla notificaciones      | (ya configurada)                     |
| `NEXT_PUBLIC_APP_URL`     | URL base para los links en emails          | (ya configurada)                     |

> ⚠️ **Resend requiere dominio verificado** para usar `from: tu-dominio@tuempresa.com`.
> El default `onboarding@resend.dev` funciona con cualquier API key para testing,
> pero los emails sólo pueden enviarse a la dirección dueña de la cuenta Resend.
> Para producción: verificá tu dominio en [resend.com/domains](https://resend.com/domains)
> y setea `RESEND_FROM` con tu dirección.

## Logging

Cada envío se registra en `notificaciones` con:
- `tipo` — uno de los 6 valores
- `canal` — `email`
- `estado` — `enviado` o `error`
- `enviado_at` — timestamp (null si falló)
- `error_message` — mensaje de error si falló
- `destinatario_email` — a quién se envió

El fallo de un email **nunca interrumpe** la acción principal (confirmar, rechazar, etc).

## Tabla SQL

Migración `supabase/migrations/005_notificaciones_status.sql`:
- Agrega `estado text default 'enviado' check (estado in ('enviado','error'))`
- Agrega `error_message text`
- Agrega `destinatario_email text`
- Índices sobre `estado` y `tipo`

**Para activar:** correr la migración en el SQL Editor de tu proyecto Supabase.

## Cron de recordatorios 24hs

### Opción A — Supabase Edge Function (recomendado)

1. Instalar Supabase CLI: `npm i -g supabase`
2. Login: `supabase login`
3. Linkear proyecto: `supabase link --project-ref eyljfhsvecxqutfrkwwt`
4. Crear función: `supabase functions new send-reminders`
5. Reemplazar el contenido con:

```ts
// supabase/functions/send-reminders/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERCEL_CRON_URL = Deno.env.get("VERCEL_CRON_URL")!;
// ejemplo: https://quirofano-six.vercel.app/api/cron/reminders
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

serve(async () => {
  const res = await fetch(VERCEL_CRON_URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), { status: res.status });
});
```

6. Deploy: `supabase functions deploy send-reminders --no-verify-jwt`
7. Crear cron job en Supabase Dashboard:
   - **Database → Extensions → pg_cron** (enable)
   - **Database → Cron Jobs → Create job**:
     - Name: `send-reminders-daily`
     - Schedule: `0 8 * * *` (todos los días a las 8:00 UTC = 5:00 ART)
     - SQL:
     ```sql
     select net.http_post(
       url := '<your-supabase-project>.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
     );
     ```

### Opción B — Vercel Cron (más simple)

Si preferís no usar Supabase Edge Functions, podés usar Vercel Cron Jobs
agregando a `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 11 * * *"
    }
  ]
}
```

(`0 11 * * *` UTC = 8:00 ART. Ajustar según horario de verano/invierno.)

**Importante:** proteger el endpoint con un header `Authorization` que Vercel
envíe automáticamente, o con un query secret. Por ahora el endpoint está abierto
a GET, idealmente agregar un check de `Authorization: Bearer ${process.env.CRON_SECRET}`.

## Probando localmente

1. Reemplazar `RESEND_API_KEY` en `.env.local` con una key real de [resend.com/api-keys](https://resend.com/api-keys)
2. Iniciar dev: `npm run dev`
3. Probar endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/notificaciones/turno-confirmado \
     -H "Content-Type: application/json" \
     -d '{"turno_id":"<uuid>"}'
   ```
4. Confirmar en [resend.com/emails](https://resend.com/emails) que el envío salió
5. Revisar la tabla `notificaciones` en Supabase para ver el log
