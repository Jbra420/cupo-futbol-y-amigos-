import { BrandMark } from "./brand-mark";
import { TransitionLink } from "./view-transitions";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { APP_NAME } from "@/lib/brand";

export function AppHeader({ organizer = false }: { organizer?: boolean }) {
  return (
    <>
      <a href="#contenido" className="skip-link">
        Ir al contenido
      </a>
      <header className="app-header">
        <TransitionLink
          direction="back"
          href={organizer ? "/panel" : "/"}
          className="wordmark"
          aria-label={`${APP_NAME}, inicio`}
        >
          <BrandMark />
        </TransitionLink>
        <div className="app-header-actions">
          {organizer && (
            <nav aria-label="Panel">
              <TransitionLink href="/panel" direction="back">
                Partidos
              </TransitionLink>
              <TransitionLink href="/panel/jugadores">Jugadores</TransitionLink>
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
