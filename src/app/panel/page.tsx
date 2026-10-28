import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Plus,
  ArrowUpRight,
  Goal,
  Users,
} from "lucide-react";
import { z } from "zod";
import { getOrganizer } from "@/lib/auth";
import { matchSchema } from "@/lib/contracts";
import { formatMatchDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { LoginPanel } from "@/components/login-panel";

export const metadata = { title: "Tus partidos" };
export default async function PanelPage() {
  const actor = await getOrganizer();
  if (!actor) return <LoginPanel />;
  const { data, error } = await actor.supabase.rpc("list_organizer_matches");
  const parsed = z.array(matchSchema).safeParse(data);
  const matches = parsed.success ? parsed.data : [];
  const active = matches.filter((match) => match.status !== "finished");
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">SIEMPRE HAY UN PRÓXIMO PARTIDO</p>
          <h1>Administrar partidos</h1>
          <p>
            Crea partidos y edita los que ya programaste: fecha, lugar y número
            de jugadores.
          </p>
        </div>
        <Button asChild>
          <Link href="/panel/nuevo">
            <Plus /> Organizar partido
          </Link>
        </Button>
      </div>
      <div className="summary-strip">
        <span>
          <strong>{active.length}</strong> partidos por jugar
        </span>
        <span>
          <strong>{matches.length}</strong> partidos organizados
        </span>
        <Link href="/panel/jugadores">
          <Users size={17} /> Tu lista de jugadores <ArrowUpRight size={16} />
        </Link>
      </div>
      {error && (
        <p className="feedback error" role="alert">
          No pudimos cargar tus partidos. Vuelve a intentarlo.
        </p>
      )}
      {matches.length === 0 ? (
        <section className="empty-state card">
          <Goal size={42} />
          <h2>La cancha está lista para tu primer partido.</h2>
          <p>Elige una fecha, define los cupos y junta a los de siempre.</p>
          <Button asChild>
            <Link href="/panel/nuevo">
              Crear mi primer partido <Plus />
            </Link>
          </Button>
        </section>
      ) : (
        <div className="match-grid">
          {matches.map((match) => (
            <Link
              className="match-card card"
              href={`/p/${match.slug}/admin`}
              key={match.id}
            >
              <div className="card-topline">
                <span
                  className={`status-pill ${match.status === "finished" ? "neutral" : ""}`}
                >
                  {
                    {
                      open: "Inscripciones abiertas",
                      full: "Cupos completos",
                      teams_ready: "Equipos listos",
                      finished: "Finalizado",
                    }[match.status]
                  }
                </span>
                <ArrowUpRight size={20} />
              </div>
              <h2>{match.title}</h2>
              <p>
                <CalendarDays size={17} />
                {formatMatchDate(match.starts_at)}
              </p>
              <p>
                <MapPin size={17} />
                {match.location}
              </p>
              <div className="match-card-footer">
                <span>{match.capacity} cupos</span>
                <span>Ver y editar partido →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
