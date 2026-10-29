import "server-only";
import { googleMapsEmbedUrl, googleMapsUrl } from "./maps";

export class MapsLocationError extends Error {}

export async function resolveMapsLocation(
  value: string | null | undefined,
): Promise<string | null> {
  if (!value?.trim()) return null;
  let url = googleMapsUrl(value);
  if (!url)
    throw new MapsLocationError("Pega un enlace HTTPS de Google Maps válido.");
  const deadline = AbortSignal.timeout(5000);
  try {
    for (let redirects = 0; redirects <= 4; redirects++) {
      if (googleMapsEmbedUrl(url.href)) return url.href;
      // Every hop is validated before fetching. No arbitrary URLs or HTML are requested.
      const response = await fetch(url.href, {
        redirect: "manual",
        cache: "no-store",
        signal: deadline,
      });
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;
      const next = googleMapsUrl(new URL(location, url).href);
      if (!next) break;
      url = next;
    }
  } catch {
    throw new MapsLocationError(
      "No pudimos cargar esa ubicación. Comprueba el enlace de Google Maps e inténtalo de nuevo.",
    );
  }
  throw new MapsLocationError(
    "No encontramos el punto del mapa. Abre la cancha en Google Maps y copia su enlace desde Compartir.",
  );
}
