"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Share2 } from "lucide-react";
import type { MatchInfo } from "@/lib/contracts";
import type { Position } from "@/types/database";
import { formatMatchDate } from "@/lib/date";
import { POSITION_COLORS, POSITION_LABELS } from "@/lib/utils/positions";
import { prefersReducedMotion, shirtNumber } from "@/lib/motion";
import { BrandMark } from "./brand-mark";
import { Jersey } from "./jersey";
import { Button } from "./ui/button";

/**
 * Pase de jugador: aparece girando al confirmarse, brilla al mover el puntero
 * o inclinar el teléfono y se comparte como imagen.
 */
export function PlayerPass({
  match,
  registrationId,
  name,
  position,
  status,
  waitlistPosition,
  celebrate,
}: {
  match: MatchInfo;
  registrationId: string;
  name: string;
  position: Position;
  status: "confirmed" | "waitlist" | "cancelled";
  waitlistPosition: number | null | undefined;
  celebrate: boolean;
}) {
  const card = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const number = shirtNumber(registrationId);
  const accent = POSITION_COLORS[position];
  const confirmed = status === "confirmed";

  function tilt(x: number, y: number) {
    const node = card.current;
    if (!node) return;
    node.style.setProperty("--mx", `${x * 100}%`);
    node.style.setProperty("--my", `${y * 100}%`);
    node.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
    node.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    tilt(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
    );
  }
  function reset() {
    tilt(0.5, 0.5);
  }
  useEffect(() => {
    if (prefersReducedMotion()) return;
    // En teléfonos que lo permiten sin pedir permiso, el brillo sigue la inclinación.
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      const x = Math.min(1, Math.max(0, 0.5 + event.gamma / 60));
      const y = Math.min(1, Math.max(0, 0.5 + (event.beta - 45) / 60));
      tilt(x, y);
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  async function share() {
    if (!card.current || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const { toBlob } = await import("html-to-image");
      const node = card.current;
      node.classList.add("exporting");
      const blob = await toBlob(node, {
        pixelRatio: 3,
        cacheBust: true,
        skipFonts: true,
        backgroundColor: "transparent",
      });
      node.classList.remove("exporting");
      if (!blob) throw new Error();
      const file = new File([blob], `pase-cupo-${match.slug}.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: confirmed ? "Ya estoy dentro" : "Estoy en la banca",
          text: `${match.title} · ${window.location.href}`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        setNotice("Pase descargado. Súbelo a tus estados.");
      }
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError"))
        setNotice("No pudimos crear la imagen del pase.");
    } finally {
      card.current?.classList.remove("exporting");
      setBusy(false);
    }
  }

  return (
    <div className="player-pass-wrap">
      <div
        ref={card}
        className={`player-pass ${celebrate ? "pass-enter" : ""} ${confirmed ? "" : "is-bench"}`}
        style={{ "--pass-accent": accent } as React.CSSProperties}
        onPointerMove={onPointerMove}
        onPointerLeave={reset}
        role="group"
        aria-label={`Pase de ${name}: ${confirmed ? "confirmado" : `suplente número ${waitlistPosition ?? ""}`}`}
      >
        <div className="pass-shine" aria-hidden="true" />
        <div className="pass-top">
          <BrandMark
            width={78}
            ink="#f4f7ee"
            accent={accent}
            ballInk="#14291d"
          />
          <span>PASE DE JUGADOR</span>
        </div>
        <div className="pass-body">
          <Jersey color={accent} label={String(number)} size={92} />
          <div>
            <span className="pass-number">Dorsal {number}</span>
            <strong className="pass-name">{name}</strong>
            <span className="pass-role">{POSITION_LABELS[position]}</span>
          </div>
        </div>
        <div className="pass-match">
          <strong>{match.title}</strong>
          <span>{formatMatchDate(match.starts_at)}</span>
          <span>{match.location}</span>
        </div>
        <div className="pass-footer">
          <span className="pass-status">
            {confirmed ? "CONFIRMADO" : `SUPLENTE #${waitlistPosition ?? "–"}`}
          </span>
          <span className="pass-code">#{match.slug.toUpperCase()}</span>
        </div>
      </div>
      <Button variant="outline" onClick={share} disabled={busy}>
        <Share2 /> {busy ? "Preparando pase…" : "Compartir mi pase"}
      </Button>
      {notice && (
        <p className="pass-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
