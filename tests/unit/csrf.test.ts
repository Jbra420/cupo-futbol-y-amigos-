import { expect, it } from "vitest";
import { isSameOrigin } from "@/lib/csrf";
it("acepta el host real detrás del servidor y rechaza orígenes ajenos o ausentes", () => {
  expect(
    isSameOrigin(
      new Request("http://localhost:3000/api", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
    ),
  ).toBe(true);
  expect(
    isSameOrigin(
      new Request("https://cupo.test/api", {
        headers: { host: "cupo.test", origin: "https://evil.test" },
      }),
    ),
  ).toBe(false);
  expect(
    isSameOrigin(
      new Request("https://cupo.test/api", { headers: { host: "cupo.test" } }),
    ),
  ).toBe(false);
});
