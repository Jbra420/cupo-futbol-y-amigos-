"use client";
import { MatchLocation } from "./match-location";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { z } from "zod";
import {
  CalendarDays,
  MapPin,
  Coins,
  CheckCircle2,
  Users,
  Clock3,
  Sparkles,
} from "lucide-react";
import { AppHeader } from "./app-header";
import { Button } from "./ui/button";
import { MatchShare } from "./match-share";
import { PositionBadge } from "./position-badge";
import { ReadonlyPitch } from "./pitch";
import { PlayerPass } from "./player-pass";
import { PositionPreview } from "./position-preview";
import { Jersey } from "./jersey";
import { SubstitutesBench } from "./substitutes-bench";
import { REVEAL_AUTO_KEY, TeamReveal, revealSignature } from "./team-reveal";
import { launchConfetti } from "@/lib/confetti";
import { haptic } from "@/lib/motion";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { createClient } from "@/lib/supabase/client";
import { ensurePlayerSession } from "@/lib/player-session";
import { useMatchRealtime } from "@/hooks/use-match-realtime";
import { publicSnapshotSchema, type PublicSnapshot } from "@/lib/contracts";
import { joinMatchSchema, publicErrorMessage } from "@/lib/validation";
import { spotsLabel } from "@/lib/utils/spots";
import { formatMatchDate, formatPrice } from "@/lib/date";
import {
  POSITIONS,
  POSITION_COLORS,
  POSITION_LABELS,
} from "@/lib/utils/positions";
import type { Position } from "@/types/database";

const mySchema = z.object({
  registration_id: z.uuid(),
  status: z.enum(["confirmed", "waitlist", "cancelled"]),
  waitlist_position: z.number().nullable(),
});
type Toast = { id: string; text: string; position: Position };
const CELEBRATION_COLORS = ["#c5e86c", "#ffffff", "#16a34a"];
export function PublicMatch({ initial }: { initial: PublicSnapshot }) {
  const [data, setData] = useState(initial);
  const [mine, setMine] = useState<z.infer<typeof mySchema> | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>("MED");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const submitRef = useRef<HTMLButtonElement>(null);
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
  const shownConfirmed = useAnimatedNumber(confirmed.length);
  const confirmedIdSet = new Set(confirmed.map((item) => item.id));
  const urgent = !finished && remaining > 0 && remaining <= 2;
  const fillPercent = Math.min(
    100,
    (confirmed.length / Math.max(1, data.match.capacity)) * 100,
  );
  const mineRef = useRef(mine);
  mineRef.current = mine;
  // Detecta quién entra en vivo para anunciarlo y animar su fila.
  const knownIds = useRef<Set<string> | null>(null);
  const confirmedKey = confirmed.map((item) => item.id).join();
  useEffect(() => {
    const current = new Set(confirmed.map((item) => item.id));
    const previous = knownIds.current;
    knownIds.current = current;
    if (!previous) return;
    const arrivals = confirmed.filter((item) => !previous.has(item.id));
    if (arrivals.length === 0) return;
    setFreshIds(new Set(arrivals.map((item) => item.id)));
    const others = arrivals.filter(
      (item) => item.id !== mineRef.current?.registration_id,
    );
    if (others.length > 0) {
      setToasts((list) =>
        [
          ...list,
          ...others.map((item) => ({
            id: `${item.id}-${Date.now()}`,
            text: `${item.player_name} acaba de entrar`,
            position: item.position,
          })),
        ].slice(-3),
      );
      haptic(12);
    }
    const timer = setTimeout(() => setFreshIds(new Set()), 1600);
    return () => clearTimeout(timer);
    // confirmedKey resume la lista; evitar depender del arreglo recreado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedKey]);
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((list) => list.slice(1)), 4200);
    return () => clearTimeout(timer);
  }, [toasts]);
  // Subir de la banca a la cancha también se celebra.
  const previousStatus = useRef<string | null>(null);
  useEffect(() => {
    const status = mine?.status ?? null;
    if (previousStatus.current === "waitlist" && status === "confirmed") {
      setCelebrate(true);
      setToasts((list) => [
        ...list,
        {
          id: `promo-${Date.now()}`,
          text: "¡Se liberó un cupo y entras a la cancha!",
          position: "MED",
        },
      ]);
      launchConfetti({ colors: CELEBRATION_COLORS });
      haptic([30, 50, 90]);
    }
    previousStatus.current = status;
  }, [mine?.status]);
  // La ceremonia del sorteo se abre sola una vez por alineación publicada.
  const [revealOpen, setRevealOpen] = useState(false);
  const lineupRef = useRef<HTMLElement>(null);
  const revealButtonRef = useRef<HTMLButtonElement>(null);
  const lineupReady =
    data.match.status === "teams_ready" &&
    data.teams.length >= 2 &&
    data.assignments.length > 0;
  const signature = lineupReady ? revealSignature(data.assignments) : "";
  useEffect(() => {
    if (!ready || !signature) return;
    const key = `cupo-reveal:${data.match.slug}:${signature}`;
    try {
      if (
        localStorage.getItem(REVEAL_AUTO_KEY) === "off" ||
        localStorage.getItem(key)
      )
        return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* Almacenamiento opcional. */
      }
      setRevealOpen(true);
    }, 700);
    return () => clearTimeout(timer);
  }, [ready, signature, data.match.slug]);
  const closeReveal = useCallback((showPitch: boolean) => {
    setRevealOpen(false);
    requestAnimationFrame(() => {
      if (showPitch)
        lineupRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      revealButtonRef.current?.focus({ preventScroll: showPitch });
    });
  }, []);
  const myRegistration = mine
    ? data.registrations.find((item) => item.id === mine.registration_id)
    : undefined;
  const joinRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [joinVisible, setJoinVisible] = useState(true);
  useEffect(() => {
    const target = joinRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setJoinVisible(entry.isIntersecting),
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const showStickyJoin = !finished && !mine && !joinVisible;
  function goToJoin() {
    joinRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    nameRef.current?.focus({ preventScroll: true });
  }
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
      if (own.success) {
        previousStatus.current = own.data.status;
        setMine(own.data);
        setCelebrate(true);
        const rect = submitRef.current?.getBoundingClientRect();
        launchConfetti({
          colors: [POSITION_COLORS[position], ...CELEBRATION_COLORS],
          origin: rect
            ? { x: rect.left + rect.width / 2, y: rect.top }
            : undefined,
          count: own.data.status === "confirmed" ? 110 : 50,
        });
        haptic(own.data.status === "confirmed" ? [30, 50, 90] : 25);
      }
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
        setCelebrate(false);
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
              {data.match.price_per_player === null
                ? "Precio por definir"
                : `${formatPrice(data.match.price_per_player)} por jugador`}
            </span>
          </div>
        </div>
        <section
          className={`card spots-card ${urgent ? "is-urgent" : ""} ${!finished && remaining === 0 ? "is-full" : ""}`}
        >
          <div className="section-heading">
            <h2 aria-live="polite">
              {finished
                ? "Partido finalizado"
                : remaining === 1
                  ? "¡Último cupo!"
                  : remaining
                    ? spotsLabel(remaining)
                    : "¡Cupos completos!"}
            </h2>
            <span className="spots-counter">
              <strong>{shownConfirmed}</strong>/{data.match.capacity}
            </span>
          </div>
          <div
            className="spots-track"
            style={{ "--fill": `${fillPercent}%` } as React.CSSProperties}
          >
            <progress
              aria-label="Cupos confirmados"
              value={confirmed.length}
              max={data.match.capacity}
            />
            <span
              className="spots-ball"
              aria-hidden="true"
              key={confirmed.length}
            />
          </div>
          {!finished && remaining === 0 && (
            <span className="full-stamp" aria-hidden="true">
              COMPLETO
            </span>
          )}
          <p>
            <span className={`connection-dot ${live ? "live" : ""}`} />
            {live ? "Actualizado en tiempo real" : "Conectando con la cancha…"}
          </p>
        </section>
        <div className="public-layout">
          <div className="public-roster">
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
                    className={`roster-row ${mine?.registration_id === registration.id ? "own" : ""} ${freshIds.has(registration.id) ? "is-new" : ""}`}
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
            {(waitlist.length > 0 || remaining === 0) && (
              <section className="card roster-card">
                <div className="section-heading">
                  <h2>
                    <Clock3 /> En la lista de espera
                  </h2>
                  <span>{waitlist.length}</span>
                </div>
                <SubstitutesBench
                  waitlist={waitlist}
                  confirmedIds={confirmedIdSet}
                  mineId={mine?.registration_id ?? null}
                />
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
            )}
          </div>
          <aside className="card join-card" id="unirme" ref={joinRef}>
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
                <PlayerPass
                  match={data.match}
                  registrationId={mine.registration_id}
                  name={myRegistration?.player_name ?? name}
                  position={myRegistration?.position ?? position}
                  status={mine.status}
                  waitlistPosition={mine.waitlist_position}
                  celebrate={celebrate}
                />
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
                    ref={nameRef}
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
                  <PositionPreview position={position} name={name} />
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
                        <span aria-hidden="true">
                          <Jersey
                            color={POSITION_COLORS[item]}
                            label=""
                            size={30}
                          />
                        </span>
                        <strong>{item}</strong>
                        <small>{POSITION_LABELS[item]}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Button
                  ref={submitRef}
                  disabled={busy || !ready}
                  className="join-submit"
                >
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
        <div className="public-extras">
          <MatchShare match={data.match} confirmed={confirmed.length} />
          <MatchLocation
            location={data.match.location}
            mapsUrl={data.match.maps_url}
          />
        </div>
        {data.teams.length > 0 && (
          <section className="card roster-card public-lineup" ref={lineupRef}>
            <div className="lineup-heading">
              <div>
                <p className="overline">ASÍ SALIMOS A LA CANCHA</p>
                <h2>Los equipos están listos.</h2>
              </div>
              {lineupReady && (
                <Button
                  ref={revealButtonRef}
                  variant="outline"
                  onClick={() => setRevealOpen(true)}
                >
                  <Sparkles /> Ver el sorteo
                </Button>
              )}
            </div>
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
      {revealOpen && (
        <TeamReveal
          match={data.match}
          teams={data.teams}
          players={data.registrations}
          assignments={data.assignments}
          onClose={closeReveal}
        />
      )}
      <div className="live-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            className="live-toast"
            key={toast.id}
            style={
              {
                "--toast-color": POSITION_COLORS[toast.position],
              } as React.CSSProperties
            }
          >
            <span className="toast-dot" aria-hidden="true" />
            <span>
              {toast.text}
              {!toast.id.startsWith("promo-") && (
                <small> · {toast.position}</small>
              )}
            </span>
          </div>
        ))}
      </div>
      {showStickyJoin && (
        <div className="sticky-join">
          <span>
            <strong>
              {confirmed.length}/{data.match.capacity}
            </strong>{" "}
            {remaining ? spotsLabel(remaining) : "Cupos completos"}
          </span>
          <Button onClick={goToJoin}>
            {remaining ? "Apuntarme" : "Lista de espera"}
          </Button>
        </div>
      )}
      <footer className="workspace-footer">
        La hora del partido se muestra en America/Guayaquil.
      </footer>
    </div>
  );
}
