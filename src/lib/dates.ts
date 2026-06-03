export const TZ_ARG = "America/Argentina/Buenos_Aires";

const fmtFecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ_ARG,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const fmtFechaCorta = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ_ARG,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const fmtHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ_ARG,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const fmtFechaSolo = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ_ARG,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function asDate(fecha: string | Date): Date {
  return fecha instanceof Date ? fecha : new Date(fecha);
}

export function formatFechaArg(fecha: string | Date): string {
  return fmtFecha.format(asDate(fecha));
}

export function formatFechaCortaArg(fecha: string | Date): string {
  return fmtFechaCorta.format(asDate(fecha));
}

export function formatHoraArg(fecha: string | Date): string {
  return fmtHora.format(asDate(fecha));
}

export function formatFechaSoloArg(fecha: string | Date): string {
  return fmtFechaSolo.format(asDate(fecha));
}
