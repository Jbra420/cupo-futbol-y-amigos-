import { BrandMark } from "@/components/brand-mark";
import { ArrowUpRight, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

function Pitch() {
  const dots = [
    [50, 85, "01"],
    [25, 70, "04"],
    [75, 70, "05"],
    [50, 57, "08"],
    [29, 38, "07"],
    [71, 38, "10"],
    [50, 19, "09"],
  ] as const;
  return (
    <div className="pitch-card" aria-hidden="true">
      <div className="pitch-heading">
        <span>
          <span className="live-dot" /> EL PLAN DE SIEMPRE
        </span>
        <ArrowUpRight size={20} />
      </div>
      <div className="pitch-surface">
        <svg viewBox="0 0 320 400" fill="none" className="pitch-lines">
          <rect x="20" y="20" width="280" height="360" rx="2" />
          <path d="M20 200h280M95 20v65h130V20M125 20v28h70V20M95 380v-65h130v65M125 380v-28h70v28" />
          <circle cx="160" cy="200" r="42" />
          <circle cx="160" cy="200" r="2" fill="currentColor" />
          <path d="M125 85a42 42 0 0 0 70 0M125 315a42 42 0 0 1 70 0" />
        </svg>
        {dots.map(([x, y, number]) => (
          <span
            key={number}
            className="player-dot"
            style={{ left: x + "%", top: y + "%" }}
          >
            {number}
          </span>
        ))}
        <span className="pitch-sticker">
          <Check size={16} strokeWidth={3} /> El fútbol nos junta.
        </span>
      </div>
      <div className="pitch-footer">
        <span>UNA CANCHA. TU GENTE.</span>
        <span>Y ganas de jugar.</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="app-shell">
      <a href="#contenido" className="skip-link">
        Ir al contenido
      </a>
      <header className="site-header">
        <Link href="/" aria-label={`${APP_NAME}, inicio`} className="wordmark">
          <BrandMark />
        </Link>
        <div className="header-right">
          <span className="header-caption">Fútbol con tu gente</span>
          <ThemeToggle />
        </div>
      </header>
      <main id="contenido" className="hero-layout">
        <section className="hero-copy">
          <div className="eyebrow">
            <span /> PARA LOS QUE SIEMPRE SE APUNTAN
          </div>
          <h1>
            Menos mensajes.
            <br />
            <span>Más fútbol.</span>
          </h1>
          <p className="hero-description">
            El partido de la semana merece una mejor forma de organizarse. Junta
            a tu gente. Nosotros ponemos el orden.
          </p>
          <div className="hero-action">
            <Button size="lg" asChild>
              <Link href="/panel">
                Acceso del administrador <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <p>
              <Check size={14} aria-hidden="true" /> Tus amigos se apuntan sin
              registrarse.
            </p>
          </div>
          <div className="hero-note">
            <span className="note-line" />
            <span>
              Para el de los guantes, el del último gol
              <br />y el que siempre llega justo.
            </span>
          </div>
        </section>
        <Pitch />
      </main>
      <footer className="site-footer">
        <span>EL MEJOR PLAN ES JUGAR.</span>
        <span>Entre amigos, todo empieza con un cupo.</span>
      </footer>
    </div>
  );
}
