export const MATCH_TIMEZONE = "America/Guayaquil";
export function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: MATCH_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(/[\u00a0\u202f]/g, " ");
}
export function formatPrice(value: number | null) {
  return value === null
    ? "Por definir"
    : new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" })
        .format(value)
        .replace(/[\u00a0\u202f]/g, " ");
}
export function localDateToISO(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value + "-05:00");
  if (!Number.isFinite(date.getTime())) return null;
  const normalized = new Date(date.getTime() - 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  return normalized === value ? date.toISOString() : null;
}
