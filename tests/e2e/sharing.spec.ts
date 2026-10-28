import { e2eBaseURL } from "./support/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { test, expect } from "./support/fixtures";

test.beforeAll(async () => {
  await mkdir("artifacts/phase-6", { recursive: true });
});
test("comparte un enlace actualizado y exporta una alineación pública completa a PNG", async ({
  page,
  browser,
  owner,
}, info) => {
  test.setTimeout(90_000);
  const created = await owner.client.rpc("create_match", {
    p_title: "Partido de Fútbol y amigos",
    p_starts_at: "2026-12-11T00:30:00Z",
    p_location: "Cancha del barrio",
    p_capacity: 6,
  });
  expect(created.error).toBeNull();
  const match = created.data as { id: string; slug: string };
  for (let i = 0; i < 5; i++)
    await owner.client.rpc("add_match_player", {
      p_match_id: match.id,
      p_name: [
        "María López",
        "Diego Torres",
        "Ana Sol",
        "Carlos Paz",
        "Mateo Ruiz",
      ][i],
      p_position: ["POR", "POR", "DEF", "DEF", "MED"][i],
    });
  const publicContext = await browser.newContext({
    baseURL: e2eBaseURL,
  });
  try {
    const first = await publicContext.request.get(`/p/${match.slug}`, {
      headers: { "User-Agent": "WhatsApp/2" },
    });
    expect(first.status()).toBe(200);
    const html = await first.text();
    expect(html).toContain('property="og:title"');
    expect(html).toContain("Queda 1 cupo");
    const imageUrl = html
      .match(/<meta property="og:image" content="([^"]+)"/)?.[1]
      ?.replaceAll("&amp;", "&");
    expect(imageUrl).toBeTruthy();
    const og = await publicContext.request.get(imageUrl!);
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
    expect(og.headers()["cache-control"]).toContain("no-store");
    const image = await og.body();
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
    await writeFile(
      `artifacts/phase-6/open-graph-${info.project.name}.png`,
      image,
    );
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("denied");
          },
        },
      });
    });
    await page.goto(`/p/${match.slug}/admin`);
    await page
      .getByRole("button", { name: "Copiar enlace", exact: true })
      .click();
    await expect(page.getByLabel("Enlace del partido")).toHaveValue(
      `${e2eBaseURL}/p/${match.slug}`,
    );
    const link = new URL(
      (await page
        .getByRole("link", { name: "Compartir por WhatsApp", exact: true })
        .getAttribute("href"))!,
    );
    expect(link.searchParams.get("text")).toContain(
      "Partido de Fútbol y amigos",
    );
    expect(link.searchParams.get("text")).toContain("Queda 1 de 6 cupos");
    await owner.client.rpc("add_match_player", {
      p_match_id: match.id,
      p_name: "Valentina Ríos",
      p_position: "DEL",
    });
    await expect(
      page.getByRole("link", { name: "Compartir por WhatsApp", exact: true }),
    ).toHaveAttribute("href", /Cupos%20llenos/);
    const full = await publicContext.request.get(`/p/${match.slug}`, {
      headers: { "User-Agent": "WhatsApp/2" },
    });
    expect(await full.text()).toContain("Cupos llenos");
    await page
      .getByRole("button", { name: "Sortear balanceado", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publicar equipos", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Descargar PNG", exact: true }),
    ).toBeEnabled();
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Descargar PNG", exact: true })
      .click();
    const download = await downloadEvent;
    const path = `artifacts/phase-6/alineacion-${info.project.name}.png`;
    await download.saveAs(path);
    const png = await readFile(path);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1520);
    expect(png.readUInt32BE(20)).toBeGreaterThan(1800);
    expect(png.length).toBeGreaterThan(30_000);
    await page.screenshot({
      path: `artifacts/phase-6/compartir-${info.project.name}.png`,
      fullPage: true,
    });
    const viewer = await publicContext.newPage();
    await viewer.goto(`/p/${match.slug}`);
    await expect(viewer.locator(".readonly-token")).toHaveCount(6);
    await expect(viewer.locator(".lineup-export")).toHaveCount(0);
    expect(await page.locator(".lineup-export").innerText()).not.toMatch(
      /Diferencia de nivel|Nivel [1-5]|pagado|pago/i,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await publicContext.close();
  }
});
