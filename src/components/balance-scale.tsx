"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { BEAM, balanceVerdict, beamAngle } from "@/lib/teams/scale";

export type ScaleSide = {
  name: string;
  color: string;
  total: number;
  count: number;
};

/**
 * Balanza animada del nivel privado de cada equipo. Se inclina hacia el más
 * fuerte con un rebote y se ilumina cuando queda pareja.
 */
export function BalanceScale({ sides }: { sides: [ScaleSide, ScaleSide] }) {
  const [left, right] = sides;
  const difference = Math.abs(left.total - right.total);
  const angle = beamAngle(left.total, right.total);
  const verdict = balanceVerdict(difference);
  const heavier =
    left.total === right.total ? null : left.total > right.total ? left : right;

  // Pulso de celebración al llegar al equilibrio.
  const [pulse, setPulse] = useState(0);
  const previous = useRef(difference);
  useEffect(() => {
    if (previous.current !== 0 && difference === 0 && !prefersReducedMotion())
      setPulse((value) => value + 1);
    previous.current = difference;
  }, [difference]);

  const radians = (angle * Math.PI) / 180;
  const ends = [-1, 1].map((direction) => ({
    x: 160 + direction * BEAM * Math.cos(radians),
    y: 58 + direction * BEAM * Math.sin(radians),
  }));

  return (
    <div className={`balance-scale tone-${verdict.tone}`}>
      <svg
        viewBox="0 0 320 168"
        className="scale-svg"
        role="img"
        aria-label={`Balanza: ${left.name} ${left.total}, ${right.name} ${right.total}. ${verdict.label}.`}
      >
        <path className="scale-base" d="M130 160h60l-12-14h-36z" />
        <path className="scale-post" d="M157 58h6v90h-6z" />
        {pulse > 0 && (
          <circle key={pulse} className="scale-pulse" cx="160" cy="58" r="14" />
        )}
        <g className="scale-beam" style={{ transform: `rotate(${angle}deg)` }}>
          <rect
            x={160 - BEAM - 4}
            y="54"
            width={BEAM * 2 + 8}
            height="8"
            rx="4"
          />
        </g>
        {sides.map((side, index) => (
          <g
            key={index}
            className="scale-pan"
            style={{
              transform: `translate(${ends[index].x}px, ${ends[index].y}px)`,
            }}
          >
            <path className="scale-strings" d="M0 0-30 48M0 0l30 48" />
            <path
              className="scale-dish"
              d="M-40 48h80a40 16 0 0 1-80 0z"
              style={{ fill: side.color }}
            />
            <text className="scale-total" x="0" y="60" textAnchor="middle">
              {side.total}
            </text>
            <circle className="scale-hook" r="4" />
          </g>
        ))}
        <circle className="scale-pivot" cx="160" cy="58" r="8" />
      </svg>
      <div className="scale-legend">
        {sides.map((side, index) => (
          <span key={index} className={`legend-${index}`}>
            <i style={{ background: side.color }} aria-hidden="true" />
            <b>{side.name}</b>
            <small>
              {side.count} {side.count === 1 ? "jugador" : "jugadores"}
            </small>
          </span>
        ))}
      </div>
      <p className="scale-verdict" aria-live="polite">
        <strong>{verdict.label}</strong>
        {heavier && <small>Más fuerte: {heavier.name}</small>}
      </p>
    </div>
  );
}
