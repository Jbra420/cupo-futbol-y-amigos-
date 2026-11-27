import type { Position } from "@/types/database";
import { POSITION_COLORS, POSITION_LABELS } from "@/lib/utils/positions";
import { Jersey } from "./jersey";
import { initials } from "./pitch";

/** Altura (en % desde arriba) de cada zona en la mini-cancha, atacando hacia arriba. */
const ZONE_TOP: Record<Position, number> = {
  DEL: 6,
  MED: 30,
  DEF: 54,
  POR: 78,
};
const ZONE_HINT: Record<Position, string> = {
  POR: "Bajo los tres palos.",
  DEF: "La última línea antes del arco.",
  MED: "Donde se piensa el partido.",
  DEL: "Cerca del gol.",
};

/** Mini-cancha que ilumina la zona elegida y muestra tu camiseta con iniciales. */
export function PositionPreview({
  position,
  name,
}: {
  position: Position;
  name: string;
}) {
  const color = POSITION_COLORS[position];
  const label = initials(name).toUpperCase() || "?";
  return (
    <div
      className="position-preview"
      style={{ "--zone-color": color } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="mini-pitch">
        <svg viewBox="0 0 60 80" fill="none" preserveAspectRatio="none">
          <rect x="2" y="2" width="56" height="76" rx="2" />
          <path d="M2 40h56M18 2v10h24V2M18 78V68h24v10" />
          <circle cx="30" cy="40" r="7" />
        </svg>
        <span className="mini-zone" style={{ top: `${ZONE_TOP[position]}%` }} />
        <span
          className="mini-jersey"
          style={{ top: `${ZONE_TOP[position] + 11}%` }}
          key={position}
        >
          <Jersey color={color} label={label} size={34} />
        </span>
      </div>
      <div className="preview-copy">
        <Jersey
          color={color}
          label={label}
          size={58}
          className="preview-shirt"
        />
        <strong>{POSITION_LABELS[position]}</strong>
        <span>{ZONE_HINT[position]}</span>
      </div>
    </div>
  );
}
