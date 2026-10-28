import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOrganizer } from "@/lib/auth";
import { organizerRequest, apiError } from "@/lib/http";
import { publicSnapshotSchema, adminSnapshotSchema } from "@/lib/contracts";
import {
  capacitySchema,
  playerNameSchema,
  positionSchema,
  publicErrorMessage,
} from "@/lib/validation";
import { localDateToISO } from "@/lib/date";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("capacity"), capacity: capacitySchema }),
  z.object({
    action: z.literal("add"),
    name: playerNameSchema,
    position: positionSchema,
  }),
  z.object({ action: z.literal("cancel"), registrationId: z.uuid() }),
  z.object({
    action: z.literal("paid"),
    registrationId: z.uuid(),
    paid: z.boolean(),
  }),
  z.object({ action: z.literal("finish") }),
  z.object({
    action: z.literal("details"),
    title: z.string().trim().min(1).max(100),
    startsAt: z.string(),
    capacity: capacitySchema,
    revision: z.number().int().min(0),
    location: z.string().trim().min(1).max(200),
    price: z.number().min(0).max(99999999.99).nullable(),
  }),
]);

async function findMatch(
  actor: NonNullable<Awaited<ReturnType<typeof getOrganizer>>>,
  slug: string,
) {
  const { data } = await actor.supabase.rpc("get_public_match", {
    p_slug: slug,
  });
  const match = publicSnapshotSchema.safeParse(data);
  if (!match.success) return null;
  const result = await actor.supabase.rpc("get_admin_match", {
    p_match_id: match.data.match.id,
  });
  const admin = adminSnapshotSchema.safeParse(result.data);
  return !result.error && admin.success ? admin.data : null;
}
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const actor = await getOrganizer();
  if (!actor) return apiError("Revisa tu sesión.", 403);
  const snapshot = await findMatch(actor, (await params).slug);
  if (!snapshot) return apiError("No tienes acceso a este partido.", 403);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const actor = await organizerRequest(request);
  if (!actor) return apiError("Revisa tu sesión.", 403);
  const { slug } = await params;
  const snapshot = await findMatch(actor, slug);
  if (!snapshot) return apiError("No tienes acceso a este partido.", 403);
  const input = actionSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("Revisa los datos del partido.");
  const value = input.data;
  const id = snapshot.match.id;
  if (
    "registrationId" in value &&
    !snapshot.registrations.some(
      (registration) => registration.id === value.registrationId,
    )
  )
    return apiError("Este jugador ya no está inscrito.");
  let error: { code?: string } | null = null;
  switch (value.action) {
    case "capacity":
      ({ error } = await actor.supabase.rpc("set_match_capacity", {
        p_match_id: id,
        p_capacity: value.capacity,
      }));
      break;
    case "add":
      ({ error } = await actor.supabase.rpc("add_match_player", {
        p_match_id: id,
        p_name: value.name,
        p_position: value.position,
      }));
      break;
    case "cancel":
      ({ error } = await actor.supabase.rpc("cancel_registration", {
        p_registration_id: value.registrationId,
      }));
      break;
    case "paid":
      ({ error } = await actor.supabase.rpc("set_registration_paid", {
        p_registration_id: value.registrationId,
        p_paid: value.paid,
      }));
      break;
    case "finish":
      ({ error } = await actor.supabase.rpc("finish_match", {
        p_match_id: id,
      }));
      break;
    case "details": {
      const date = localDateToISO(value.startsAt);
      if (!date) return apiError("Elige una fecha válida.");
      ({ error } = await actor.supabase.rpc("update_match_event", {
        p_match_id: id,
        p_title: value.title,
        p_capacity: value.capacity,
        p_expected_revision: value.revision,
        p_starts_at: date,
        p_location: value.location,
        p_price_per_player: value.price ?? undefined,
      }));
      break;
    }
  }
  if (error)
    return apiError(
      error.code === "PT409"
        ? "El partido cambió mientras lo editabas. Cierra la edición y vuelve a abrirla."
        : publicErrorMessage(error),
      error.code === "PT409" ? 409 : 400,
    );
  const updated = await findMatch(actor, slug);
  return NextResponse.json(updated, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
