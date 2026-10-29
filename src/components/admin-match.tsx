"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  MapPin,
  Plus,
  Check,
  X,
  ExternalLink,
  Settings2,
} from "lucide-react";
import { adminSnapshotSchema, type AdminSnapshot } from "@/lib/contracts";
import { formatMatchDate } from "@/lib/date";
import { useMatchRealtime } from "@/hooks/use-match-realtime";
import { POSITIONS, POSITION_LABELS } from "@/lib/utils/positions";
import { Button } from "./ui/button";
import { MatchShare } from "./match-share";
import { PositionBadge } from "./position-badge";
import { TeamEditor } from "./team-editor";
import { MatchLocation, MapsLinkField } from "./match-location";

export function AdminMatch({ initial }: { initial: AdminSnapshot }) {
  const [data, setData] = useState(initial);
  const acceptSnapshot = useCallback((next: AdminSnapshot) => {
    setData((current) =>
      next.match.revision >= current.match.revision ? next : current,
    );
  }, []);
  const [capacity, setCapacity] = useState(initial.match.capacity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingRevision, setEditingRevision] = useState(
    initial.match.revision,
  );
  const url = `/api/partidos/${initial.match.slug}/admin`;
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.status === 403) {
        window.location.assign("/panel");
        return;
      }
      const parsed = adminSnapshotSchema.safeParse(await response.json());
      if (parsed.success)
        setData((current) =>
          parsed.data.match.revision >= current.match.revision
            ? parsed.data
            : current,
        );
    } catch {
      /* Existing snapshot remains usable during reconnection. */
    }
  }, [url]);
  const live = useMatchRealtime(initial.match.id, () => {
    void refresh();
  });
  useEffect(() => {
    setCapacity(data.match.capacity);
  }, [data.match.capacity]);
  const confirmed = data.registrations.filter(
    (registration) => registration.status === "confirmed",
  );
  const waiting = data.registrations.filter(
    (registration) => registration.status === "waitlist",
  );
  const finished = data.match.status === "finished";
  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const parsed = adminSnapshotSchema.parse(result);
      acceptSnapshot(parsed);
      setNotice("Cambios guardados.");
      return true;
    } catch (error) {
      setError(
        error instanceof Error && error.message !== "Failed to fetch"
          ? error.message
          : "No pudimos guardar. Revisa tu conexión.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveCapacity() {
    if (
      capacity < confirmed.length &&
      !window.confirm(
        `Al reducir a ${capacity} cupos, ${confirmed.length - capacity} jugadores pasarán a la lista de espera. ¿Continuar?`,
      )
    )
      return;
    await mutate({ action: "capacity", capacity });
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    if (
      await mutate({
        action: "add",
        name: form.get("name"),
        position: form.get("position"),
      })
    )
      element.reset();
  }
  async function details(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextCapacity = Number(form.get("capacity"));
    if (
      nextCapacity < confirmed.length &&
      !window.confirm(
        `Al reducir a ${nextCapacity} jugadores, ${confirmed.length - nextCapacity} pasarán a la lista de espera. ¿Continuar?`,
      )
    )
      return;
    if (
      await mutate({
        action: "details",
        capacity: nextCapacity,
        revision: editingRevision,
        title: form.get("title"),
        location: form.get("location"),
        mapsUrl: form.get("mapsUrl"),
        startsAt: form.get("startsAt"),
        price: form.get("price") ? Number(form.get("price")) : null,
      })
    )
      setEditing(false);
  }
  return (
    <>
      <Link href="/panel" className="back-link">
        ← Tus partidos
      </Link>
      <div className="page-heading">
        <div>
          <p className="overline">TÚ ARMAS EL PARTIDO</p>
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
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/p/${data.match.slug}`}>
            <ExternalLink /> Ver página del partido
          </Link>
        </Button>
      </div>
      <div className="admin-toolbar">
        <span className="status-pill">
          {finished
            ? "Finalizado"
            : data.match.status === "teams_ready"
              ? "Equipos listos"
              : `${confirmed.length}/${data.match.capacity} confirmados`}
        </span>
        <span className="live-label">
          <span className={`connection-dot ${live ? "live" : ""}`} />
          {live ? "En vivo" : "Conectando…"}
        </span>
        {!finished && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (!editing) setEditingRevision(data.match.revision);
              setEditing(!editing);
            }}
          >
            <Settings2 />
            {editing ? "Cerrar edición" : "Editar partido"}
          </Button>
        )}
      </div>
      <MatchShare match={data.match} confirmed={confirmed.length} />
      <MatchLocation
        location={data.match.location}
        mapsUrl={data.match.maps_url}
      />
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="feedback success" role="status">
          {notice}
        </p>
      )}
      {editing && (
        <form className="card edit-details" onSubmit={details}>
          <label>
            Nombre del partido
            <input
              name="title"
              required
              maxLength={100}
              defaultValue={data.match.title}
            />
          </label>
          <label>
            Fecha y hora
            <input
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={new Date(
                new Date(data.match.starts_at).getTime() - 5 * 3600000,
              )
                .toISOString()
                .slice(0, 16)}
            />
          </label>
          <label>
            Número de jugadores
            <input
              name="capacity"
              aria-label="Número de jugadores"
              aria-describedby="event-capacity-help"
              type="number"
              required
              min={6}
              max={22}
              step={2}
              defaultValue={data.match.capacity}
            />
            <small id="event-capacity-help">
              Elige un número par entre 6 y 22.
            </small>
          </label>
          <label>
            Lugar
            <input
              name="location"
              required
              maxLength={200}
              defaultValue={data.match.location}
            />
          </label>
          <MapsLinkField defaultValue={data.match.maps_url} />
          <label>
            Precio por jugador
            <input
              name="price"
              type="number"
              min="0"
              step=".01"
              defaultValue={data.match.price_per_player ?? ""}
            />
          </label>
          <Button disabled={busy}>
            {busy ? "Guardando…" : "Guardar cambios del partido"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            Cancelar edición
          </Button>
        </form>
      )}
      <div className="admin-layout">
        <section className="card roster-card">
          <div className="section-heading">
            <h2>Jugadores del partido</h2>
            <span>
              {confirmed.length} confirmados · {waiting.length} en espera
            </span>
          </div>
          {data.registrations.length === 0 ? (
            <p className="empty-copy">
              Todavía no se apunta nadie. Comparte el enlace o agrega jugadores
              aquí.
            </p>
          ) : (
            ["confirmed", "waitlist"].map((status) => (
              <section key={status} className="admin-roster-group">
                <h3>
                  {status === "confirmed" ? "Confirmados" : "Lista de espera"}
                </h3>
                {data.registrations
                  .filter((registration) => registration.status === status)
                  .map((registration) => (
                    <div
                      className="roster-row admin-player"
                      key={registration.id}
                    >
                      <strong>{registration.player_name}</strong>
                      <PositionBadge position={registration.position} />
                      <Button
                        variant={registration.paid ? "default" : "outline"}
                        size="icon"
                        aria-label={`${registration.paid ? "Desmarcar pago" : "Marcar pago"} de ${registration.player_name}`}
                        aria-pressed={registration.paid}
                        disabled={busy || finished}
                        onClick={() => {
                          void mutate({
                            action: "paid",
                            registrationId: registration.id,
                            paid: !registration.paid,
                          });
                        }}
                      >
                        <Check />
                      </Button>
                      {!finished && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar a ${registration.player_name}`}
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Quitar a ${registration.player_name} del partido?`,
                              )
                            )
                              void mutate({
                                action: "cancel",
                                registrationId: registration.id,
                              });
                          }}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                  ))}
              </section>
            ))
          )}
        </section>
        <aside className="admin-aside">
          <section className="card capacity-control">
            <div className="section-heading">
              <h2>Cupos totales</h2>
              <strong>{capacity}</strong>
            </div>
            <label className="sr-only" htmlFor="admin-capacity">
              Cupos del partido
            </label>
            <input
              id="admin-capacity"
              type="range"
              min={6}
              max={22}
              step={2}
              value={capacity}
              disabled={busy || finished}
              onChange={(event) => setCapacity(Number(event.target.value))}
            />
            <div className="range-labels">
              <span>6 jugadores</span>
              <span>22 jugadores</span>
            </div>
            <Button
              variant="outline"
              disabled={busy || finished || capacity === data.match.capacity}
              onClick={saveCapacity}
            >
              Guardar cupos
            </Button>
            <small>
              Si aumentas cupos, los primeros en espera se confirman
              automáticamente.
            </small>
          </section>
          {!finished && (
            <form className="card player-form" onSubmit={add}>
              <h2>Agregar a un jugador</h2>
              <label>
                Nombre
                <input
                  name="name"
                  required
                  maxLength={60}
                  placeholder="Nombre y apellido"
                />
              </label>
              <label>
                Posición
                <select name="position" defaultValue="MED">
                  {POSITIONS.map((position) => (
                    <option value={position} key={position}>
                      {POSITION_LABELS[position]}
                    </option>
                  ))}
                </select>
              </label>
              <Button disabled={busy}>
                Agregar al partido <Plus />
              </Button>
            </form>
          )}
        </aside>
      </div>
      <TeamEditor snapshot={data} onSaved={acceptSnapshot} />
      {!finished && (
        <div className="finish-row">
          <p>
            Cuando termine el encuentro, cierra las inscripciones y conserva la
            alineación.
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "¿Finalizar el partido? Las inscripciones y alineaciones quedarán en modo de consulta.",
                )
              )
                void mutate({ action: "finish" });
            }}
          >
            Finalizar partido
          </Button>
        </div>
      )}
    </>
  );
}
