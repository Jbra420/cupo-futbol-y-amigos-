import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { organizerRequest, apiError } from "@/lib/http";
import { capacitySchema } from "@/lib/validation";
import { localDateToISO } from "@/lib/date";
import { matchSchema } from "@/lib/contracts";

const inputSchema = z.object({
  title: z.string().trim().min(1).max(100),
  startsAt: z.string(),
  location: z.string().trim().min(1).max(200),
  capacity: capacitySchema,
  price: z.number().min(0).max(99999999.99).nullable(),
});
export async function POST(request: NextRequest) {
  const actor = await organizerRequest(request);
  if (!actor) return apiError("Ingresa con la cuenta administradora.", 403);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError("Revisa el título, la fecha, el lugar y los cupos.");
  const startsAt = localDateToISO(parsed.data.startsAt);
  if (!startsAt) return apiError("Elige una fecha y hora válidas.");
  const { data, error } = await actor.supabase.rpc("create_match", {
    p_title: parsed.data.title,
    p_starts_at: startsAt,
    p_location: parsed.data.location,
    p_capacity: parsed.data.capacity,
    p_price_per_player: parsed.data.price ?? undefined,
  });
  const match = matchSchema.safeParse(data);
  if (error || !match.success) return apiError();
  return NextResponse.json({ match: match.data }, { status: 201 });
}
