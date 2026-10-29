import { z } from "zod";

export const adminUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,39}$/,
    "Escribe un usuario de 3 a 40 caracteres, sin espacios.",
  );
export const adminLoginSchema = z.object({
  username: adminUsernameSchema,
  password: z.string().min(1).max(256),
});
// Internal Auth identifier only. The administrator signs in with a normal username.
export function adminAuthEmail(username: string) {
  return `${adminUsernameSchema.parse(username)}@admin.futbolyamigos.invalid`;
}

// A server-only mapping supports an existing Auth account without exposing its email.
export function resolveAdminAuthEmail(
  username: string,
  account: { username?: string; email?: string } = {},
): string | null {
  const configuredUsername = account.username?.trim();
  const configuredEmail = account.email?.trim();
  if (!configuredUsername && !configuredEmail) return adminAuthEmail(username);
  const expected = adminUsernameSchema.safeParse(configuredUsername);
  const email = z.email().safeParse(configuredEmail);
  if (!expected.success || !email.success || expected.data !== username)
    return null;
  return email.data;
}
