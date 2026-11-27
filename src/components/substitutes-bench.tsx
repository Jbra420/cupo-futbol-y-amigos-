"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicRegistration } from "@/lib/contracts";
import { POSITION_COLORS } from "@/lib/utils/positions";
import { shortName } from "@/lib/teams/layout";
import { Jersey } from "./jersey";
import { initials } from "./pitch";

const SEAT = 68;
const EXIT_MS = 1100;

type Leaver = {
  player: PublicRegistration;
  index: number;
  promoted: boolean;
  key: number;
};

/**
 * Banca de suplentes: la lista de espera sentada en orden. Cuando alguien
 * cancela, los demás se corren hacia la cancha; quien sube, salta a jugar.
 */
export function SubstitutesBench({
  waitlist,
  confirmedIds,
  mineId,
}: {
  waitlist: PublicRegistration[];
  confirmedIds: Set<string>;
  mineId: string | null;
}) {
  const [leavers, setLeavers] = useState<Leaver[]>([]);
  const previous = useRef<PublicRegistration[] | null>(null);
  const confirmedRef = useRef(confirmedIds);
  confirmedRef.current = confirmedIds;
  const key = waitlist.map((player) => player.id).join();
  const exits = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const before = previous.current;
    previous.current = waitlist;
    if (!before) return;
    const now = new Set(waitlist.map((player) => player.id));
    const gone = before
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => !now.has(player.id));
    if (gone.length === 0) return;
    const stamp = ++exits.current;
    setLeavers((list) => [
      ...list,
      ...gone.map(({ player, index }) => ({
        player,
        index,
        promoted: confirmedRef.current.has(player.id),
        key: stamp,
      })),
    ]);
    // Cada salida limpia su propia ficha aunque la lista vuelva a cambiar.
    timers.current.push(
      setTimeout(
        () => setLeavers((list) => list.filter((item) => item.key !== stamp)),
        EXIT_MS,
      ),
    );
    // `key` resume la lista; el arreglo se recrea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const seats = Math.max(waitlist.length, 3);
  return (
    <div className="bench" aria-hidden="true">
      <div className="bench-gate">
        <span>A la cancha</span>
        <i />
      </div>
      <div className="bench-dugout" style={{ width: seats * SEAT + 24 }}>
        <div className="bench-roof" />
        <div className="bench-seats">
          {waitlist.map((player, index) => {
            const mine = player.id === mineId;
            return (
              <div
                key={player.id}
                className={`bench-player ${mine ? "is-mine" : ""} ${index === 0 ? "is-next" : ""}`}
                style={
                  {
                    transform: `translateX(${index * SEAT}px)`,
                    "--seat": index,
                  } as React.CSSProperties
                }
              >
                {mine && <span className="bench-you">Tú</span>}
                <Jersey
                  color={POSITION_COLORS[player.position]}
                  label={initials(player.player_name).toUpperCase()}
                  size={46}
                />
                <small>{shortName(player.player_name)}</small>
                <b>#{index + 1}</b>
              </div>
            );
          })}
          {leavers.map(({ player, index, promoted, key }) => (
            <div
              key={`${player.id}-${key}`}
              className={`bench-player is-leaving ${promoted ? "is-promoted" : "is-gone"}`}
              style={{ transform: `translateX(${index * SEAT}px)` }}
            >
              {promoted && <span className="bench-cheer">¡Entra!</span>}
              <Jersey
                color={POSITION_COLORS[player.position]}
                label={initials(player.player_name).toUpperCase()}
                size={46}
              />
              <small>{shortName(player.player_name)}</small>
            </div>
          ))}
        </div>
        <div className="bench-plank" />
        <div className="bench-legs" />
      </div>
    </div>
  );
}
