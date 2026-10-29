/** Only Google Maps links may be saved or opened by the location resolver. */
export function googleMapsUrl(value: string): URL | null {
  if (value.length > 4096) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    // Shared Ecuador links often redirect to this regional Google Maps host.
    if (["google.com.ec", "www.google.com.ec"].includes(url.hostname))
      url.hostname = "www.google.com";
    const mapsPath =
      url.pathname === "/maps" || url.pathname.startsWith("/maps/");
    const allowed =
      (["google.com", "www.google.com"].includes(url.hostname) && mapsPath) ||
      (url.hostname === "maps.google.com" &&
        (url.pathname === "/" || mapsPath)) ||
      (url.hostname === "maps.app.goo.gl" &&
        /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) ||
      (url.hostname === "goo.gl" &&
        /^\/maps\/[A-Za-z0-9_-]+\/?$/.test(url.pathname));
    return allowed ? url : null;
  } catch {
    return null;
  }
}

function coordinates(latitude: string, longitude: string): string | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
    ? `${lat},${lng}`
    : null;
}

export function googleMapsEmbedUrl(
  value: string | null | undefined,
): string | null {
  const url = value ? googleMapsUrl(value) : null;
  if (!url || ["maps.app.goo.gl", "goo.gl"].includes(url.hostname)) return null;
  if (url.pathname === "/maps/embed" && url.searchParams.has("pb"))
    return url.href;
  let path: string;
  try {
    path = decodeURIComponent(url.pathname + url.search);
  } catch {
    return null;
  }
  // Place coordinates take priority over the map camera's @latitude,longitude.
  const pin = [
    ...path.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g),
  ].at(-1);
  const center = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const explicit =
    url.searchParams.get("query") ||
    url.searchParams.get("q") ||
    url.searchParams.get("destination") ||
    url.searchParams.get("daddr");
  const place = url.pathname.match(/^\/maps\/place\/([^/]+)/);
  const search = url.pathname.match(/^\/maps\/search\/([^/]+)/);
  const query =
    (pin && coordinates(pin[1], pin[2])) ||
    explicit ||
    (search && decodeURIComponent(search[1]).replaceAll("+", " ")) ||
    (center && coordinates(center[1], center[2])) ||
    (place && decodeURIComponent(place[1]).replaceAll("+", " "));
  const cid = url.searchParams.get("cid");
  if (!query && !(cid && /^\d+$/.test(cid))) return null;
  const params = new URLSearchParams({ output: "embed", z: "16" });
  if (query) params.set("q", query);
  else params.set("cid", cid!);
  return `https://www.google.com/maps?${params}`;
}
