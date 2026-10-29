export const APP_NAME = "CUPO";

// Original geometric lettering: an open stadium C and a ball mark the available spot.
export const BRAND_PATHS = {
  c: "M35 10H22C12 10 5 16 5 24S12 38 22 38H35",
  u: "M59 9V27C59 36 63 40 71 40S83 36 83 27V9",
  p: "M103 40V9H117C125 9 130 13 130 20S125 31 117 31H103",
  o: "M166 8C155 8 149 14 149 24S155 40 166 40S183 34 183 24S177 8 166 8Z",
  ball: "M35 20L39 23L37.5 27.5H32.5L31 23Z",
} as const;

export function brandSvg({
  ink = "#192a22",
  accent = "#285c3e",
  ballInk = "#f7f8f2",
  symbol = false,
}: { ink?: string; accent?: string; ballInk?: string; symbol?: boolean } = {}) {
  const paths = symbol
    ? [BRAND_PATHS.c]
    : [BRAND_PATHS.c, BRAND_PATHS.u, BRAND_PATHS.p, BRAND_PATHS.o];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol ? "0 0 48 48" : "0 0 190 48"}" fill="none" role="img" aria-label="CUPO"><g fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join("")}</g><circle cx="35" cy="24" r="7" fill="${accent}"/><path d="${BRAND_PATHS.ball}" fill="${ballInk}"/></svg>`;
}
