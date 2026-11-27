import { describe, expect, it } from "vitest";
import { formationSlots, magnetTarget } from "@/lib/teams/formation";

describe("formationSlots", () => {
  it("refleja la formación en la mitad del rival", () => {
    const home = formationSlots(0);
    const away = formationSlots(1);
    expect(home).toHaveLength(away.length);
    expect(home.every((slot) => slot.y < 50)).toBe(true);
    expect(away.every((slot) => slot.y > 50)).toBe(true);
    expect(away[0]).toEqual({ line: "POR", x: 50, y: 94 });
  });
});

describe("magnetTarget", () => {
  const origin = { x: 50, y: 70 };
  it("atrae la ficha al puesto libre más cercano", () => {
    expect(
      magnetTarget({ point: { x: 36, y: 80 }, team: 1, origin, others: [] }),
    ).toEqual({ line: "DEF", x: 38, y: 82 });
  });
  it("salta puestos ocupados por compañeros, no por rivales", () => {
    const target = magnetTarget({
      point: { x: 36, y: 80 },
      team: 1,
      origin,
      others: [
        { x: 38, y: 82, team: 1 },
        { x: 14, y: 82, team: 0 },
      ],
    });
    expect(target).not.toEqual({ line: "DEF", x: 38, y: 82 });
  });
  it("deja la ficha libre lejos de los puestos o al volver a su sitio", () => {
    expect(
      magnetTarget({ point: { x: 50, y: 62 }, team: 1, origin, others: [] }),
    ).toBeNull();
    expect(
      magnetTarget({
        point: { x: 50, y: 69 },
        team: 1,
        origin: { x: 50, y: 69 },
        others: [],
      }),
    ).not.toEqual(expect.objectContaining({ x: 50, y: 69 }));
  });
});
