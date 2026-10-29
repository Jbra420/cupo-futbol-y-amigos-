import { mkdir } from "node:fs/promises";
import { test, expect } from "./support/fixtures";
import { e2eBaseURL } from "./support/config";

test("guarda el mapa, lo muestra al jugador y sincroniza cambios y eliminación", async ({
  page,
  browser,
  owner,
}, info) => {
  expect(owner.id).toBeTruthy();
  const first = "https://www.google.com/maps?q=-2.900128,-79.005896";
  const next = "https://www.google.com/maps?q=-2.91,-79.01";
  // Assert the saved iframe destination without depending on Google's network in CI.
  const mapRoute = "https://www.google.com/maps?**";
  await page.context().route(mapRoute, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html lang='es'><head><title>Mapa de prueba</title></head><body>Vista de la ubicación</body></html>",
    }),
  );
  await page.goto("/panel/nuevo");
  await page
    .getByLabel("Nombre del partido", { exact: true })
    .fill("Amigos en la cancha");
  await page.getByLabel("Fecha y hora").fill("2027-02-10T19:30");
  await page
    .getByLabel("¿Dónde jugamos?", { exact: true })
    .fill("Cancha de pruebas · Cuenca");
  await page
    .getByLabel(/Enlace de Google Maps/)
    .fill("https://example.com/maps");
  await page
    .getByRole("button", { name: "Crear partido", exact: true })
    .click();
  await expect(page.locator(".match-form").getByRole("alert")).toContainText(
    "Google Maps válido",
  );
  await expect(page).toHaveURL(/\/panel\/nuevo$/);
  await page.getByLabel(/Enlace de Google Maps/).fill(first);
  await page
    .getByRole("button", { name: "Crear partido", exact: true })
    .click();
  await expect(page).toHaveURL(/\/p\/[a-f0-9]+\/admin$/);
  const slug = new URL(page.url()).pathname.split("/")[2];
  const viewerContext = await browser.newContext({
    baseURL: e2eBaseURL,
    viewport: info.project.use.viewport,
  });
  await viewerContext.route(mapRoute, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html lang='es'><head><title>Mapa de prueba</title></head><body>Vista de la ubicación</body></html>",
    }),
  );
  try {
    const viewer = await viewerContext.newPage();
    await viewer.goto(`/p/${slug}`);
    const map = viewer.getByRole("region", { name: "Ubicación de la cancha" });
    await expect(
      map.getByRole("link", { name: "Ver en Google Maps", exact: true }),
    ).toHaveAttribute("href", first);
    await expect(map.locator("iframe")).toHaveAttribute(
      "src",
      /q=-2.900128%2C-79.005896/,
    );
    await expect(map.locator("iframe")).toHaveAttribute(
      "title",
      /Cancha de pruebas/,
    );
    await viewer.reload();
    await expect(map.locator("iframe")).toBeVisible();
    await mkdir("artifacts/maps", { recursive: true });
    await viewer.screenshot({
      path: `artifacts/maps/partido-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Editar partido", exact: true })
      .click();
    await page.getByLabel(/Enlace de Google Maps/).fill(next);
    await page
      .getByRole("button", { name: "Guardar cambios del partido", exact: true })
      .click();
    await expect(
      map.getByRole("link", { name: "Ver en Google Maps", exact: true }),
    ).toHaveAttribute("href", next);
    await page.reload();
    await expect(
      page
        .getByRole("region", { name: "Ubicación de la cancha" })
        .getByRole("link"),
    ).toHaveAttribute("href", next);
    await page
      .getByRole("button", { name: "Editar partido", exact: true })
      .click();
    await page.getByLabel(/Enlace de Google Maps/).fill("");
    await page
      .getByRole("button", { name: "Guardar cambios del partido", exact: true })
      .click();
    await expect(map).toHaveCount(0);
    await expect(
      viewer.getByRole("button", { name: "Confirmar mi cupo", exact: true }),
    ).toBeEnabled();
  } finally {
    await viewerContext.close();
  }
});
