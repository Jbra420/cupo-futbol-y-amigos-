import { expect, it } from "vitest";
import {
  adminAuthEmail,
  adminLoginSchema,
  resolveAdminAuthEmail,
} from "@/lib/admin-credentials";
it("normaliza el usuario y conserva la contraseña exactamente", () => {
  const input = adminLoginSchema.parse({
    username: "  Admin_Principal ",
    password: " Una contraseña ",
  });
  expect(input).toEqual({
    username: "admin_principal",
    password: " Una contraseña ",
  });
  expect(adminAuthEmail(input.username)).toBe(
    "admin_principal@admin.futbolyamigos.invalid",
  );
});
it("asocia el usuario normal al correo de una cuenta Auth existente", () => {
  expect(
    resolveAdminAuthEmail("admin", {
      username: " Admin ",
      email: " cuenta@example.com ",
    }),
  ).toBe("cuenta@example.com");
});
it("rechaza otro usuario aunque se haya configurado el mismo correo", () => {
  expect(
    resolveAdminAuthEmail("otro", {
      username: "admin",
      email: "cuenta@example.com",
    }),
  ).toBeNull();
});
it("rechaza una asociación incompleta o inválida", () => {
  for (const account of [
    { username: "admin" },
    { email: "cuenta@example.com" },
    { username: "admin", email: "correo inválido" },
    { username: "usuario con espacios", email: "cuenta@example.com" },
  ])
    expect(resolveAdminAuthEmail("admin", account)).toBeNull();
});
it("conserva los identificadores internos cuando no hay asociación configurada", () => {
  expect(resolveAdminAuthEmail("admin", { username: " ", email: " " })).toBe(
    "admin@admin.futbolyamigos.invalid",
  );
});
it("rechaza identificadores que podrían convertirse en un correo o ruta ajenos", () => {
  for (const username of [
    "admin@example.com",
    "admin/otro",
    "nombre con espacios",
    "ab",
    "a".repeat(41),
  ])
    expect(
      adminLoginSchema.safeParse({ username, password: "123" }).success,
    ).toBe(false);
});
