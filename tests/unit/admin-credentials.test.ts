import { expect, it } from "vitest";
import { adminAuthEmail, adminLoginSchema } from "@/lib/admin-credentials";
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
