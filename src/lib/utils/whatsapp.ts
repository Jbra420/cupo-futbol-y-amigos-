import { MATCH_TIMEZONE } from "@/lib/date";
/**
 * Generates a WhatsApp share link with a pre-filled message.
 */
export function generateWhatsAppLink({
  title,
  startsAt,
  spotsRemaining,
  capacity,
  matchUrl,
  finished = false,
}: {
  title: string;
  startsAt: Date;
  spotsRemaining: number;
  capacity: number;
  matchUrl: string;
  finished?: boolean;
}): string {
  const dateStr = startsAt.toLocaleDateString("es-419", {
    timeZone: MATCH_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const timeStr = startsAt.toLocaleTimeString("es-419", {
    timeZone: MATCH_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });

  const spotsText = finished
    ? "⚽ Partido finalizado"
    : spotsRemaining > 0
      ? `⚽ ${spotsRemaining === 1 ? "Queda" : "Quedan"} ${spotsRemaining} de ${capacity} cupos`
      : `🔴 ¡Cupos llenos! (Lista de espera disponible)`;

  const message = [
    `🏟️ *${title}*`,
    `📅 ${dateStr} a las ${timeStr}`,
    spotsText,
    ``,
    `👉 ${finished ? "Ver partido" : "Apúntate aquí"}: ${matchUrl}`,
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
