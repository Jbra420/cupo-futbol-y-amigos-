/** Colores básicos disponibles para las camisetas de los equipos. */
export const TEAM_COLORS = [
  { name: "Rojo", hex: "#DC2626" },
  { name: "Azul", hex: "#2563EB" },
  { name: "Verde", hex: "#16A34A" },
  { name: "Amarillo", hex: "#FACC15" },
  { name: "Naranja", hex: "#F97316" },
  { name: "Morado", hex: "#7C3AED" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Negro", hex: "#111827" },
] as const;

export const sameColor = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** Nombre del color básico, o null si es un color anterior a la paleta. */
export function teamColorName(hex: string) {
  return TEAM_COLORS.find((color) => sameColor(color.hex, hex))?.name ?? null;
}
