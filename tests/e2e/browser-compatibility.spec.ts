import { mkdir } from "node:fs/promises";
import { test, expect } from "./support/fixtures";

test("crea, edita y sortea un partido sin crypto.randomUUID", async ({
  page,
  browser,
  owner,
}, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const withoutRandomUUID = () => {
    Object.defineProperty(Crypto.prototype, "randomUUID", {
      configurable: true,
      value: undefined,
    });
  };
  await page.addInitScript(withoutRandomUUID);
  await page.goto("/panel/nuevo");
  expect(
    await page.evaluate(() => ({
      randomUUID: typeof crypto.randomUUID,
      getRandomValues: typeof crypto.getRandomValues,
    })),
  ).toEqual({ randomUUID: "undefined", getRandomValues: "function" });
  await page.getByLabel("Nombre del partido").fill("Amistoso compatible");
  await page.getByLabel("Fecha y hora").fill("2027-02-12T19:30");
  await page.getByLabel("¿Dónde jugamos?").fill("Cancha del barrio");
  await page.getByLabel("Cupos totales").press("Home");
  const response = page.waitForResponse(
    (result) =>
      result.url().endsWith("/api/partidos") &&
      result.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Crear partido", exact: true })
    .click();
  const created = await response;
  expect(created.status()).toBe(201);
  await expect(page).toHaveURL(/\/p\/[a-f0-9]+\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Amistoso compatible", exact: true }),
  ).toBeVisible();
  const slug = new URL(page.url()).pathname.split("/")[2];
  const initial = await owner.client.rpc("get_public_match", { p_slug: slug });
  expect(initial.error).toBeNull();
  const { match } = initial.data as { match: { id: string; slug: string } };
  await expect(page.locator(".live-label")).toHaveText("En vivo");
  const viewerContext = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    viewport: info.project.use.viewport,
  });
  try {
    await viewerContext.addInitScript(withoutRandomUUID);
    const viewer = await viewerContext.newPage();
    viewer.on("pageerror", (error) => errors.push(error.message));
    await viewer.goto(`/p/${match.slug}`);
    await expect(
      viewer.getByRole("button", { name: "Confirmar mi cupo", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Editar partido", exact: true })
      .click();
    await page.getByLabel("Nombre del partido").fill("Amistoso reprogramado");
    await page.getByLabel("Fecha y hora").fill("2027-02-13T20:00");
    await page
      .getByRole("button", { name: "Guardar cambios del partido" })
      .click();
    await expect(
      viewer.getByRole("heading", {
        name: "Amistoso reprogramado",
        exact: true,
      }),
    ).toBeVisible();
    for (let index = 0; index < 6; index++) {
      const added = await owner.client.rpc("add_match_player", {
        p_match_id: match.id,
        p_name: `Amigo compatible ${index + 1}`,
        p_position: ["POR", "POR", "DEF", "DEF", "MED", "DEL"][index],
      });
      expect(added.error).toBeNull();
    }
    await expect(page.locator(".admin-toolbar")).toContainText(
      "6/6 confirmados",
    );
    await page
      .getByRole("button", { name: "Sortear balanceado", exact: true })
      .click();
    await expect(page.locator(".preview-team .team-player")).toHaveCount(6);
    await page
      .getByRole("button", { name: "Volver a sortear", exact: true })
      .click();
    await expect(page.locator(".preview-team .team-player")).toHaveCount(6);
    await page
      .getByRole("button", { name: "Publicar equipos", exact: true })
      .click();
    await expect(viewer.locator(".readonly-token")).toHaveCount(6);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Amistoso reprogramado", exact: true }),
    ).toBeVisible();
    const stored = await owner.client.rpc("get_public_match", {
      p_slug: match.slug,
    });
    expect(stored.error).toBeNull();
    expect(
      (stored.data as { match: { starts_at: string } }).match.starts_at,
    ).toBe("2027-02-14T01:00:00+00:00");
    await mkdir("artifacts/browser-compatibility", { recursive: true });
    await page.screenshot({
      path: `artifacts/browser-compatibility/partido-${info.project.name}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    await viewerContext.close();
  }
});
