import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/request-origin";
// Old bookmarked OAuth URLs return to the administrator's username/password form.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/panel", requestOrigin(request)));
}
