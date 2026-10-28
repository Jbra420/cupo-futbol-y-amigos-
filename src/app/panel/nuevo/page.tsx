import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrganizer } from "@/lib/auth";
import { NewMatchForm } from "@/components/new-match-form";
export const metadata = { title: "Organizar partido" };
export default async function NewMatchPage() {
  if (!(await getOrganizer())) redirect("/panel");
  return (
    <>
      <Link className="back-link" href="/panel">
        ← Tus partidos
      </Link>
      <div className="page-heading">
        <div>
          <p className="overline">PONLE FECHA AL PLAN</p>
          <h1>Arma el próximo partido.</h1>
          <p>Unos pocos datos y ya tienes dónde juntarlos.</p>
        </div>
      </div>
      <NewMatchForm />
    </>
  );
}
