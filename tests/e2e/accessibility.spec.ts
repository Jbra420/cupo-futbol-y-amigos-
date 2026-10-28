import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./support/fixtures";
test.beforeAll(async () => {
  await mkdir("artifacts/phase-7", { recursive: true });
});
test("las pantallas principales son accesibles, mantienen foco y aceptan nombres largos", async ({
  page,
  owner,
}, info) => {
  test.setTimeout(90_000);
  async function audit() {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Ir al contenido", exact: true }),
  ).toBeFocused();
  await audit();
  await page.context().clearCookies();
  await page.goto("/panel");
  await audit();
  // Restore the administrator session for the protected form and editor.
  await page.getByLabel("Usuario", { exact: true }).fill(owner.username);
  await page.getByLabel("Contraseña", { exact: true }).fill(owner.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Administrar partidos", exact: true }),
  ).toBeVisible();
  await page.goto("/panel/nuevo");
  await audit();
  const created = await owner.client.rpc("create_match", {
    p_title:
      "El partido de los amigos del barrio y la revancha del fin de semana",
    p_starts_at: "2026-12-11T00:30:00Z",
    p_location:
      "Complejo deportivo de la comunidad, cancha número dos junto al parque",
    p_capacity: 6,
  });
  expect(created.error).toBeNull();
  const match = created.data as { id: string; slug: string };
  const names = [
    "María Fernanda de los Ángeles López",
    "Diego Andrés Torres Zambrano",
    "ValentinaAlejandraSinEspaciosParaProbarElDiseño",
    "Carlos Paz",
    "Ana Sol",
    "Mateo Ruiz",
  ];
  for (let i = 0; i < 6; i++)
    await owner.client.rpc("add_match_player", {
      p_match_id: match.id,
      p_name: names[i],
      p_position: ["POR", "POR", "DEF", "DEF", "MED", "DEL"][i],
    });
  await page.goto(`/p/${match.slug}/admin`);
  await page
    .getByRole("button", { name: "Sortear balanceado", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publicar equipos", exact: true })
    .click();
  await expect(page.locator(".admin-toolbar")).toContainText("Equipos listos");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Cambiar tema" }).click();
    await audit();
    const tiny = await page
      .locator(
        "button:visible:not(:disabled), input:visible, select:visible, .app-header a:visible",
      )
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width < 43.9 || rect.height < 43.9;
          })
          .map(
            (element) =>
              element.getAttribute("aria-label") ?? element.textContent?.trim(),
          ),
      );
    expect(tiny).toEqual([]);
    await page
      .getByRole("heading", { name: "Que gane el fútbol.", exact: true })
      .click();
    await page.locator(".team-editor").screenshot({
      path: `artifacts/phase-7/editor-${info.project.name}-${theme}.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto(`/p/${match.slug}`);
  await audit();
  await page.screenshot({
    path: `artifacts/phase-7/partido-${info.project.name}-dark.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await audit();
  await page.screenshot({
    path: `artifacts/phase-7/partido-${info.project.name}-light.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
