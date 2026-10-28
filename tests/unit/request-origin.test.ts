import { expect, it } from "vitest";
import { requestOrigin } from "@/lib/request-origin";
it("conserva el host del navegador en los redirects de OAuth y salida", () => {
  const request = new Request("http://localhost:3000/auth/callback", {
    headers: { host: "127.0.0.1:3000" },
  });
  expect(requestOrigin(request)).toBe("http://127.0.0.1:3000");
  expect(
    requestOrigin(
      new Request("https://cupo.test/auth/google", {
        headers: { host: "cupo.test" },
      }),
    ),
  ).toBe("https://cupo.test");
});
it("rechaza un host con credenciales o una ruta inyectada", () => {
  for (const host of [
    "example.test@evil.test",
    "evil.test/redirect",
    "evil.test?x=1",
  ])
    expect(
      requestOrigin(new Request("https://cupo.test/", { headers: { host } })),
    ).toBe("https://cupo.test");
});
