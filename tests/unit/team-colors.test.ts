import { describe, expect, it } from "vitest";
import { TEAM_COLORS, teamColorName } from "@/lib/teams/colors";

describe("TEAM_COLORS", () => {
  it("son hex válidos para la base y con nombres únicos", () => {
    TEAM_COLORS.forEach((color) =>
      expect(color.hex).toMatch(/^#[0-9a-fA-F]{6}$/),
    );
    expect(new Set(TEAM_COLORS.map((color) => color.name)).size).toBe(
      TEAM_COLORS.length,
    );
  });
  it("incluye los colores por defecto de los equipos", () => {
    expect(teamColorName("#16a34a")).toBe("Verde");
    expect(teamColorName("#2563EB")).toBe("Azul");
    expect(teamColorName("#d45b22")).toBeNull();
  });
});
