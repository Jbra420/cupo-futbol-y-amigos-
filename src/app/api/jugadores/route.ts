import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { organizerRequest, apiError } from "@/lib/http";
import {
  playerNameSchema,
  positionSchema,
  publicErrorMessage,
} from "@/lib/validation";

const schema = z.object({
  id: z.uuid().optional(),
  name: playerNameSchema,
  preferred_position: positionSchema,
  skill: z.number().int().min(1).max(5),
});
export async function POST(request: NextRequest) {
  const actor = await organizerRequest(request);
  if (!actor) return apiError("Ingresa con la cuenta administradora.", 403);
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return apiError("Revisa el nombre, la posición y el nivel.");
  const { id, ...values } = input.data;
  const query = id
    ? actor.supabase.from("players").update(values).eq("id", id)
    : actor.supabase
        .from("players")
        .insert({ ...values, organizer_id: actor.user.id });
  const { data, error } = await query.select().single();
  if (error) return apiError(publicErrorMessage(error));
  return NextResponse.json({ player: data });
}
export async function DELETE(request: NextRequest) {
  const actor = await organizerRequest(request);
  if (!actor) return apiError("Ingresa con la cuenta administradora.", 403);
  const input = z
    .object({ id: z.uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError();
  const { data, error } = await actor.supabase
    .from("players")
    .delete()
    .eq("id", input.data.id)
    .select("id");
  if (error || data.length !== 1) return apiError();
  return NextResponse.json({ ok: true });
}
