import type { Position } from "@/types/database";
import { POSITION_LABELS } from "@/lib/utils/positions";
export function PositionBadge({ position }: { position: Position }) {
  return (
    <span
      className="position-badge"
      style={{
        color: `var(--position-${position.toLowerCase()})`,
        background: `color-mix(in srgb,var(--position-${position.toLowerCase()}) 12%,var(--card))`,
      }}
      title={POSITION_LABELS[position]}
    >
      {position}
    </span>
  );
}
