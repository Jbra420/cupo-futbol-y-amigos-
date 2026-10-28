import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const mode = process.argv[2];
if (!["integration", "types", "env", "e2e"].includes(mode)) {
  console.error("Usa integration, types o env.");
  process.exit(1);
}
const status = spawnSync("supabase", ["status", "-o", "json"], {
  encoding: "utf8",
});
if (status.status !== 0) {
  console.error(
    "Supabase local no está disponible. Ejecuta supabase start antes de continuar.",
  );
  process.exit(1);
}
const local = JSON.parse(status.stdout);
const host = new URL(local.API_URL).hostname;
const databaseHost = new URL(local.DB_URL).hostname;
if (
  ![host, databaseHost].every((value) =>
    ["127.0.0.1", "localhost", "[::1]"].includes(value),
  )
) {
  console.error("Esta suite solo admite el Supabase local de pruebas.");
  process.exit(1);
}
if (mode === "env") {
  if (existsSync(".env.local")) {
    console.error(
      ".env.local ya existe; no se sobrescribió. Revisa su configuración manualmente.",
    );
    process.exit(1);
  }
  if (!local.ANON_KEY)
    throw new Error("No se encontró la clave pública local.");
  writeFileSync(
    ".env.local",
    `NEXT_PUBLIC_SUPABASE_URL=${local.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${local.ANON_KEY}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Configuración pública local guardada en .env.local, ignorado por Git.",
  );
} else if (mode === "types") {
  const generated = spawnSync(
    "supabase",
    ["gen", "types", "typescript", "--local", "--schema", "public"],
    { encoding: "utf8" },
  );
  if (
    generated.status !== 0 ||
    !generated.stdout.includes("export type Database")
  ) {
    console.error("No se pudieron generar los tipos desde la base local.");
    process.exit(1);
  }
  writeFileSync(
    "src/types/supabase.ts",
    "// Generado desde Supabase local. Ejecuta npm run supabase:types para actualizar.\n" +
      generated.stdout,
  );
  console.log("Tipos del esquema público actualizados.");
} else {
  // Credentials remain in process memory; never print or save the status response.
  const command =
    mode === "e2e"
      ? [
          "node_modules/@playwright/test/cli.js",
          "test",
          ...process.argv.slice(3),
        ]
      : [
          "node_modules/vitest/vitest.mjs",
          "run",
          "--config",
          "vitest.integration.config.mts",
        ];
  const test = spawnSync(process.execPath, command, {
    stdio: "inherit",
    env: {
      ...process.env,
      CUPO_TEST_SUPABASE_URL: local.API_URL,
      CUPO_TEST_ANON_KEY: local.ANON_KEY,
      CUPO_TEST_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
      CUPO_TEST_DATABASE_URL: local.DB_URL,
      NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    },
  });
  process.exit(test.status ?? 1);
}
