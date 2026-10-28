import { expect, it } from "vitest";
import { formatMatchDate, formatPrice, localDateToISO } from "@/lib/date";
it("convierte la hora de Ecuador y rechaza fechas normalizadas inválidas", () => {
  expect(localDateToISO("2026-12-10T19:30")).toBe("2026-12-11T00:30:00.000Z");
  expect(localDateToISO("2026-02-30T19:30")).toBeNull();
  expect(localDateToISO("invalid")).toBeNull();
});

it("normaliza espacios de Intl para que servidor y navegador hidraten el mismo texto", () => {
  expect(formatMatchDate("2026-12-11T00:30:00Z")).not.toMatch(/[\u00a0\u202f]/);
  expect(formatPrice(4.5)).not.toMatch(/[\u00a0\u202f]/);
});
