import { redirect } from "next/navigation";
import { getOrganizer } from "@/lib/auth";
import { FrequentPlayers } from "@/components/frequent-players";
export const metadata = { title: "Jugadores frecuentes" };
export default async function PlayersPage() {
  const actor = await getOrganizer();
  if (!actor) redirect("/panel");
  const { data, error } = await actor.supabase
    .from("players")
    .select()
    .order("name");
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">LOS DE SIEMPRE</p>
          <h1>Tu lista de jugadores.</h1>
          <p>
            Guarda su posición y nivel para formar equipos más parejos. El nivel
            solo lo ves tú.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="feedback error">
          No pudimos cargar los jugadores.
        </p>
      )}
      <FrequentPlayers initial={data ?? []} />
    </>
  );
}
