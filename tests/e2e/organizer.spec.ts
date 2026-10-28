import { e2eBaseURL } from "./support/config";
import { mkdir } from "node:fs/promises";
import { test, expect } from "./support/fixtures";

test.beforeAll(async () => {
  await mkdir("artifacts/phase-2", { recursive: true });
  await mkdir("artifacts/administrator", { recursive: true });
});
test("solo el administrador entra con usuario y contraseña y puede cerrar sesión", async ({
  page,
  owner,
}, info) => {
  await page.context().clearCookies();
  await page.goto("/panel");
  await expect(
    page.getByRole("heading", {
      name: "Acceso del administrador",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Google/ })).toHaveCount(0);
  await page.screenshot({
    path: `artifacts/administrator/login-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Usuario", { exact: true }).fill(owner.username);
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator(".login-panel").getByRole("alert")).toContainText(
    "Usuario o contraseña incorrectos",
  );
  await page.screenshot({
    path: `artifacts/administrator/login-error-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Contraseña", { exact: true }).fill(owner.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Administrar partidos", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Administrar partidos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(`${e2eBaseURL}/`);
  await page.goto("/panel/nuevo");
  await expect(page).toHaveURL(`${e2eBaseURL}/panel`);
  const denied = await page.request.post("/api/partidos", {
    headers: { origin: e2eBaseURL },
    data: {},
  });
  expect(denied.status()).toBe(403);
  await page.goto("/auth/google");
  await expect(page).toHaveURL(`${e2eBaseURL}/panel`);
});
test("un organizador crea un partido y vuelve a encontrarlo en su panel", async ({
  page,
  owner,
}, info) => {
  expect(owner.id).toBeTruthy();
  await page.goto("/panel");
  await page
    .getByRole("link", { name: "Organizar partido", exact: true })
    .click();
  await expect(page).toHaveURL(/\/panel\/nuevo/);
  await page.getByLabel("Nombre del partido").fill("Fútbol y amigos");
  await page.getByLabel("Fecha y hora").fill("2026-12-10T19:30");
  await page.getByLabel("¿Dónde jugamos?").fill("Cancha del barrio");
  await page.getByLabel("Precio por jugador", { exact: true }).fill("4.50");
  await page.screenshot({
    path: `artifacts/phase-2/crear-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Crear partido" }).click();
  await expect(page).toHaveURL(/\/p\/[a-f0-9]+\/admin/);
  await expect(
    page.getByRole("heading", { name: "Fútbol y amigos" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Tus partidos" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(
    page.getByRole("heading", { name: "Fútbol y amigos" }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/phase-2/panel-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("el organizador agrega, edita y elimina jugadores frecuentes", async ({
  page,
  owner,
}, info) => {
  expect(owner.id).toBeTruthy();
  await page.goto("/panel/jugadores");
  await page.getByLabel("Nombre", { exact: true }).fill("María López");
  await page.getByLabel("Posición preferida").selectOption("POR");
  await page.getByLabel(/Nivel/).selectOption("5");
  await page.getByRole("button", { name: "Agregar jugador" }).click();
  await expect(page.locator(".frequent-player")).toContainText("María López");
  await page.getByRole("button", { name: "Editar a María López" }).click();
  await page.getByLabel(/Nivel/).selectOption("4");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator(".frequent-player")).toContainText("Nivel 4");
  await page.reload();
  await expect(page.locator(".frequent-player")).toContainText("Nivel 4");
  await page.screenshot({
    path: `artifacts/phase-2/jugadores-${info.project.name}.png`,
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar a María López" }).click();
  await expect(page.locator(".frequent-player")).toHaveCount(0);
});

test("el administrador edita un partido programado y los jugadores reciben los cambios", async ({
  page,
  browser,
  owner,
}, info) => {
  const created = await owner.client.rpc("create_match", {
    p_title: "Partido por programar",
    p_starts_at: "2027-01-10T00:30:00Z",
    p_location: "Cancha inicial",
    p_capacity: 10,
  });
  expect(created.error).toBeNull();
  const match = created.data as { id: string; slug: string };
  for (let i = 0; i < 8; i++)
    await owner.client.rpc("add_match_player", {
      p_match_id: match.id,
      p_name: `Amigo ${i + 1}`,
      p_position: "MED",
    });
  const publicContext = await browser.newContext({
    baseURL: e2eBaseURL,
    viewport: info.project.use.viewport,
  });
  try {
    const viewer = await publicContext.newPage();
    await viewer.goto(`/p/${match.slug}`);
    await expect(
      viewer.getByRole("button", { name: "Confirmar mi cupo", exact: true }),
    ).toBeEnabled();
    await page.goto("/panel");
    await page
      .getByRole("heading", { name: "Partido por programar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Editar partido", exact: true })
      .click();
    await page
      .getByLabel("Nombre del partido", { exact: true })
      .fill("Amistoso de Fútbol y amigos");
    await page
      .getByLabel("Fecha y hora", { exact: true })
      .fill("2027-02-10T20:00");
    await page.getByLabel("Número de jugadores", { exact: true }).fill("6");
    await page
      .getByLabel("Lugar", { exact: true })
      .fill("Cancha nueva del barrio");
    await page.screenshot({
      path: `artifacts/administrator/editar-${info.project.name}.png`,
      fullPage: true,
    });
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Guardar cambios del partido", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Amistoso de Fútbol y amigos",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".admin-toolbar")).toContainText(
      "6/6 confirmados",
    );
    await expect(
      page
        .locator(".section-heading")
        .filter({ hasText: "Jugadores del partido" }),
    ).toContainText("2 en espera");
    await expect(
      viewer.getByRole("heading", {
        name: "Amistoso de Fútbol y amigos",
        exact: true,
      }),
    ).toBeVisible();
    await expect(viewer.locator(".public-heading")).toContainText(
      "Cancha nueva del barrio",
    );
    await expect(
      viewer.getByRole("button", {
        name: "Unirme a la lista de espera",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      viewer.getByRole("button", { name: "Editar partido", exact: true }),
    ).toHaveCount(0);
    const denied = await viewer.request.post(
      `/api/partidos/${match.slug}/admin`,
      {
        headers: { origin: e2eBaseURL },
        data: { action: "capacity", capacity: 10 },
      },
    );
    expect(denied.status()).toBe(403);
    await page.reload();
    await page
      .getByRole("button", { name: "Editar partido", exact: true })
      .click();
    await expect(page.getByLabel("Fecha y hora", { exact: true })).toHaveValue(
      "2027-02-10T20:00",
    );
    await expect(
      page.getByLabel("Número de jugadores", { exact: true }),
    ).toHaveValue("6");
    const stored = await owner.client.rpc("get_public_match", {
      p_slug: match.slug,
    });
    expect(
      (stored.data as { match: { starts_at: string } }).match.starts_at,
    ).toBe("2027-02-11T01:00:00+00:00");
  } finally {
    await publicContext.close();
  }
});
