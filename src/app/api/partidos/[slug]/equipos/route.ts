import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { organizerRequest, apiError } from "@/lib/http";
import { publicSnapshotSchema, adminSnapshotSchema } from "@/lib/contracts";
import { publicErrorMessage } from "@/lib/validation";
const schema = z.object({
  teams: z
    .array(
      z.object({
        idx: z.number().int().min(0).max(1),
        name: z.string().trim().min(1).max(40),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      }),
    )
    .length(2),
  assignments: z
    .array(
      z.object({
        registration_id: z.uuid(),
        team_idx: z.number().int().min(0).max(1),
        pitch_x: z.number().min(0).max(100),
        pitch_y: z.number().min(0).max(100),
      }),
    )
    .max(22),
  publish: z.boolean(),
  revision: z.number().int().min(0),
});
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const actor = await organizerRequest(request);
  if (!actor) return apiError("Ingresa con la cuenta administradora.", 403);
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return apiError("Revisa los nombres, colores y posiciones de los equipos.");
  const { slug } = await params;
  const result = await actor.supabase.rpc("get_public_match", { p_slug: slug });
  const publicData = publicSnapshotSchema.safeParse(result.data);
  if (!publicData.success) return apiError("No encontramos el partido.", 404);
  const { error } = await actor.supabase.rpc("commit_match_teams", {
    p_match_id: publicData.data.match.id,
    p_teams: input.data.teams,
    p_assignments: input.data.assignments,
    p_publish: input.data.publish,
    p_expected_revision: input.data.revision,
  });
  if (error)
    return apiError(
      publicErrorMessage(error),
      error.code === "PT409" ? 409 : 400,
    );
  const updated = await actor.supabase.rpc("get_admin_match", {
    p_match_id: publicData.data.match.id,
  });
  const parsed = adminSnapshotSchema.safeParse(updated.data);
  if (!parsed.success) return apiError();
  return NextResponse.json(parsed.data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
