import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import {
  adminAuthEmail,
  adminUsernameSchema,
} from "../src/lib/admin-credentials.ts";

const username = adminUsernameSchema.parse(process.argv[2] ?? "admin");
const reset = process.argv.includes("--reset-password");
async function choosePassword() {
  if (!process.stdin.isTTY)
    throw new Error(
      "Usa --interactive desde una terminal para elegir una contraseña.",
    );
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const input = createInterface({
    input: process.stdin,
    output: muted,
    terminal: true,
    historySize: 0,
  });
  try {
    process.stdout.write("Nueva contraseña (no se mostrará): ");
    const password = await input.question("");
    process.stdout.write("\n");
    process.stdout.write("Repite la contraseña: ");
    const confirmation = await input.question("");
    process.stdout.write("\n");
    if (password !== confirmation)
      throw new Error("Las contraseñas no coinciden.");
    if (password.length < 12 || password.length > 256)
      throw new Error("Usa una contraseña de 12 a 256 caracteres.");
    return password;
  } finally {
    input.close();
  }
}
const status = spawnSync("supabase", ["status", "-o", "json"], {
  encoding: "utf8",
});
if (status.status !== 0)
  throw new Error(
    "Inicia Supabase local antes de crear la cuenta administradora.",
  );
const local = JSON.parse(status.stdout);
if (
  ![local.API_URL, local.DB_URL].every((value) =>
    ["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname),
  )
)
  throw new Error("Este comando solo admite Supabase local.");
const auth = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sql = postgres(local.DB_URL, {
  max: 1,
  prepare: false,
  onnotice: () => {},
});
const file = resolve(".local/admin-credentials.json");
let createdUser;
try {
  await sql`SELECT pg_advisory_lock(192706281)`;
  const [existing] =
    await sql`SELECT user_id, username FROM private.app_administrator WHERE singleton`;
  if (existing && existing.username !== username)
    throw new Error("Ya existe otro administrador. No se reemplazó su cuenta.");
  if (existing && !reset) {
    console.log(`La cuenta ${username} ya existe; no se cambió su contraseña.`);
    console.log(
      existsSync(file)
        ? `Credenciales locales: ${file}`
        : "Usa --reset-password solo si quieres generar una contraseña nueva.",
    );
  } else {
    const password = process.argv.includes("--interactive")
      ? await choosePassword()
      : randomBytes(18).toString("base64url");
    let userId = existing?.user_id;
    if (userId) {
      const updated = await auth.auth.admin.updateUserById(userId, {
        password,
      });
      if (updated.error) throw updated.error;
    } else {
      const result = await auth.auth.admin.createUser({
        email: adminAuthEmail(username),
        password,
        email_confirm: true,
      });
      if (result.error || !result.data.user)
        throw result.error ?? new Error("No se creó la cuenta.");
      userId = result.data.user.id;
      createdUser = userId;
      await sql`INSERT INTO private.app_administrator (user_id, username) VALUES (${userId}, ${username})`;
    }
    mkdirSync(resolve(".local"), { recursive: true, mode: 0o700 });
    writeFileSync(
      file,
      JSON.stringify(
        {
          application: "Fútbol y amigos",
          environment: "solo local",
          username,
          password,
          login: "http://localhost:3000/panel",
        },
        null,
        2,
      ) + "\n",
      { mode: 0o600 },
    );
    createdUser = undefined;
    console.log(`Administrador local listo: ${username}`);
    console.log(
      `Contraseña guardada únicamente en ${file}. No se imprimió en el registro.`,
    );
  }
} catch (error) {
  if (createdUser) {
    await sql`DELETE FROM private.app_administrator WHERE user_id = ${createdUser}`;
    await auth.auth.admin.deleteUser(createdUser);
  }
  console.error(
    error instanceof Error ? error.message : "No se pudo crear la cuenta.",
  );
  process.exitCode = 1;
} finally {
  await sql`SELECT pg_advisory_unlock(192706281)`;
  await sql.end();
}
