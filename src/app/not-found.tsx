import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="workspace">
      <AppHeader />
      <main className="workspace-main empty-state">
        <h1>Este partido no aparece por aquí.</h1>
        <p>Revisa el enlace o vuelve al inicio para organizar uno.</p>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </main>
    </div>
  );
}
