/** Preserve the browser host when Next.js normalizes a local request URL. */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (host && !/[\s/@\\?#]/.test(host)) {
    try {
      return new URL(`${url.protocol}//${host}`).origin;
    } catch {
      /* Use the validated request URL. */
    }
  }
  return url.origin;
}
