import { NextResponse, type NextRequest } from "next/server";
import { createClient as createVerifier } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import { isSameOrigin } from "@/lib/csrf";
import { adminAuthEmail, adminLoginSchema } from "@/lib/admin-credentials";
import type { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  const denied = () =>
    NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401, headers },
    );
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Abre el acceso desde esta aplicación." },
      { status: 403, headers },
    );
  const config = getSupabaseConfig();
  if (!config)
    return NextResponse.json(
      { error: "El acceso todavía no está configurado." },
      { status: 503, headers },
    );
  const input = adminLoginSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!input.success) return denied();
  // Check authorization before replacing a player's existing anonymous browser session.
  const verifier = createVerifier<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const signed = await verifier.auth.signInWithPassword({
    email: adminAuthEmail(input.data.username),
    password: input.data.password,
  });
  if (signed.error || !signed.data.session) return denied();
  const access = await verifier.rpc("is_app_administrator");
  if (access.error || access.data !== true) {
    await verifier.auth.signOut({ scope: "local" });
    return denied();
  }
  const client = await createClient();
  const session = await client.auth.setSession({
    access_token: signed.data.session.access_token,
    refresh_token: signed.data.session.refresh_token,
  });
  if (session.error) return denied();
  return NextResponse.json({ redirect: "/panel" }, { headers });
}
