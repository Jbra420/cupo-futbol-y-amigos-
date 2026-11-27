/** Puestos de formación (en % de la cancha) para el equipo que ataca hacia abajo (0) o hacia arriba (1). */
export type Slot = {
  x: number;
  y: number;
  line: "POR" | "DEF" | "MED" | "DEL";
};

const LINES: { line: Slot["line"]; y: number; xs: number[] }[] = [
  { line: "POR", y: 6, xs: [50] },
  { line: "DEF", y: 18, xs: [14, 38, 62, 86] },
  { line: "MED", y: 31, xs: [26, 50, 74] },
  { line: "DEL", y: 43, xs: [14, 38, 62, 86] },
];

export function formationSlots(team: number): Slot[] {
  return LINES.flatMap(({ line, y, xs }) =>
    xs.map((x) => ({ line, x, y: team === 0 ? y : 100 - y })),
  );
}

/** Distancia visual: la cancha es 5:7, así que un % vertical pesa más. */
export function visualDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
}

export const MAGNET_RADIUS = 13;
const OCCUPIED_RADIUS = 7;
const SAME_SPOT = 2;

/**
 * Puesto libre más cercano al punto donde se soltó la ficha, o null para
 * dejarla donde cayó. Nunca devuelve el puesto del que salió la ficha, para
 * que todo arrastre la mueva.
 */
export function magnetTarget({
  point,
  team,
  origin,
  others,
  radius = MAGNET_RADIUS,
}: {
  point: { x: number; y: number };
  team: number;
  origin: { x: number; y: number };
  others: { x: number; y: number; team: number }[];
  radius?: number;
}): Slot | null {
  const mates = others.filter((other) => other.team === team);
  return (
    formationSlots(team)
      .filter((slot) => visualDistance(slot, origin) > SAME_SPOT)
      .filter(
        (slot) =>
          !mates.some((mate) => visualDistance(mate, slot) < OCCUPIED_RADIUS),
      )
      .map((slot) => ({ slot, distance: visualDistance(slot, point) }))
      .filter(({ distance }) => distance <= radius)
      .sort((a, b) => a.distance - b.distance)[0]?.slot ?? null
  );
}
