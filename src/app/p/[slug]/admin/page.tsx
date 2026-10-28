import { notFound, redirect } from "next/navigation";
import { getOrganizer } from "@/lib/auth";
import { publicSnapshotSchema, adminSnapshotSchema } from "@/lib/contracts";
import { AppHeader } from "@/components/app-header";
import { AdminMatch } from "@/components/admin-match";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const actor = await getOrganizer();
  if (!actor) redirect("/panel");
  const { slug } = await params;
  const publicResult = await actor.supabase.rpc("get_public_match", {
    p_slug: slug,
  });
  const publicMatch = publicSnapshotSchema.safeParse(publicResult.data);
  if (!publicMatch.success) notFound();
  const admin = await actor.supabase.rpc("get_admin_match", {
    p_match_id: publicMatch.data.match.id,
  });
  const parsed = adminSnapshotSchema.safeParse(admin.data);
  if (admin.error || !parsed.success) notFound();
  return (
    <div className="workspace">
      <AppHeader organizer />
      <main id="contenido" className="workspace-main">
        <AdminMatch initial={parsed.data} />
      </main>
    </div>
  );
}
