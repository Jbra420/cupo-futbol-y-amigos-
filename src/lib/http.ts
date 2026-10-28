import { NextResponse, type NextRequest } from "next/server";
import { getOrganizer } from "./auth";
import { isSameOrigin } from "./csrf";

export async function organizerRequest(request: NextRequest) {
  if (!isSameOrigin(request)) return null;
  return getOrganizer();
}
export function apiError(
  message = "No pudimos completar la acción. Inténtalo de nuevo.",
  status = 400,
) {
  return NextResponse.json({ error: message }, { status });
}
