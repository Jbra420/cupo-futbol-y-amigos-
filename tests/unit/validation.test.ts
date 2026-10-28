import { describe, expect, it } from "vitest";
import {
  capacitySchema,
  joinMatchSchema,
  playerNameSchema,
  publicErrorMessage,
} from "@/lib/validation";
import { readSupabaseConfig } from "@/lib/env";

describe("validación del cupo", () => {
  it("normaliza espacios y conserva tildes", () => {
    expect(playerNameSchema.parse("  José   Pérez  ")).toBe("José Pérez");
  });
  it.each(["", "   ", "x".repeat(61)])("rechaza un nombre inválido", (name) => {
    expect(playerNameSchema.safeParse(name).success).toBe(false);
  });
  it.each([5, 7, 23, 24, 6.5, NaN])("rechaza capacidad %s", (capacity) => {
    expect(capacitySchema.safeParse(capacity).success).toBe(false);
  });
  it.each([6, 10, 22])("acepta capacidad %s", (capacity) => {
    expect(capacitySchema.parse(capacity)).toBe(capacity);
  });
  it("exige una de las cuatro posiciones", () => {
    expect(
      joinMatchSchema.safeParse({ playerName: "María", position: "EXT" })
        .success,
    ).toBe(false);
    expect(
      joinMatchSchema.parse({ playerName: "María", position: "POR" }).position,
    ).toBe("POR");
  });
  it("no muestra mensajes SQL ni detalles internos", () => {
    expect(publicErrorMessage({ code: "XX000" })).not.toMatch(
      /SQL|postgres|stack/i,
    );
    expect(publicErrorMessage({ code: "23505" })).toContain("apellido");
  });
});

describe("configuración pública de Supabase", () => {
  it("permite un proyecto HTTPS y elimina una barra final", () => {
    expect(
      readSupabaseConfig({
        url: " https://cupo.supabase.co/ ",
        anonKey: " public-key ",
      }),
    ).toEqual({ url: "https://cupo.supabase.co", anonKey: "public-key" });
  });
  it("permite el entorno HTTP local", () => {
    expect(
      readSupabaseConfig({
        url: "http://127.0.0.1:54321",
        anonKey: "local-public-key",
      }),
    ).not.toBeNull();
  });
  it.each([
    "http://example.com",
    "javascript:alert(1)",
    "invalid",
    "https://user:password@example.com",
    "https://example.com/?key=private",
  ])("rechaza URL insegura o inválida %s", (url) => {
    expect(readSupabaseConfig({ url, anonKey: "public-key" })).toBeNull();
  });
  it("no inventa credenciales ni lanza errores al faltar configuración", () => {
    expect(
      readSupabaseConfig({ url: undefined, anonKey: undefined }),
    ).toBeNull();
    expect(
      readSupabaseConfig({ url: "https://cupo.supabase.co", anonKey: "" }),
    ).toBeNull();
  });
});
