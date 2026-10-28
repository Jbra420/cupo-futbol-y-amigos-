import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeAll(async () => {
  await mkdir("artifacts/phase-2", { recursive: true });
});

for (const theme of ["light", "dark"] as const) {
  test(`la base se presenta en español y sin desbordamiento en tema ${theme}`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page).toHaveTitle(
      "Fútbol y amigos · Organiza tu próximo partido",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Menos mensajes.Más fútbol.",
    );
    await expect(
      page.getByRole("link", { name: "Acceso del administrador" }),
    ).toHaveAttribute("href", "/panel");
    if (theme === "dark")
      await page.getByRole("button", { name: "Cambiar tema" }).click();
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `artifacts/phase-2/landing-${testInfo.project.name}-${theme}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("el tema elegido persiste al volver a abrir la página", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const target = page.getByRole("button", { name: "Cambiar tema" });
  const bounds = await target.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
});
