import { e2eBaseURL } from "./support/config";
import { mkdir } from "node:fs/promises";
import { test, expect } from "./support/fixtures";

test.beforeAll(async () => {
  await mkdir("artifacts/phase-5", { recursive: true });
});
test("edita equipos con arrastre, teclado y touch; publica, sincroniza y conserva la cancha", async ({
  page,
  browser,
  owner,
}, info) => {
  test.setTimeout(90_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|hydrated|unique.*key/i.test(message.text())
    )
      browserErrors.push(message.text());
  });
  const created = await owner.client.rpc("create_match", {
    p_title: "La revancha del barrio",
    p_starts_at: "2026-12-11T00:30:00Z",
    p_location: "Cancha del barrio",
    p_capacity: 6,
  });
  expect(created.error).toBeNull();
  const match = created.data as { id: string; slug: string };
  for (let i = 0; i < 6; i++)
    expect(
      (
        await owner.client.rpc("add_match_player", {
          p_match_id: match.id,
          p_name: `Futbolista ${i + 1}`,
          p_position: ["POR", "POR", "DEF", "DEF", "MED", "DEL"][i],
        })
      ).error,
    ).toBeNull();
  await page.goto(`/p/${match.slug}/admin`);
  await page
    .getByRole("button", { name: "Sortear balanceado", exact: true })
    .click();
  await expect(
    page.locator(".preview-team").first().locator(".team-player"),
  ).toHaveCount(3);
  const moving = page
    .locator(".preview-team")
    .first()
    .locator(".team-player")
    .first();
  const name = await moving.locator("strong").innerText();
  if (info.project.name === "desktop") {
    const source = await moving.locator(".drag-handle").boundingBox();
    const target = await page.locator(".preview-team").last().boundingBox();
    await page.mouse.move(source!.x + 22, source!.y + 22);
    await page.mouse.down();
    await page.mouse.move(target!.x + target!.width / 2, target!.y + 50, {
      steps: 12,
    });
    await page.mouse.up();
  } else {
    await page
      .getByLabel(`Equipo de ${name}`, { exact: true })
      .selectOption("1");
  }
  await expect(
    page.locator(".preview-team").last().locator(".team-player"),
  ).toHaveCount(4);
  await expect(
    page.locator(".team-editor").locator(".feedback[role=status]"),
  ).toContainText("Alineación guardada");
  await page.getByLabel("Nombre del equipo 1").fill("Los del barrio");
  await page.getByLabel("Color del equipo 1").fill("#d45b22");
  await page
    .getByRole("button", { name: "Publicar equipos", exact: true })
    .click();
  await expect(page.locator(".admin-toolbar")).toContainText("Equipos listos");
  const publicContext = await browser.newContext({
    baseURL: e2eBaseURL,
  });
  try {
    const viewer = await publicContext.newPage();
    await viewer.goto(`/p/${match.slug}`);
    await expect(viewer.locator(".readonly-lineup")).toContainText(
      "Los del barrio",
    );
    await expect(viewer.locator(".readonly-token")).toHaveCount(6);
    await expect(viewer.locator(".balance-indicator")).toHaveCount(0);
    await page.getByRole("button", { name: "Cancha", exact: true }).click();
    const token = page.getByRole("button", {
      name: `Mover a ${name} en cancha`,
      exact: true,
    });
    await expect(token).toBeEnabled();
    const before = await token.getAttribute("style");
    await token.scrollIntoViewIfNeeded();
    if (info.project.name === "mobile") {
      const rect = await token.boundingBox();
      const session = await page.context().newCDPSession(page);
      const point = { x: rect!.x + rect!.width / 2, y: rect!.y + 20 };
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [point],
      });
      await page.waitForTimeout(240);
      await expect(token).toHaveAttribute("aria-pressed", "true");
      for (let step = 1; step <= 8; step++)
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: point.x + step * 4, y: point.y + step * 3 }],
        });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await session.detach();
    } else {
      await token.focus();
      await page.keyboard.press("Space");
      await expect(token).toHaveAttribute("aria-pressed", "true");
      await page.waitForTimeout(120);
      await page.keyboard.press("ArrowRight");
      await expect(token).not.toHaveAttribute("style", before!);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Space");
      await expect(token).not.toHaveAttribute("aria-pressed", "true");
    }
    await expect(token).not.toHaveAttribute("style", before!);
    await expect(
      page.locator(".team-editor").locator(".feedback[role=status]"),
    ).toContainText("Equipos publicados");
    const storedStyle = await token.getAttribute("style");
    await page.screenshot({
      path: `artifacts/phase-5/cancha-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cambiar tema" }).click();
    await page.screenshot({
      path: `artifacts/phase-5/cancha-${info.project.name}-dark.png`,
      fullPage: true,
    });
    await page.reload();
    await page.getByRole("button", { name: "Cancha", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: `Mover a ${name} en cancha`,
        exact: true,
      }),
    ).toHaveAttribute("style", storedStyle!);
    await page.getByRole("button", { name: "Lista", exact: true }).click();
    await page.getByLabel("Nombre del equipo 1").fill("La revancha");
    await page
      .getByRole("button", { name: "Publicar equipos", exact: true })
      .click();
    await expect(viewer.locator(".readonly-lineup")).toContainText(
      "La revancha",
    );
    await page.screenshot({
      path: `artifacts/phase-5/lista-${info.project.name}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Finalizar partido", exact: true })
      .click({ trial: true });
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Finalizar partido", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Publicar equipos", exact: true }),
    ).toBeDisabled();
    await expect(
      viewer.getByRole("heading", { name: "Hasta el próximo partido." }),
    ).toBeVisible();
    expect(browserErrors).toEqual([]);
  } finally {
    await publicContext.close();
  }
});
