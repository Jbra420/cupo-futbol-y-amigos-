import { BrandMark } from "./brand-mark";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function AppHeader({ organizer = false }: { organizer?: boolean }) {
  return (
    <>
      <a href="#contenido" className="skip-link">
        Ir al contenido
      </a>
      <header className="app-header">
        <Link
          href={organizer ? "/panel" : "/"}
          className="wordmark"
          aria-label="Fútbol y amigos, inicio"
        >
          <BrandMark />
        </Link>
        <div className="app-header-actions">
          {organizer && (
            <nav aria-label="Panel">
              <Link href="/panel">Partidos</Link>
              <Link href="/panel/jugadores">Jugadores</Link>
            </nav>
          )}
          <ThemeToggle />
          {organizer && (
            <form action="/auth/salir" method="post">
              <Button variant="ghost" size="icon" aria-label="Cerrar sesión">
                <LogOut aria-hidden="true" />
              </Button>
            </form>
          )}
        </div>
      </header>
    </>
  );
}
