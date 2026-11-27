/** Point on the pitch in percentages (x of width, y of height). */
export type PitchPoint = { id: string; x: number; y: number; pinned?: boolean };

/** Horizontal distance (% of width) two tokens need to stay legible side by side. */
export const TOKEN_MIN_DX = 22;
/** Vertical distance (% of height) a token plus its name label occupies. */
export const TOKEN_MIN_DY = 14;
const MIN_X = 8;
const MAX_X = 92;

const clampX = (x: number) => Math.min(MAX_X, Math.max(MIN_X, x));

/**
 * Pushes overlapping tokens apart horizontally so names never cover another
 * player. Pinned points (goalkeepers) keep their place when possible.
 * Deterministic: the same input always yields the same layout.
 */
export function spreadTokens<T extends PitchPoint>(
  points: readonly T[],
  minDx = TOKEN_MIN_DX,
  minDy = TOKEN_MIN_DY,
): T[] {
  const result = points
    .map((point) => ({ ...point, x: clampX(point.x) }))
    .sort((a, b) => a.y - b.y || a.x - b.x || (a.id < b.id ? -1 : 1));
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < result.length; i++)
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        const dx = b.x - a.x;
        if (Math.abs(dx) >= minDx || Math.abs(b.y - a.y) >= minDy) continue;
        const overlap = minDx - Math.abs(dx);
        // b goes right of a unless it already sits to its left.
        const direction = dx < 0 ? -1 : 1;
        if (a.pinned && !b.pinned) b.x = clampX(b.x + direction * overlap);
        else if (b.pinned && !a.pinned) a.x = clampX(a.x - direction * overlap);
        else {
          a.x = clampX(a.x - (direction * overlap) / 2);
          b.x = clampX(b.x + (direction * overlap) / 2);
        }
        // Against an edge, push the other token the rest of the way.
        if (Math.abs(b.x - a.x) < minDx - 0.01) {
          if (a.x === MIN_X || a.x === MAX_X || a.pinned)
            b.x = clampX(a.x + direction * minDx);
          else a.x = clampX(b.x - direction * minDx);
        }
        moved = true;
      }
    if (!moved) break;
  }
  const order = new Map(points.map((point, index) => [point.id, index]));
  return result.sort((a, b) => order.get(a.id)! - order.get(b.id)!) as T[];
}

/** "María Fernanda López" → "María L."; keeps single names as they are. */
export function shortName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] ?? "";
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`;
}
