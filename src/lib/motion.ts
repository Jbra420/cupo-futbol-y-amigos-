/** Respeta la preferencia del sistema de reducir el movimiento. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** Vibración corta en dispositivos que la admiten (Android); silencio en el resto. */
export function haptic(pattern: number | number[] = 20) {
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* La vibración es opcional. */
  }
}

/** Dorsal estable entre 1 y 99 a partir del id de la inscripción. */
export function shirtNumber(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 99) + 1;
}
