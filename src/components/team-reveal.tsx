"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type {
  Assignment,
  MatchInfo,
  PublicRegistration,
  TeamInfo,
} from "@/lib/contracts";
import type { Position } from "@/types/database";
import { POSITIONS } from "@/lib/utils/positions";
import { shortName } from "@/lib/teams/layout";
import { launchConfetti } from "@/lib/confetti";
import { haptic, prefersReducedMotion } from "@/lib/motion";
import { BrandMark } from "./brand-mark";
import { Jersey } from "./jersey";
import { PositionBadge } from "./position-badge";
import { Button } from "./ui/button";
import { initials } from "./pitch";

/** Desactiva la apertura automática de la ceremonia en este navegador. */
export const REVEAL_AUTO_KEY = "cupo-reveal-auto";

const INTRO_MS = 1500;
const DEAL_MS = 330;

type Card = {
  id: string;
  name: string;
  position: Position;
  side: 0 | 1;
  row: number;
  order: number;
};

/** Firma de la alineación publicada: cambia si cambian equipos o jugadores. */
export function revealSignature(assignments: Assignment[]) {
  const text = assignments
    .map((item) => `${item.registration_id}:${item.team_id}`)
    .sort()
    .join("|");
  let hash = 5381;
  for (const char of text)
    hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}

/**
 * Ceremonia del sorteo: baraja, reparte las cartas una por una a cada equipo
 * y presenta a los dos equipos con confeti en sus colores.
 */
export function TeamReveal({
  match,
  teams,
  players,
  assignments,
  onClose,
}: {
  match: MatchInfo;
  teams: TeamInfo[];
  players: PublicRegistration[];
  assignments: Assignment[];
  onClose: (showPitch: boolean) => void;
}) {
  const sides = useMemo(
    () => [...teams].sort((a, b) => a.idx - b.idx).slice(0, 2),
    [teams],
  );
  const cards = useMemo(() => {
    const rank = (position: Position) => POSITIONS.indexOf(position);
    const columns = sides.map((team, side) =>
      assignments
        .filter((assignment) => assignment.team_id === team.id)
        .flatMap((assignment) => {
          const player = players.find(
            (item) => item.id === assignment.registration_id,
          );
          return player
            ? [
                {
                  id: player.id,
                  name: player.player_name,
                  position: player.position,
                  side: side as 0 | 1,
                },
              ]
            : [];
        })
        .sort(
          (a, b) =>
            rank(a.position) - rank(b.position) ||
            a.name.localeCompare(b.name, "es"),
        )
        .map((card, row) => ({ ...card, row })),
    );
    const longest = Math.max(0, ...columns.map((column) => column.length));
    const dealt: Card[] = [];
    for (let row = 0; row < longest; row++)
      for (const column of columns)
        if (column[row]) dealt.push({ ...column[row], order: dealt.length });
    return dealt;
  }, [sides, assignments, players]);

  const reduced = useRef(prefersReducedMotion());
  const [dealtCount, setDealtCount] = useState(
    reduced.current ? cards.length : 0,
  );
  const [phase, setPhase] = useState<"intro" | "deal" | "final">(
    reduced.current ? "final" : "intro",
  );
  const [autoOff, setAutoOff] = useState(false);
  const skipRef = useRef<HTMLButtonElement>(null);
  const finalRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(
    (showPitch: boolean) => {
      onClose(showPitch);
    },
    [onClose],
  );

  useEffect(() => {
    if (reduced.current) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("deal"), INTRO_MS));
    cards.forEach((_, index) =>
      timers.push(
        setTimeout(
          () => {
            setDealtCount(index + 1);
            haptic(8);
          },
          INTRO_MS + 250 + index * DEAL_MS,
        ),
      ),
    );
    timers.push(
      setTimeout(
        () => setPhase("final"),
        INTRO_MS + 650 + cards.length * DEAL_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [cards]);

  useEffect(() => {
    if (phase !== "final") return;
    finalRef.current?.focus();
    if (reduced.current) return;
    launchConfetti({
      colors: [...sides.map((team) => team.color), "#ffffff"],
      count: 140,
    });
    haptic([40, 60, 120]);
  }, [phase, sides]);

  useEffect(() => {
    skipRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  function skip() {
    setDealtCount(cards.length);
    setPhase("final");
  }
  function disableAuto() {
    try {
      localStorage.setItem(REVEAL_AUTO_KEY, "off");
    } catch {
      /* Almacenamiento opcional. */
    }
    setAutoOff(true);
  }

  const remaining = cards.length - dealtCount;
  return (
    <div
      className={`team-reveal phase-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-title"
    >
      <div className="reveal-lights" aria-hidden="true">
        <span />
        <span />
      </div>
      <header className="reveal-header">
        <BrandMark width={92} ink="#f4f7ee" ballInk="#0c1a12" />
        {phase !== "final" ? (
          <Button
            ref={skipRef}
            variant="ghost"
            className="reveal-skip"
            onClick={skip}
          >
            Saltar
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="reveal-skip"
            aria-label="Cerrar el sorteo"
            onClick={() => close(false)}
          >
            <X />
          </Button>
        )}
      </header>
      <div className="reveal-title">
        <p className="overline">EL SORTEO</p>
        <h2 id="reveal-title">{match.title}</h2>
      </div>
      <div className="reveal-stage">
        {sides.map((team, side) => (
          <section
            key={team.id}
            className={`reveal-team side-${side}`}
            style={{ "--team-color": team.color } as React.CSSProperties}
            aria-label={team.name}
          >
            <h3>
              <i aria-hidden="true" />
              {team.name}
            </h3>
            <ol>
              {cards
                .filter((card) => card.side === side)
                .map((card) => (
                  <li
                    key={card.id}
                    className={`reveal-card ${card.order < dealtCount ? "is-dealt" : ""}`}
                    style={{ "--row": card.row } as React.CSSProperties}
                    aria-hidden={card.order >= dealtCount}
                  >
                    <Jersey
                      color={team.color}
                      label={initials(card.name).toUpperCase()}
                      size={34}
                    />
                    <strong>{shortName(card.name)}</strong>
                    <PositionBadge position={card.position} />
                  </li>
                ))}
            </ol>
          </section>
        ))}
        <div className="reveal-deck" aria-hidden="true">
          {phase === "final" ? (
            <span className="reveal-vs">VS</span>
          ) : (
            <>
              {Array.from({ length: Math.min(4, Math.max(remaining, 1)) }).map(
                (_, index) => (
                  <span
                    className="deck-card"
                    key={index}
                    style={{ "--i": index } as React.CSSProperties}
                  >
                    <BrandMark width={56} ink="#f4f7ee" ballInk="#14291d" />
                  </span>
                ),
              )}
              <small>{remaining}</small>
            </>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {phase === "final"
          ? `Equipos listos: ${sides.map((team) => team.name).join(" contra ")}.`
          : ""}
      </p>
      {phase === "final" && (
        <footer className="reveal-footer">
          <strong className="reveal-slogan">¡Que gane el fútbol!</strong>
          <Button ref={finalRef} size="lg" onClick={() => close(true)}>
            Ver la cancha
          </Button>
          <button
            type="button"
            className="reveal-auto"
            onClick={disableAuto}
            disabled={autoOff}
          >
            {autoOff
              ? "Listo: no se abrirá sola"
              : "No abrir el sorteo automáticamente"}
          </button>
        </footer>
      )}
    </div>
  );
}
