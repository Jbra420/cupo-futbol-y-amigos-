"use client";
import { MatchLocation } from "./match-location";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  CalendarDays,
  MapPin,
  Coins,
  CheckCircle2,
  Users,
  Clock3,
} from "lucide-react";
import { AppHeader } from "./app-header";
import { Button } from "./ui/button";
import { MatchShare } from "./match-share";
import { PositionBadge } from "./position-badge";
import { ReadonlyPitch } from "./pitch";
import { createClient } from "@/lib/supabase/client";
import { ensurePlayerSession } from "@/lib/player-session";
import { useMatchRealtime } from "@/hooks/use-match-realtime";
import { publicSnapshotSchema, type PublicSnapshot } from "@/lib/contracts";
import { joinMatchSchema, publicErrorMessage } from "@/lib/validation";
import { spotsLabel } from "@/lib/utils/spots";
import { formatMatchDate, formatPrice } from "@/lib/date";
import {
  POSITIONS,
  POSITION_ICONS,
  POSITION_LABELS,
} from "@/lib/utils/positions";
import type { Position } from "@/types/database";

const mySchema = z.object({
  registration_id: z.uuid(),
  status: z.enum(["confirmed", "waitlist", "cancelled"]),
  waitlist_position: z.number().nullable(),
});
export function PublicMatch({ initial }: { initial: PublicSnapshot }) {
  const [data, setData] = useState(initial);
  const [mine, setMine] = useState<z.infer<typeof mySchema> | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>("MED");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = createClient();
  const refresh = useCallback(async () => {
    const client = createClient();
    const [publicResult, myResult] = await Promise.all([
      client.rpc("get_public_match", { p_slug: initial.match.slug }),
      client.rpc("get_my_registration", { p_slug: initial.match.slug }),
    ]);
    const snapshot = publicSnapshotSchema.safeParse(publicResult.data);
    if (snapshot.success)
      setData((current) =>
        snapshot.data.match.revision >= current.match.revision
          ? snapshot.data
          : current,
      );
    const own = mySchema.safeParse(myResult.data);
    setMine(own.success ? own.data : null);
  }, [initial.match.slug]);
  useEffect(() => {
    let active = true;
    try {
      const last = JSON.parse(localStorage.getItem("cupo-player") ?? "null");
      if (last?.name) setName(String(last.name).slice(0, 60));
      if (POSITIONS.includes(last?.position)) setPosition(last.position);
    } catch {
      /* Storage is optional. */
    }
    ensurePlayerSession()
      .then(async () => {
        if (active) {
          setReady(true);
          await refresh();
        }
      })
      .catch(() => {
        if (active)
          setError(
            "No pudimos conectar. Recarga la página para intentar de nuevo.",
          );
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  const live = useMatchRealtime(
    data.match.id,
    () => {
      void refresh();
    },
    ready,
  );
  const confirmed = data.registrations.filter(
    (registration) => registration.status === "confirmed",
  );
  const waitlist = data.registrations.filter(
    (registration) => registration.status === "waitlist",
  );
  const remaining = Math.max(0, data.match.capacity - confirmed.length);
  const finished = data.match.status === "finished";
  async function join(event: FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = joinMatchSchema.safeParse({ playerName: name, position });
    if (!parsed.success) {
      setError("Escribe tu nombre y elige una posición.");
      return;
    }
    setBusy(true);
    try {
      await ensurePlayerSession();
      const result = await client.rpc("join_match", {
        p_slug: data.match.slug,
        p_name: parsed.data.playerName,
        p_position: position,
      });
      if (result.error) {
        setError(publicErrorMessage(result.error));
        return;
      }
      const own = mySchema.safeParse(result.data);
      if (own.success) setMine(own.data);
      try {
        localStorage.setItem(
          "cupo-player",
          JSON.stringify({ name: parsed.data.playerName, position }),
        );
      } catch {
        /* Storage is optional. */
      }
      await refresh();
    } catch {
      setError("No pudimos reservar tu cupo. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (
      !mine ||
      !window.confirm(
        "¿Cancelar tu cupo? Si hay alguien en espera, tomará tu lugar.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await client.rpc("cancel_registration", {
        p_registration_id: mine.registration_id,
      });
      if (result.error) setError(publicErrorMessage(result.error));
      else {
        setMine(null);
        await refresh();
      }
    } catch {
      setError("No pudimos cancelar el cupo. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workspace public-workspace">
      <AppHeader />
      <main id="contenido" className="workspace-main">
        <div className="public-heading">
          <p className="overline">EL PLAN YA ESTÁ ARMADO</p>
          <h1>{data.match.title}</h1>
          <div className="match-facts">
            <span>
              <CalendarDays />
              {formatMatchDate(data.match.starts_at)}
            </span>
            <span>
              <MapPin />
              {data.match.location}
            </span>
            <span>
              <Coins />
              {formatPrice(data.match.price_per_player)} por jugador
            </span>
          </div>
        </div>
        <MatchShare match={data.match} confirmed={confirmed.length} />
        <MatchLocation
          location={data.match.location}
          mapsUrl={data.match.maps_url}
        />
        <div className="public-layout">
          <div className="public-roster">
            <section className="card spots-card">
              <div className="section-heading">
                <h2 aria-live="polite">
                  {finished
                    ? "Partido finalizado"
                    : remaining
                      ? spotsLabel(remaining)
                      : "¡Cupos completos!"}
                </h2>
                <span>
                  {confirmed.length}/{data.match.capacity}
                </span>
              </div>
              <progress
                aria-label="Cupos confirmados"
                value={confirmed.length}
                max={data.match.capacity}
              />
              <p>
                <span className={`connection-dot ${live ? "live" : ""}`} />
                {live
                  ? "Actualizado en tiempo real"
                  : "Conectando con la cancha…"}
              </p>
            </section>
            <section className="card roster-card">
              <div className="section-heading">
                <h2>
                  <Users /> Los que ya están
                </h2>
                <span>{confirmed.length} confirmados</span>
              </div>
              {confirmed.length === 0 ? (
                <p className="empty-copy">
                  El primero se lleva el honor. ¡Apúntate!
                </p>
              ) : (
                confirmed.map((registration, index) => (
                  <div
                    className={`roster-row ${mine?.registration_id === registration.id ? "own" : ""}`}
                    key={registration.id}
                  >
                    <span className="row-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>
                      {registration.player_name}
                      {mine?.registration_id === registration.id && (
                        <small> · Tú</small>
                      )}
                    </strong>
                    <PositionBadge position={registration.position} />
                  </div>
                ))
              )}
            </section>
            <section className="card roster-card">
              <div className="section-heading">
                <h2>
                  <Clock3 /> En la lista de espera
                </h2>
                <span>{waitlist.length}</span>
              </div>
              {waitlist.length === 0 ? (
                <p className="empty-copy">
                  Si se llena el partido, los siguientes quedan aquí.
                </p>
              ) : (
                waitlist.map((registration, index) => (
                  <div className="roster-row" key={registration.id}>
                    <span className="row-number">#{index + 1}</span>
                    <strong>{registration.player_name}</strong>
                    <PositionBadge position={registration.position} />
                  </div>
                ))
              )}
            </section>
          </div>
          <aside className="card join-card">
            {finished ? (
              <>
                <CheckCircle2 size={30} />
                <h2>Hasta el próximo partido.</h2>
                <p>
                  Este encuentro ya terminó y las inscripciones están cerradas.
                </p>
              </>
            ) : mine ? (
              <>
                <CheckCircle2 size={32} className="text-primary" />
                <p className="overline">TU LUGAR EN EL PARTIDO</p>
                <h2 aria-live="polite">
                  {mine.status === "confirmed"
                    ? "Estás confirmado"
                    : `Estás #${mine.waitlist_position} en la lista de espera`}
                </h2>
                <p>
                  {mine.status === "confirmed"
                    ? "Prepara los zapatos. Nos vemos en la cancha."
                    : "Si alguien cancela, te confirmamos aquí automáticamente."}
                </p>
                <Button variant="outline" disabled={busy} onClick={cancel}>
                  {busy ? "Actualizando…" : "Cancelar mi cupo"}
                </Button>
              </>
            ) : (
              <form onSubmit={join}>
                <p className="overline">
                  {remaining
                    ? "HAY UN LUGAR PARA TI"
                    : "EL PRÓXIMO CUPO PUEDE SER TUYO"}
                </p>
                <h2>{remaining ? "¿Te apuntas?" : "Súmate a la espera."}</h2>
                <label>
                  Tu nombre
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={60}
                    autoComplete="name"
                    placeholder="Nombre y apellido"
                  />
                </label>
                <fieldset>
                  <legend>¿Dónde juegas?</legend>
                  <div className="position-picker">
                    {POSITIONS.map((item) => (
                      <button
                        type="button"
                        key={item}
                        aria-pressed={position === item}
                        onClick={() => setPosition(item)}
                        style={
                          {
                            "--role-color": `var(--position-${item.toLowerCase()})`,
                          } as React.CSSProperties
                        }
                      >
                        <span aria-hidden="true">{POSITION_ICONS[item]}</span>
                        <strong>{item}</strong>
                        <small>{POSITION_LABELS[item]}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Button disabled={busy || !ready} className="join-submit">
                  {busy
                    ? "Reservando tu lugar…"
                    : remaining
                      ? "Confirmar mi cupo"
                      : "Unirme a la lista de espera"}
                </Button>
                <small>
                  Sin registro. Solo tu nombre y las ganas de jugar.
                </small>
              </form>
            )}
            {error && (
              <p className="feedback error" role="alert">
                {error}
              </p>
            )}
          </aside>
        </div>
        {data.teams.length > 0 && (
          <section className="card roster-card public-lineup">
            <p className="overline">ASÍ SALIMOS A LA CANCHA</p>
            <h2>Los equipos están listos.</h2>
            <ReadonlyPitch
              teams={data.teams}
              players={data.registrations}
              assignments={data.assignments}
            />
            <div className="teams-columns">
              {data.teams.map((team) => (
                <section key={team.id}>
                  <h3>
                    <i style={{ background: team.color }} aria-hidden="true" />
                    {team.name}
                  </h3>
                  {data.assignments
                    .filter((assignment) => assignment.team_id === team.id)
                    .map((assignment) => {
                      const registration = confirmed.find(
                        (item) => item.id === assignment.registration_id,
                      );
                      return registration ? (
                        <div className="roster-row" key={registration.id}>
                          <strong>{registration.player_name}</strong>
                          <PositionBadge position={registration.position} />
                        </div>
                      ) : null;
                    })}
                </section>
              ))}
            </div>
          </section>
        )}
      </main>
      <footer className="workspace-footer">
        La hora del partido se muestra en America/Guayaquil.
      </footer>
    </div>
  );
}
