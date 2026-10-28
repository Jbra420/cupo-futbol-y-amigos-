"use client";
import { useState, type FormEvent } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import type { Player } from "@/types/database";
import { POSITIONS, POSITION_LABELS } from "@/lib/utils/positions";
import { Button } from "./ui/button";

export function FrequentPlayers({ initial }: { initial: Player[] }) {
  const [players, setPlayers] = useState(initial);
  const [editing, setEditing] = useState<Player | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/jugadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          name: form.get("name"),
          preferred_position: form.get("position"),
          skill: Number(form.get("skill")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPlayers((current) =>
        [
          ...current.filter((player) => player.id !== result.player.id),
          result.player,
        ].sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
      setEditing(null);
      element.reset();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar al jugador.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(player: Player) {
    if (
      !window.confirm(`¿Eliminar a ${player.name} de tus jugadores frecuentes?`)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/jugadores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: player.id }),
      });
      if (!response.ok) throw new Error("No pudimos eliminar al jugador.");
      setPlayers((current) => current.filter((item) => item.id !== player.id));
      if (editing?.id === player.id) setEditing(null);
    } catch {
      setError("No pudimos eliminar al jugador. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="players-layout">
      <form
        className="card player-form"
        key={editing?.id ?? "new"}
        onSubmit={submit}
      >
        <h2>{editing ? "Editar jugador" : "Suma a uno de los tuyos"}</h2>
        <label>
          Nombre
          <input
            name="name"
            defaultValue={editing?.name}
            required
            maxLength={60}
            placeholder="Nombre y apellido"
          />
        </label>
        <label>
          Posición preferida
          <select
            name="position"
            defaultValue={editing?.preferred_position ?? "MED"}
          >
            {POSITIONS.map((position) => (
              <option key={position} value={position}>
                {POSITION_LABELS[position]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nivel <span className="optional">(solo tú lo ves)</span>
          <select name="skill" defaultValue={editing?.skill ?? 3}>
            {[1, 2, 3, 4, 5].map((skill) => (
              <option key={skill} value={skill}>
                {skill} ·{" "}
                {
                  {
                    1: "Está empezando",
                    2: "En progreso",
                    3: "Intermedio",
                    4: "Experimentado",
                    5: "Muy experimentado",
                  }[skill]
                }
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="feedback error" role="alert">
            {error}
          </p>
        )}
        <Button disabled={busy}>
          {busy
            ? "Guardando…"
            : editing
              ? "Guardar cambios"
              : "Agregar jugador"}
          <UserPlus />
        </Button>
        {editing && (
          <Button
            variant="ghost"
            type="button"
            onClick={() => setEditing(null)}
          >
            Cancelar edición
          </Button>
        )}
      </form>
      <section className="card player-list">
        <div className="section-heading">
          <h2>La lista de siempre</h2>
          <span>{players.length} jugadores</span>
        </div>
        {players.length === 0 ? (
          <div className="empty-state">
            <UserPlus size={36} />
            <h3>Empieza por los que nunca faltan.</h3>
            <p>Sus niveles te ayudarán a equilibrar el próximo partido.</p>
          </div>
        ) : (
          players.map((player) => (
            <div className="frequent-player" key={player.id}>
              <span className="avatar">
                {player.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{player.name}</strong>
                <small>
                  {player.preferred_position} · Nivel {player.skill}
                </small>
              </div>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`Editar a ${player.name}`}
                onClick={() => setEditing(player)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                type="button"
                aria-label={`Eliminar a ${player.name}`}
                onClick={() => remove(player)}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
