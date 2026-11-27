/** Luminancia relativa (WCAG) de un color #rgb o #rrggbb; null si no es hex. */
export function luminance(color: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const hex =
    match[1].length === 3
      ? [...match[1]].map((char) => char + char).join("")
      : match[1];
  const [r, g, b] = [0, 2, 4].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tinta legible sobre una camiseta: oscura en colores claros, blanca en el resto. */
export function inkOn(color: string) {
  const value = luminance(color);
  return value !== null && value > 0.42 ? "#14291d" : "#ffffff";
}
