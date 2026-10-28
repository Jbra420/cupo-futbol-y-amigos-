import { expect, it } from "vitest";
import { generateWhatsAppLink } from "@/lib/utils/whatsapp";
it("codifica el mensaje completo sin romper acentos, saltos ni parámetros del enlace", () => {
  const url = new URL(
    generateWhatsAppLink({
      title: "Fútbol & amigos ⚽",
      startsAt: new Date("2026-12-11T00:30:00Z"),
      spotsRemaining: 3,
      capacity: 10,
      matchUrl: "https://cupo.test/p/a?x=1&y=2",
    }),
  );
  expect(url.origin + url.pathname).toBe("https://wa.me/");
  const text = url.searchParams.get("text")!;
  expect(text).toContain("*Fútbol & amigos ⚽*");
  expect(text).toContain("jueves, 10 de diciembre");
  expect(text).toContain("07:30");
  expect(text).toContain("Quedan 3 de 10 cupos");
  expect(text).toContain("\n\n👉 Apúntate aquí: https://cupo.test/p/a?x=1&y=2");
});
it("comunica espera o finalización cuando ya no hay cupos abiertos", () => {
  const input = {
    title: "Partido",
    startsAt: new Date("2026-12-11T00:30:00Z"),
    spotsRemaining: 0,
    capacity: 6,
    matchUrl: "https://cupo.test/p/a",
  };
  expect(decodeURIComponent(generateWhatsAppLink(input))).toContain(
    "Lista de espera disponible",
  );
  expect(
    decodeURIComponent(generateWhatsAppLink({ ...input, finished: true })),
  ).toContain("Partido finalizado");
});
