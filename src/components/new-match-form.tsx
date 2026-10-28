"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Users } from "lucide-react";
import { Button } from "./ui/button";

export function NewMatchForm() {
  const [capacity, setCapacity] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/partidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          startsAt: form.get("startsAt"),
          location: form.get("location"),
          capacity,
          price: form.get("price") ? Number(form.get("price")) : null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(`/p/${result.match.slug}/admin`);
    } catch (error) {
      setError(
        error instanceof Error && error.message !== "Failed to fetch"
          ? error.message
          : "No pudimos guardar el partido. Revisa tu conexión.",
      );
      setBusy(false);
    }
  }
  return (
    <form className="match-form card" onSubmit={submit}>
      <div className="form-fields">
        <label>
          Nombre del partido
          <input
            name="title"
            required
            maxLength={100}
            placeholder="Ej. Partido amistoso en la cancha del barrio"
            autoComplete="off"
          />
        </label>
        <label>
          Fecha y hora
          <input name="startsAt" type="datetime-local" required />
          <small>Hora de Ecuador · America/Guayaquil</small>
        </label>
        <label>
          ¿Dónde jugamos?
          <input
            name="location"
            required
            maxLength={200}
            placeholder="Nombre de la cancha o dirección"
          />
        </label>
        <label>
          Precio por jugador <span className="optional">(opcional)</span>
          <div className="input-prefix">
            <span>USD</span>
            <input
              aria-label="Precio por jugador"
              name="price"
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </label>
      </div>
      <aside className="capacity-card">
        <Users size={25} />
        <p className="overline">HAY LUGAR PARA</p>
        <strong>
          {capacity}
          <span>jugadores</span>
        </strong>
        <label htmlFor="capacity">Cupos totales</label>
        <input
          id="capacity"
          type="range"
          min={6}
          max={22}
          step={2}
          value={capacity}
          onChange={(event) => setCapacity(Number(event.target.value))}
        />
        <div className="range-labels">
          <span>6 jugadores</span>
          <span>22 jugadores</span>
        </div>
        <p>
          Dos equipos de {capacity / 2}. Si se llena, los siguientes van a la
          lista de espera.
        </p>
      </aside>
      {error && (
        <p role="alert" className="feedback error form-wide">
          {error}
        </p>
      )}
      <div className="form-actions form-wide">
        <p>Después podrás compartir el enlace con tus amigos.</p>
        <Button type="submit" disabled={busy}>
          {busy ? "Creando partido…" : "Crear partido"}
          <ArrowUpRight />
        </Button>
      </div>
    </form>
  );
}
