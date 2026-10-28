"use client";
import { useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import type {
  Assignment,
  MatchInfo,
  PublicRegistration,
  TeamInfo,
} from "@/lib/contracts";
import { formatMatchDate } from "@/lib/date";
import { ReadonlyPitch } from "./pitch";
import { Button } from "./ui/button";

export function LineupShare({
  match,
  teams,
  players,
  assignments,
  disabled,
}: {
  match: MatchInfo;
  teams: TeamInfo[];
  players: PublicRegistration[];
  assignments: Assignment[];
  disabled: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function exportImage(share: boolean) {
    if (!node.current || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await document.fonts.ready;
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#14291d",
        skipFonts: true,
      });
      if (!blob) throw new Error();
      const filename = `futbol-y-amigos-${match.slug}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: match.title });
        setNotice("Alineación compartida.");
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        setNotice("PNG descargado. Ya puedes enviarlo a tu grupo.");
      }
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError"))
        setError("No pudimos crear la imagen. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="lineup-sharing">
      <div className="share-buttons">
        <Button
          disabled={disabled || busy}
          onClick={() => {
            void exportImage(true);
          }}
        >
          <Share2 />
          {busy ? "Preparando imagen…" : "Compartir alineación"}
        </Button>
        <Button
          variant="outline"
          disabled={disabled || busy}
          onClick={() => {
            void exportImage(false);
          }}
        >
          <Download /> Descargar PNG
        </Button>
      </div>
      {disabled && (
        <small>
          Publica la alineación y guarda tus cambios para compartirla.
        </small>
      )}
      {notice && (
        <p role="status" className="feedback success">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="feedback error">
          {error}
        </p>
      )}
      <div className="lineup-export-stage" aria-hidden="true">
        <div ref={node} className="lineup-export">
          <div className="export-heading">
            <strong>
              Fútbol y amigos<span>.</span>
            </strong>
            <span>ASÍ SALIMOS A LA CANCHA</span>
          </div>
          <h2>{match.title}</h2>
          <p>
            {formatMatchDate(match.starts_at)} · {match.location}
          </p>
          <ReadonlyPitch
            teams={teams}
            players={players}
            assignments={assignments}
          />
          <div className="export-rosters">
            {teams.map((team) => (
              <section key={team.id}>
                <h3>
                  <i style={{ background: team.color }} />
                  {team.name}
                </h3>
                {assignments
                  .filter((assignment) => assignment.team_id === team.id)
                  .map((assignment) => {
                    const player = players.find(
                      (item) => item.id === assignment.registration_id,
                    );
                    return player ? (
                      <div key={player.id}>
                        <span>{player.player_name}</span>
                        <small>{player.position}</small>
                      </div>
                    ) : null;
                  })}
              </section>
            ))}
          </div>
          <footer>Más fútbol. Menos mensajes. · Fútbol y amigos</footer>
        </div>
      </div>
    </div>
  );
}
