import { getOrganizer } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getOrganizer();
  return (
    <div className="workspace">
      <AppHeader organizer={Boolean(actor)} />
      <main id="contenido" className="workspace-main">
        {children}
      </main>
      <footer className="workspace-footer">
        Entre amigos, todo empieza con un cupo.
      </footer>
    </div>
  );
}
