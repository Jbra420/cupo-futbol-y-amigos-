import { mkdir } from "node:fs/promises";
import type { BrowserContext, Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";

test.beforeAll(async () => {
  await mkdir("artifacts/phase-3", { recursive: true });
});
test("inscripción, espera, promoción y cambios de cupos se sincronizan entre dispositivos", async ({
  browser,
  page,
  owner,
}, info) => {
  test.setTimeout(120_000);
  expect(owner.id).toBeTruthy();
  await page.goto("/panel/nuevo");
  await page
    .getByLabel("Nombre del partido")
    .fill("Partido amistoso del barrio");
  await page.getByLabel("Fecha y hora").fill("2026-12-10T19:30");
  await page.getByLabel("¿Dónde jugamos?").fill("Cancha del barrio");
  await page.getByLabel("Cupos totales").press("Home");
  await page.getByLabel("Precio por jugador", { exact: true }).fill("4.50");
  await page
    .getByRole("button", { name: "Crear partido", exact: true })
    .click();
  await expect(page).toHaveURL(/\/p\/[a-f0-9]+\/admin/);
  const match = { slug: new URL(page.url()).pathname.split("/")[2] };
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  try {
    await page.goto(`/p/${match.slug}/admin`);
    for (let index = 0; index < 8; index++) {
      const context = await browser.newContext({
        baseURL: "http://127.0.0.1:3000",
        viewport:
          info.project.name === "mobile"
            ? { width: 390, height: 844 }
            : { width: 1440, height: 900 },
        isMobile: info.project.name === "mobile",
        hasTouch: info.project.name === "mobile",
        colorScheme: "light",
      });
      contexts.push(context);
      const player = await context.newPage();
      pages.push(player);
      await player.goto(`/p/${match.slug}`);
      await player.getByLabel("Tu nombre").fill(`Jugador ${index + 1}`);
      const position = ["POR", "POR", "DEF", "DEF", "MED", "DEL", "MED", "DEL"][
        index
      ];
      await player
        .getByRole("button", { name: new RegExp(`^${position}`) })
        .click();
      await player
        .getByRole("button", {
          name: index < 6 ? "Confirmar mi cupo" : "Unirme a la lista de espera",
          exact: true,
        })
        .click();
      await expect(
        player.getByRole("heading", {
          name:
            index < 6
              ? "Estás confirmado"
              : `Estás #${index - 5} en la lista de espera`,
          exact: true,
        }),
      ).toBeVisible();
    }
    await pages[7].screenshot({
      path: `artifacts/phase-3/espera-${info.project.name}.png`,
      fullPage: true,
    });
    pages[0].once("dialog", (dialog) => dialog.accept());
    await pages[0].getByRole("button", { name: "Cancelar mi cupo" }).click();
    await expect(
      pages[6].getByRole("heading", { name: "Estás confirmado", exact: true }),
    ).toBeVisible();
    await expect(
      pages[7].getByRole("heading", {
        name: "Estás #1 en la lista de espera",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Marcar pago de Jugador 2", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Desmarcar pago de Jugador 2",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Cupos del partido")).toBeEnabled();
    await page.getByLabel("Cupos del partido").press("ArrowRight");
    await expect(page.getByLabel("Cupos del partido")).toHaveValue("8");
    await page.getByRole("button", { name: "Guardar cupos" }).click();
    await expect(
      pages[7].getByRole("heading", { name: "Estás confirmado", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Nombre", { exact: true }).fill("Invitado manual");
    await page.getByRole("button", { name: "Agregar al partido" }).click();
    await expect(page.locator(".admin-toolbar")).toContainText(
      "8/8 confirmados",
    );
    await expect(page.getByLabel("Cupos del partido")).toBeEnabled();
    await page.getByLabel("Cupos del partido").press("Home");
    await expect(page.getByLabel("Cupos del partido")).toHaveValue("6");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Guardar cupos" }).click();
    await expect(page.locator(".admin-toolbar")).toContainText(
      "6/6 confirmados",
    );
    await expect(
      pages[7].getByRole("heading", {
        name: "Estás #1 en la lista de espera",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/phase-3/admin-${info.project.name}.png`,
      fullPage: true,
    });
    await pages[1].screenshot({
      path: `artifacts/phase-3/confirmado-${info.project.name}.png`,
      fullPage: true,
    });
    await pages[1].getByRole("button", { name: "Cambiar tema" }).click();
    await pages[1].screenshot({
      path: `artifacts/phase-3/confirmado-${info.project.name}-dark.png`,
      fullPage: true,
    });
    expect(
      await pages[1].evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Sortear balanceado", exact: true })
      .click();
    await expect(
      page.locator(".preview-team").first().locator(".team-player"),
    ).toHaveCount(3);
    const select = page
      .locator(".preview-team")
      .first()
      .locator("select")
      .first();
    await select.selectOption("1");
    await expect(
      page.locator(".preview-team").last().locator(".team-player"),
    ).toHaveCount(4);
    await expect(
      page.locator(".team-editor").locator(".feedback[role=status]"),
    ).toContainText("Alineación guardada");
    await page.getByLabel("Nombre del equipo 1").fill("Los de siempre");
    await page
      .getByRole("button", { name: "Publicar equipos", exact: true })
      .click();
    await expect(pages[1].locator(".readonly-lineup")).toContainText(
      "Los de siempre",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
