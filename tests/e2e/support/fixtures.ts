import { test as base, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import postgres from "postgres";
import { adminAuthEmail } from "../../../src/lib/admin-credentials";

type Owner = {
  id: string;
  username: string;
  password: string;
  client: SupabaseClient;
  sql: ReturnType<typeof postgres>;
};
export const test = base.extend<{ owner: Owner }>({
  // A database lock serializes temporary administrators, even if workers are overridden.
  owner: [
    async ({ context }, run) => {
      const url = process.env.CUPO_TEST_SUPABASE_URL!;
      const key = process.env.CUPO_TEST_ANON_KEY!;
      const sql = postgres(process.env.CUPO_TEST_DATABASE_URL!, {
        max: 3,
        prepare: false,
        onnotice: () => {},
      });
      const lease = await sql.reserve();
      await lease`SELECT pg_advisory_lock(192706281)`;
      const [previous] = await lease<
        { user_id: string; username: string }[]
      >`SELECT user_id, username FROM private.app_administrator WHERE singleton`;
      const admin = createClient(url, process.env.CUPO_TEST_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const username = `e2e-${randomUUID().replaceAll("-", "").slice(0, 24)}`;
      const password = randomUUID() + "Aa1!";
      let id: string | undefined;
      let swapped = false;
      try {
        const created = await admin.auth.admin.createUser({
          email: adminAuthEmail(username),
          password,
          email_confirm: true,
        });
        if (created.error || !created.data.user)
          throw created.error ?? new Error("No se creó el usuario de pruebas.");
        id = created.data.user.id;
        await lease`DELETE FROM private.app_administrator`;
        swapped = true;
        await lease`INSERT INTO private.app_administrator (user_id, username) VALUES (${id}, ${username})`;
        const jar = new Map<
          string,
          { name: string; value: string; options: CookieOptions }
        >();
        const client = createServerClient(url, key, {
          cookies: {
            getAll: () =>
              [...jar.values()].map(({ name, value }) => ({ name, value })),
            setAll: (values) =>
              values.forEach((value) => jar.set(value.name, value)),
          },
        });
        const signed = await client.auth.signInWithPassword({
          email: adminAuthEmail(username),
          password,
        });
        if (signed.error) throw signed.error;
        await context.addCookies(
          [...jar.values()]
            .filter((item) => item.value)
            .map((item) => ({
              name: item.name,
              value: item.value,
              domain: "127.0.0.1",
              path: "/",
              sameSite: "Lax" as const,
              secure: false,
            })),
        );
        await run({ id, username, password, client, sql });
      } finally {
        if (id) {
          const registered =
            await sql`SELECT user_id FROM public.registrations WHERE match_id IN (SELECT id FROM public.matches WHERE organizer_id = ${id}) AND user_id IS NOT NULL`;
          await sql`DELETE FROM public.matches WHERE organizer_id = ${id}`;
          await sql`DELETE FROM public.players WHERE organizer_id = ${id}`;
          const ids = [
            ...new Set([id, ...registered.map((row) => row.user_id as string)]),
          ];
          await sql`DELETE FROM auth.users WHERE id IN ${sql(ids)}`;
        }
        if (swapped) {
          await lease`DELETE FROM private.app_administrator`;
          if (previous)
            await lease`INSERT INTO private.app_administrator (user_id, username) VALUES (${previous.user_id}, ${previous.username})`;
        }
        await lease`SELECT pg_advisory_unlock(192706281)`;
        lease.release();
        await sql.end();
      }
    },
    { timeout: 180_000 },
  ],
});
export { expect };
