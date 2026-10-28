import { mkdir } from "node:fs/promises";
import { test, expect } from "./support/fixtures";
test.beforeAll(async () => {
  await mkdir("artifacts/phase-4", { recursive: true });
});
test("el organizador sortea equipos y ve su indicador privado de equilibrio", async ({
  page,
  owner,
}, info) => {
  const created = await owner.client.rpc("create_match", {
    p_title: "Equipos de Fútbol y amigos",
    p_starts_at: "2026-12-11T00:30:00Z",
    p_location: "La cancha",
    p_capacity: 6,
  });
  const match = created.data as { id: string; slug: string };
  for (let index = 0; index < 6; index++)
    await owner.client.rpc("add_match_player", {
      p_match_id: match.id,
      p_name: `Jugador ${index + 1}`,
      p_position: ["POR", "POR", "DEF", "DEF", "MED", "DEL"][index],
    });
  await page.goto(`/p/${match.slug}/admin`);
  await page
    .getByRole("button", { name: "Sortear balanceado", exact: true })
    .click();
  await expect(page.locator(".balance-indicator")).toContainText(
    "Diferencia de nivel: 0",
  );
  await expect(page.locator(".preview-team")).toHaveCount(2);
  await expect(
    page.locator(".preview-team").first().locator(".roster-row"),
  ).toHaveCount(3);
  await expect(
    page.locator(".preview-team").last().locator(".roster-row"),
  ).toHaveCount(3);
  await page.screenshot({
    path: `artifacts/phase-4/equilibrio-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Volver a sortear" }).click();
  await expect(page.locator(".balance-indicator")).toContainText(
    "Diferencia de nivel: 0",
  );
});
