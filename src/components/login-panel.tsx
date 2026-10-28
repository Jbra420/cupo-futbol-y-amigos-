"use client";
import { useState, type FormEvent } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { Button } from "./ui/button";

export function LoginPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/auth/ingresar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const result = await response.json().catch(() => ({
        error: "No pudimos iniciar sesión. Inténtalo de nuevo.",
      }));
      if (!response.ok) throw new Error(result.error);
      window.location.assign("/panel");
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message !== "Failed to fetch"
          ? reason.message
          : "No pudimos iniciar sesión. Revisa tu conexión.",
      );
      setBusy(false);
    }
  }
  return (
    <section className="login-panel card">
      <span className="empty-icon">
        <LockKeyhole size={32} />
      </span>
      <p className="overline">FÚTBOL Y AMIGOS</p>
      <h1>Acceso del administrador</h1>
      <p>
        Solo el administrador puede crear partidos y editar los eventos
        programados.
      </p>
      <form className="admin-login-form" onSubmit={submit}>
        <label>
          Usuario
          <input
            name="username"
            required
            maxLength={40}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Tu usuario"
            disabled={busy}
          />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            required
            maxLength={256}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            disabled={busy}
          />
        </label>
        {error && (
          <p role="alert" className="feedback error">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          <LogIn />
          {busy ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
      <small>
        Los jugadores entran por el enlace del partido, sin usuario ni
        contraseña.
      </small>
    </section>
  );
}
