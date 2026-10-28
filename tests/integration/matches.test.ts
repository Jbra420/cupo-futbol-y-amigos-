import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const endpoint = process.env.CUPO_TEST_SUPABASE_URL!;
const anonKey = process.env.CUPO_TEST_ANON_KEY!;
const serviceKey = process.env.CUPO_TEST_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.CUPO_TEST_DATABASE_URL!;
const client = () =>
  createClient(endpoint, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const admin = createClient(endpoint, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sql = postgres(databaseUrl, {
  max: 20,
  prepare: false,
  onnotice: () => {},
});
const users: string[] = [];
const players: SupabaseClient[] = [];
const organizerIds: string[] = [];
let organizer: SupabaseClient;
let outsider: SupabaseClient;
let adminLease: Awaited<ReturnType<typeof sql.reserve>>;
let previousAdministrator: { user_id: string; username: string } | undefined;

type Match = {
  id: string;
  slug: string;
  capacity: number;
  status: string;
  revision: number;
};
type Registration = {
  registration_id: string;
  player_name: string;
  position: string;
  status: string;
  waitlist_position: number | null;
};
type Snapshot = {
  match: Match;
  registrations: {
    id: string;
    player_name: string;
    status: string;
    paid?: boolean;
    skill?: number;
  }[];
  teams: { id: string; idx: number }[];
  assignments: { registration_id: string }[];
};
type Cancellation = {
  cancelled_id: string;
  promoted_id: string | null;
  already_cancelled: boolean;
};

async function rpc<T>(
  actor: SupabaseClient,
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await actor.rpc(name, args);
  if (error)
    throw Object.assign(new Error(error.message), { code: error.code });
  return data as T;
}

async function makeOrganizer(withGoogle = false) {
  const email = `cupo-test-${randomUUID()}@example.test`;
  const password = randomUUID() + "aA1!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("No se creó el fixture.");
  users.push(data.user.id);
  organizerIds.push(data.user.id);
  // An unregistered Google identity must not grant administrator access.
  if (withGoogle)
    await sql`INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    VALUES (${data.user.id}, ${data.user.id}, ${sql.json({ sub: data.user.id, email, email_verified: true })}, 'google', now(), now(), now())`;
  const actor = client();
  const result = await actor.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  return actor;
}

async function makeMatch(capacity = 10) {
  return rpc<Match>(organizer, "create_match", {
    p_title: "Partido de prueba",
    p_starts_at: "2026-12-10T01:00:00Z",
    p_location: "Cancha de pruebas",
    p_capacity: capacity,
  });
}

async function join(
  match: Match,
  index: number,
  name = `Jugador ${index + 1}`,
) {
  return rpc<Registration>(players[index], "join_match", {
    p_slug: match.slug,
    p_name: name,
    p_position: index < 2 ? "POR" : "DEF",
  });
}

async function fill(match: Match, count = 15) {
  const results: Registration[] = [];
  for (let i = 0; i < count; i++) results.push(await join(match, i));
  return results;
}

async function counts(matchId: string) {
  // Independent PostgreSQL connection, not the RPC response or client state.
  const [result] =
    await sql`SELECT count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
    count(*) FILTER (WHERE status = 'waitlist')::int AS waitlist FROM public.registrations WHERE match_id = ${matchId}`;
  return result;
}

const teams = [
  { idx: 0, name: "Verdes", color: "#16A34A" },
  { idx: 1, name: "Azules", color: "#2563EB" },
];

beforeAll(async () => {
  if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(endpoint).hostname))
    throw new Error("Se requiere un Supabase local aislado.");
  await sql`DELETE FROM public.matches WHERE organizer_id IN (SELECT id FROM auth.users WHERE email LIKE 'cupo-test-%@example.test')`;
  await sql`DELETE FROM auth.users WHERE email LIKE 'cupo-test-%@example.test'`;
  organizer = await makeOrganizer();
  outsider = await makeOrganizer(true);
  adminLease = await sql.reserve();
  await adminLease`SELECT pg_advisory_lock(192706281)`;
  [previousAdministrator] = await adminLease<
    { user_id: string; username: string }[]
  >`SELECT user_id, username FROM private.app_administrator WHERE singleton`;
  await adminLease`DELETE FROM private.app_administrator`;
  await adminLease`INSERT INTO private.app_administrator (user_id, username) VALUES (${organizerIds[0]}, 'integration-admin')`;
  for (let group = 0; group < 4; group++) {
    await Promise.all(
      Array.from({ length: 5 }, async () => {
        const actor = client();
        const { data, error } = await actor.auth.signInAnonymously();
        if (error || !data.user)
          throw error ?? new Error("No se creó la sesión anónima.");
        users.push(data.user.id);
        players.push(actor);
      }),
    );
  }
});

afterAll(async () => {
  if (organizerIds.length)
    await sql`DELETE FROM public.matches WHERE organizer_id IN ${sql(organizerIds)}`;
  if (organizerIds.length)
    await sql`DELETE FROM public.players WHERE organizer_id IN ${sql(organizerIds)}`;
  if (users.length) await sql`DELETE FROM auth.users WHERE id IN ${sql(users)}`;
  await Promise.all(
    [organizer, outsider, ...players]
      .filter(Boolean)
      .map((actor) => actor.removeAllChannels()),
  );
  if (adminLease) {
    await adminLease`DELETE FROM private.app_administrator`;
    if (previousAdministrator)
      await adminLease`INSERT INTO private.app_administrator (user_id, username) VALUES (${previousAdministrator.user_id}, ${previousAdministrator.username})`;
    await adminLease`SELECT pg_advisory_unlock(192706281)`;
    adminLease.release();
  }
  await sql.end();
});

describe("RPC, RLS y concurrencia sobre Supabase real", () => {
  it("solo una cuenta asignada tiene permisos, aunque otra tenga Google o cambie sus metadatos", async () => {
    expect(await rpc(organizer, "is_app_administrator")).toBe(true);
    expect(await rpc(outsider, "is_app_administrator")).toBe(false);
    expect(await rpc(players[0], "is_app_administrator")).toBe(false);
    await outsider.auth.updateUser({ data: { role: "admin", is_admin: true } });
    expect(await rpc(outsider, "is_app_administrator")).toBe(false);
    await expect(
      rpc(outsider, "create_match", {
        p_title: "No permitido",
        p_starts_at: "2027-02-10T20:00:00Z",
        p_location: "Cancha",
        p_capacity: 6,
      }),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      sql`INSERT INTO private.app_administrator (user_id, username) VALUES (${organizerIds[1]}, 'otro-admin')`,
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE authenticated`;
        await tx`UPDATE private.app_administrator SET user_id = ${organizerIds[1]}`;
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("edita fecha, nombre, lugar y jugadores en una transacción; conserva todo si falla", async () => {
    const match = await makeMatch(6);
    await fill(match, 7);
    const snapshot = await rpc<Snapshot>(organizer, "get_admin_match", {
      p_match_id: match.id,
    });
    const args = {
      p_match_id: match.id,
      p_title: "Partido reprogramado",
      p_starts_at: "2027-02-11T01:00:00Z",
      p_location: "Cancha nueva",
      p_capacity: 8,
      p_expected_revision: snapshot.match.revision,
      p_price_per_player: 5,
    };
    await expect(
      rpc(outsider, "update_match_event", args),
    ).rejects.toMatchObject({ code: "42501" });
    await rpc(organizer, "update_match_event", args);
    const [saved] =
      await sql`SELECT title, location, capacity, starts_at, revision FROM public.matches WHERE id = ${match.id}`;
    expect(saved).toMatchObject({
      title: "Partido reprogramado",
      location: "Cancha nueva",
      capacity: 8,
    });
    expect(new Date(saved.starts_at).toISOString()).toBe(
      "2027-02-11T01:00:00.000Z",
    );
    expect(await counts(match.id)).toEqual({ confirmed: 7, waitlist: 0 });
    await expect(
      rpc(organizer, "update_match_event", args),
    ).rejects.toMatchObject({ code: "PT409" });
    await expect(
      rpc(organizer, "update_match_event", {
        ...args,
        p_title: "No se debe guardar",
        p_capacity: 7,
        p_expected_revision: Number(saved.revision),
      }),
    ).rejects.toMatchObject({ code: "22023" });
    const [unchanged] =
      await sql`SELECT title, capacity, revision FROM public.matches WHERE id = ${match.id}`;
    expect(unchanged).toMatchObject({
      title: saved.title,
      capacity: saved.capacity,
      revision: saved.revision,
    });
  });

  it("el administrador también puede editar un evento creado antes bajo otra cuenta", async () => {
    const [match] = await sql<
      Match[]
    >`INSERT INTO public.matches (organizer_id, slug, title, starts_at, location, capacity)
      VALUES (${organizerIds[1]}, ${`legacy-${randomUUID().slice(0, 8)}`}, 'Evento anterior', '2027-02-10T20:00:00Z', 'Cancha anterior', 6)
      RETURNING id, slug, capacity, status, revision`;
    const snapshot = await rpc<Snapshot>(organizer, "get_admin_match", {
      p_match_id: match.id,
    });
    expect(
      (await rpc<Match[]>(organizer, "list_organizer_matches")).some(
        (item) => item.id === match.id,
      ),
    ).toBe(true);
    await rpc(organizer, "update_match_event", {
      p_match_id: match.id,
      p_title: "Evento anterior editado",
      p_starts_at: "2027-02-11T01:00:00Z",
      p_location: "Cancha",
      p_capacity: 8,
      p_expected_revision: snapshot.match.revision,
    });
    const [saved] =
      await sql`SELECT title, capacity FROM public.matches WHERE id = ${match.id}`;
    expect(saved).toMatchObject({
      title: "Evento anterior editado",
      capacity: 8,
    });
  });

  it("crea un partido con dos equipos de borrador y slug corto", async () => {
    const match = await makeMatch();
    expect(match.slug).toMatch(/^[a-f0-9]{10}$/);
    const snapshot = await rpc<Snapshot>(organizer, "get_admin_match", {
      p_match_id: match.id,
    });
    expect(snapshot.teams).toHaveLength(2);
    const publicView = await rpc<Snapshot>(client(), "get_public_match", {
      p_slug: match.slug,
    });
    expect(publicView.teams).toEqual([]);
  });

  it("15 llamadas simultáneas con capacidad 10 producen exactamente 10 confirmados y 5 en espera", async () => {
    const match = await makeMatch();
    const result = await Promise.all(
      Array.from({ length: 15 }, (_, index) => join(match, index)),
    );
    expect(result.filter((item) => item.status === "confirmed")).toHaveLength(
      10,
    );
    expect(result.filter((item) => item.status === "waitlist")).toHaveLength(5);
    expect(await counts(match.id)).toEqual({ confirmed: 10, waitlist: 5 });
    const [state] =
      await sql`SELECT status FROM public.matches WHERE id = ${match.id}`;
    expect(state.status).toBe("full");
  });

  it("reintentos simultáneos del mismo dispositivo reservan un único cupo", async () => {
    const match = await makeMatch();
    const result = await Promise.all(
      Array.from({ length: 8 }, () => join(match, 0)),
    );
    expect(new Set(result.map((item) => item.registration_id)).size).toBe(1);
    expect(await counts(match.id)).toEqual({ confirmed: 1, waitlist: 0 });
  });

  it("normaliza nombre, bloquea duplicados activos sin distinguir mayúsculas y permite reutilizar uno cancelado", async () => {
    const match = await makeMatch();
    const first = await join(match, 0, "  José   Pérez  ");
    expect(first.player_name).toBe("José Pérez");
    await expect(join(match, 1, "josé pérez")).rejects.toMatchObject({
      code: "23505",
    });
    await rpc(players[0], "cancel_registration", {
      p_registration_id: first.registration_id,
    });
    expect((await join(match, 1, "JOSÉ PÉREZ")).status).toBe("confirmed");
  });

  it.each([null, "", " ", "x".repeat(61)])(
    "rechaza nombre inválido en SQL",
    async (name) => {
      const match = await makeMatch();
      await expect(
        rpc(players[0], "join_match", {
          p_slug: match.slug,
          p_name: name,
          p_position: "DEF",
        }),
      ).rejects.toMatchObject({ code: "22023" });
    },
  );

  it.each([null, "EXT"])(
    "rechaza posición inválida en SQL",
    async (position) => {
      const match = await makeMatch();
      await expect(
        rpc(players[0], "join_match", {
          p_slug: match.slug,
          p_name: "Jugador",
          p_position: position,
        }),
      ).rejects.toMatchObject({ code: "22023" });
    },
  );

  it("dos cancelaciones del mismo confirmado solo promueven a una persona", async () => {
    const match = await makeMatch();
    const registered = await fill(match);
    const result = await Promise.all(
      Array.from({ length: 2 }, () =>
        rpc<Cancellation>(players[0], "cancel_registration", {
          p_registration_id: registered[0].registration_id,
        }),
      ),
    );
    expect(result.filter((item) => item.promoted_id !== null)).toHaveLength(1);
    expect(result.find((item) => item.promoted_id)?.promoted_id).toBe(
      registered[10].registration_id,
    );
    expect(await counts(match.id)).toEqual({ confirmed: 10, waitlist: 4 });
  });

  it("cancelar a alguien en espera no promueve ni libera un cupo confirmado", async () => {
    const match = await makeMatch();
    const registered = await fill(match, 11);
    const result = await rpc<Cancellation>(players[10], "cancel_registration", {
      p_registration_id: registered[10].registration_id,
    });
    expect(result.promoted_id).toBeNull();
    expect(await counts(match.id)).toEqual({ confirmed: 10, waitlist: 0 });
  });

  it("sin espera, cancelar vuelve a abrir el partido", async () => {
    const match = await makeMatch(6);
    const registered = await fill(match, 6);
    await rpc(players[0], "cancel_registration", {
      p_registration_id: registered[0].registration_id,
    });
    const [state] =
      await sql`SELECT status FROM public.matches WHERE id = ${match.id}`;
    expect(state.status).toBe("open");
    expect(await counts(match.id)).toEqual({ confirmed: 5, waitlist: 0 });
  });

  it("aumentar capacidad promueve a los primeros en espera", async () => {
    const match = await makeMatch();
    const registered = await fill(match);
    await rpc(organizer, "set_match_capacity", {
      p_match_id: match.id,
      p_capacity: 12,
    });
    expect(await counts(match.id)).toEqual({ confirmed: 12, waitlist: 3 });
    const promoted = await rpc<Registration>(
      players[10],
      "get_my_registration",
      { p_slug: match.slug },
    );
    expect(promoted.registration_id).toBe(registered[10].registration_id);
    expect(promoted.status).toBe("confirmed");
  });

  it("usa el id como desempate cuando varias inscripciones tienen la misma fecha", async () => {
    const match = await makeMatch(6);
    const ids = Array.from({ length: 8 }, () => randomUUID()).sort();
    const identities = await Promise.all(
      players.slice(0, 8).map((actor) => actor.auth.getUser()),
    );
    const rows = ids.map((id, index) => ({
      id,
      user_id: identities[index].data.user!.id,
      player_name: `Empate ${index}`,
      status: index < 6 ? "confirmed" : "waitlist",
    }));
    await sql`INSERT INTO public.registrations (id, user_id, match_id, player_name, position, status, created_at)
      SELECT r.id, r.user_id, ${match.id}, r.player_name, 'DEF', r.status, '2026-10-28T00:00:00Z'::timestamptz
      FROM jsonb_to_recordset(${sql.json(rows)}) AS r(id uuid, user_id uuid, player_name text, status text)`;
    const result = await rpc<Cancellation>(players[0], "cancel_registration", {
      p_registration_id: ids[0],
    });
    expect(result.promoted_id).toBe(ids[6]);
  });

  it("reducir capacidad desplaza a los últimos confirmados", async () => {
    const match = await makeMatch();
    const registered = await fill(match);
    await rpc(organizer, "set_match_capacity", {
      p_match_id: match.id,
      p_capacity: 6,
    });
    expect(await counts(match.id)).toEqual({ confirmed: 6, waitlist: 9 });
    const confirmed =
      await sql`SELECT id FROM public.registrations WHERE match_id = ${match.id} AND status = 'confirmed'`;
    expect(new Set(confirmed.map((row) => row.id))).toEqual(
      new Set(registered.slice(0, 6).map((item) => item.registration_id)),
    );
  });

  it("inscripción, cancelación y cambio de capacidad concurrentes mantienen la capacidad", async () => {
    const match = await makeMatch();
    const registered = await fill(match, 10);
    await Promise.all([
      ...Array.from({ length: 5 }, (_, index) => join(match, index + 10)),
      rpc(players[0], "cancel_registration", {
        p_registration_id: registered[0].registration_id,
      }),
      rpc(organizer, "set_match_capacity", {
        p_match_id: match.id,
        p_capacity: 6,
      }),
    ]);
    expect(await counts(match.id)).toEqual({ confirmed: 6, waitlist: 8 });
  });

  it.each([null, 5, 7, 24])(
    "rechaza una capacidad inválida en la base de datos",
    async (capacity) => {
      const match = await makeMatch();
      await expect(
        rpc(organizer, "set_match_capacity", {
          p_match_id: match.id,
          p_capacity: capacity,
        }),
      ).rejects.toMatchObject({ code: "22023" });
    },
  );

  it("el jugador y otro organizador no pueden cancelar, cambiar cupos ni marcar pagos ajenos", async () => {
    const match = await makeMatch();
    const first = await join(match, 0);
    await expect(
      rpc(players[1], "cancel_registration", {
        p_registration_id: first.registration_id,
      }),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      rpc(outsider, "set_match_capacity", {
        p_match_id: match.id,
        p_capacity: 6,
      }),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      rpc(players[0], "set_registration_paid", {
        p_registration_id: first.registration_id,
        p_paid: true,
      }),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      rpc(outsider, "get_admin_match", { p_match_id: match.id }),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("un anónimo no puede organizar ni falsificar Google mediante user_metadata", async () => {
    await players[0].auth.updateUser({
      data: { provider: "google", is_anonymous: false },
    });
    await expect(
      rpc(players[0], "create_match", {
        p_title: "Falso",
        p_starts_at: "2026-12-01T00:00:00Z",
        p_location: "Cancha",
        p_capacity: 10,
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("auth.uid nulo no supera los permisos aunque el rol sea authenticated", async () => {
    await expect(
      sql.begin(async (transaction) => {
        await transaction`SET LOCAL ROLE authenticated`;
        await transaction`SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true)`;
        await transaction`SELECT public.cancel_registration(${randomUUID()})`;
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("REST no permite saltarse las RPC ni alterar campos propios sensibles", async () => {
    const match = await makeMatch();
    const first = await join(match, 0);
    const paid = await players[0]
      .from("registrations")
      .update({ paid: true })
      .eq("id", first.registration_id);
    const status = await players[0]
      .from("registrations")
      .update({ status: "confirmed", user_id: randomUUID() })
      .eq("id", first.registration_id);
    const capacity = await organizer
      .from("matches")
      .update({ capacity: 6 })
      .eq("id", match.id);
    const insertion = await players[1]
      .from("registrations")
      .insert({ match_id: match.id, player_name: "Intruso", position: "DEF" });
    expect([
      paid.error?.code,
      status.error?.code,
      capacity.error?.code,
      insertion.error?.code,
    ]).toEqual(["42501", "42501", "42501", "42501"]);
  });

  it("los pagos y niveles son privados incluso en consultas manipuladas", async () => {
    const match = await makeMatch();
    const first = await join(match, 0, "Privado");
    await rpc(organizer, "set_registration_paid", {
      p_registration_id: first.registration_id,
      p_paid: true,
    });
    const inserted = await organizer.from("players").insert({
      organizer_id: organizerIds[0],
      name: "Privado",
      preferred_position: "DEF",
      skill: 5,
    });
    expect(inserted.error).toBeNull();
    const privateView = await rpc<Snapshot>(organizer, "get_admin_match", {
      p_match_id: match.id,
    });
    expect(privateView.registrations[0]).toMatchObject({
      paid: true,
      skill: 5,
    });
    const publicView = await rpc<Snapshot>(client(), "get_public_match", {
      p_slug: match.slug,
    });
    expect(JSON.stringify(publicView)).not.toMatch(
      /"(paid|skill|user_id|organizer_id)"/,
    );
    const sensitive = await players[1]
      .from("registrations")
      .select("user_id,paid")
      .eq("match_id", match.id);
    expect(sensitive.error?.code).toBe("42501");
    const hiddenPlayers = await players[1].from("players").select("*");
    expect(hiddenPlayers.data).toEqual([]);
  });

  it("altas manuales no atribuyen varios cupos al organizador", async () => {
    const match = await makeMatch();
    const first = await rpc<Registration>(organizer, "add_match_player", {
      p_match_id: match.id,
      p_name: "Invitado uno",
      p_position: "MED",
    });
    await rpc(organizer, "add_match_player", {
      p_match_id: match.id,
      p_name: "Invitado dos",
      p_position: "DEL",
    });
    const rows =
      await sql`SELECT user_id FROM public.registrations WHERE match_id = ${match.id}`;
    expect(rows.map((row) => row.user_id)).toEqual([null, null]);
    await expect(
      rpc(players[0], "cancel_registration", {
        p_registration_id: first.registration_id,
      }),
    ).rejects.toMatchObject({ code: "42501" });
    await rpc(organizer, "cancel_registration", {
      p_registration_id: first.registration_id,
    });
  });

  it("normaliza jugadores frecuentes y aísla los recursos de cada organizador", async () => {
    const inserted = await organizer
      .from("players")
      .insert({
        organizer_id: organizerIds[0],
        name: "  Ana   Sol  ",
        skill: 5,
      })
      .select("id,name")
      .single();
    expect(inserted.error).toBeNull();
    expect(inserted.data?.name).toBe("Ana Sol");
    const duplicate = await organizer
      .from("players")
      .insert({ organizer_id: organizerIds[0], name: "ana sol" });
    expect(duplicate.error?.code).toBe("23505");
    const foreignUpdate = await outsider
      .from("players")
      .update({ skill: 1 })
      .eq("id", inserted.data!.id)
      .select("id");
    expect(foreignUpdate.data).toEqual([]);
    const foreignInsert = await outsider
      .from("players")
      .insert({ organizer_id: organizerIds[0], name: "Intruso" });
    expect(foreignInsert.error?.code).toBe("42501");
    await expect(rpc(outsider, "list_organizer_matches")).rejects.toMatchObject(
      { code: "42501" },
    );
  });

  it("las alineaciones se guardan atómicamente y se invalidan al cambiar confirmados", async () => {
    const match = await makeMatch(6);
    const registered = await fill(match, 7);
    const assignments = registered.slice(0, 6).map((item, index) => ({
      registration_id: item.registration_id,
      team_idx: index % 2,
      pitch_x: 20 + index * 10,
      pitch_y: 40,
    }));
    await rpc(organizer, "save_match_teams", {
      p_match_id: match.id,
      p_teams: teams,
      p_assignments: assignments,
      p_publish: true,
    });
    const published = await rpc<Snapshot>(client(), "get_public_match", {
      p_slug: match.slug,
    });
    expect(published.match.status).toBe("teams_ready");
    expect(published.assignments).toHaveLength(6);
    await expect(
      rpc(organizer, "save_match_teams", {
        p_match_id: match.id,
        p_teams: teams,
        p_assignments: [{ ...assignments[0], pitch_x: 101 }],
        p_publish: false,
      }),
    ).rejects.toMatchObject({ code: "23514" });
    expect(
      (
        await rpc<Snapshot>(organizer, "get_admin_match", {
          p_match_id: match.id,
        })
      ).assignments,
    ).toHaveLength(6);
    await rpc(players[0], "cancel_registration", {
      p_registration_id: registered[0].registration_id,
    });
    const draft = await rpc<Snapshot>(organizer, "get_admin_match", {
      p_match_id: match.id,
    });
    expect(draft.match.status).toBe("full");
    expect(draft.assignments).toHaveLength(5);
    expect(
      (
        await rpc<Snapshot>(client(), "get_public_match", {
          p_slug: match.slug,
        })
      ).assignments,
    ).toEqual([]);
  });

  it("rechaza ediciones concurrentes obsoletas sin sobrescribir la alineación", async () => {
    const match = await makeMatch(6);
    const first = await rpc<Snapshot>(organizer, "get_admin_match", {
      p_match_id: match.id,
    });
    const args = {
      p_match_id: match.id,
      p_teams: teams,
      p_assignments: [],
      p_publish: false,
      p_expected_revision: first.match.revision,
    };
    await rpc(organizer, "commit_match_teams", args);
    await expect(
      rpc(organizer, "commit_match_teams", {
        ...args,
        p_teams: [{ ...teams[0], name: "Obsoleto" }, teams[1]],
      }),
    ).rejects.toMatchObject({ code: "PT409" });
    const saved = await rpc<Snapshot>(organizer, "get_admin_match", {
      p_match_id: match.id,
    });
    expect(saved.match.revision).toBeGreaterThan(first.match.revision);
    await expect(
      rpc(outsider, "commit_match_teams", {
        ...args,
        p_expected_revision: saved.match.revision,
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("rechaza asignar un jugador de otro partido o en espera", async () => {
    const match = await makeMatch(6);
    const foreign = await makeMatch();
    const registered = await fill(match, 7);
    const other = await join(foreign, 0);
    for (const id of [registered[6].registration_id, other.registration_id]) {
      await expect(
        rpc(organizer, "save_match_teams", {
          p_match_id: match.id,
          p_teams: teams,
          p_assignments: [
            { registration_id: id, team_idx: 0, pitch_x: 20, pitch_y: 30 },
          ],
        }),
      ).rejects.toMatchObject({ code: "23514" });
    }
    await expect(
      rpc(outsider, "save_match_teams", {
        p_match_id: match.id,
        p_teams: teams,
        p_assignments: [],
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("partidos finalizados rechazan nuevas altas y cambios", async () => {
    const match = await makeMatch();
    const first = await join(match, 0);
    await rpc(organizer, "finish_match", { p_match_id: match.id });
    await expect(join(match, 1)).rejects.toMatchObject({ code: "22023" });
    await expect(
      rpc(players[0], "cancel_registration", {
        p_registration_id: first.registration_id,
      }),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      rpc(organizer, "set_match_capacity", {
        p_match_id: match.id,
        p_capacity: 6,
      }),
    ).rejects.toMatchObject({ code: "22023" });
  });

  it.each([true, false])(
    "Realtime filtra el partido y protege columnas privadas (selección explícita: %s)",
    async (explicit) => {
      const match = await makeMatch();
      const observer = players[19];
      let receive: (value: unknown) => void = () => {};
      const received = new Promise<unknown>((resolve) => {
        receive = resolve;
      });
      let confirmReady: () => void = () => {};
      let rejectReady: (error: Error) => void = () => {};
      const ready = new Promise<void>((resolve, reject) => {
        confirmReady = resolve;
        rejectReady = reject;
      });
      const readyTimer = setTimeout(
        () => rejectReady(new Error("Realtime no confirmó la replicación.")),
        12_000,
      );
      const channel = observer
        .channel(`cupo-test-${randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "registrations",
            filter: `match_id=eq.${match.id}`,
            select: explicit
              ? ["id", "match_id", "player_name", "position", "status"]
              : undefined,
          },
          (payload) => receive(payload.new),
        )
        .on("system", {}, (payload) => {
          if (payload.extension !== "postgres_changes") return;
          if (payload.status === "ok") confirmReady();
          if (payload.status === "error")
            rejectReady(new Error(payload.message));
        });
      try {
        channel.subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
            rejectReady(new Error("Realtime rechazó el canal."));
        });
        await ready;
        clearTimeout(readyTimer);
        const foreign = await makeMatch();
        await join(foreign, 1);
        await join(match, 0);
        const payload = await Promise.race([
          received,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("No llegó el evento Realtime.")),
              12_000,
            ),
          ),
        ]);
        expect(payload).toMatchObject({
          match_id: match.id,
          player_name: "Jugador 1",
          status: "confirmed",
        });
        expect(JSON.stringify(payload)).not.toMatch(/"(user_id|paid|skill)"/);
      } finally {
        clearTimeout(readyTimer);
        await observer.removeChannel(channel);
      }
    },
  );
});
