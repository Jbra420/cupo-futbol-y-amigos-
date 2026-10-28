"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="workspace-main empty-state">
      <h1>Se nos fue la pelota.</h1>
      <p>No pudimos cargar esta pantalla. Inténtalo otra vez.</p>
      <Button onClick={reset}>Volver a intentar</Button>
    </main>
  );
}
