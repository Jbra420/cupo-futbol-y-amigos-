const MAX_TILT = 16;
const DEG_PER_POINT = 4;
/** Media longitud de la viga en unidades del SVG. */
export const BEAM = 116;

/** Ángulo de la viga: el equipo con más nivel baja. Positivo = baja la derecha. */
export function beamAngle(left: number, right: number) {
  return Math.max(
    -MAX_TILT,
    Math.min(MAX_TILT, (right - left) * DEG_PER_POINT),
  );
}

export function balanceVerdict(difference: number) {
  if (difference === 0)
    return { tone: "perfect", label: "Equilibrio perfecto" };
  if (difference <= 2) return { tone: "close", label: "Muy parejo" };
  if (difference <= 4) return { tone: "uneven", label: "Algo desnivelado" };
  return { tone: "off", label: "Desnivelado: mueve a alguien" };
}
