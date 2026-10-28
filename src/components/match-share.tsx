"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import type { MatchInfo } from "@/lib/contracts";
import { generateWhatsAppLink } from "@/lib/utils/whatsapp";
import { Button } from "./ui/button";

export function MatchShare({
  match,
  confirmed,
}: {
  match: MatchInfo;
  confirmed: number;
}) {
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [fallback, setFallback] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setUrl(`${window.location.origin}/p/${match.slug}`);
  }, [match.slug]);
  useEffect(() => {
    if (fallback) {
      input.current?.focus();
      input.current?.select();
    }
  }, [fallback]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setFallback(false);
      setNotice("Enlace copiado. Pásalo al grupo.");
    } catch {
      setFallback(true);
      setNotice("Selecciona el enlace y cópialo para compartirlo.");
    }
  }
  return (
    <section className="match-share" aria-label="Compartir partido">
      <div className="share-buttons">
        <Button variant="outline" disabled={!url} onClick={copy}>
          <Copy /> Copiar enlace
        </Button>
        <Button asChild disabled={!url}>
          <a
            href={
              url
                ? generateWhatsAppLink({
                    title: match.title,
                    startsAt: new Date(match.starts_at),
                    spotsRemaining: Math.max(0, match.capacity - confirmed),
                    capacity: match.capacity,
                    matchUrl: url,
                    finished: match.status === "finished",
                  })
                : undefined
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle /> Compartir por WhatsApp
          </a>
        </Button>
      </div>
      {fallback && (
        <label>
          Enlace del partido
          <input
            ref={input}
            value={url}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
