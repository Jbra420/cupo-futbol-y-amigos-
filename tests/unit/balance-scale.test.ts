import { describe, expect, it } from "vitest";
import { balanceVerdict, beamAngle } from "@/lib/teams/scale";

describe("beamAngle", () => {
  it("baja el lado con más nivel y se limita a ±16°", () => {
    expect(beamAngle(10, 10)).toBe(0);
    expect(beamAngle(10, 12)).toBeGreaterThan(0);
    expect(beamAngle(12, 10)).toBeLessThan(0);
    expect(beamAngle(0, 40)).toBe(16);
    expect(beamAngle(40, 0)).toBe(-16);
  });
});

describe("balanceVerdict", () => {
  it("clasifica la diferencia de nivel", () => {
    expect(balanceVerdict(0).tone).toBe("perfect");
    expect(balanceVerdict(2).tone).toBe("close");
    expect(balanceVerdict(4).tone).toBe("uneven");
    expect(balanceVerdict(7).tone).toBe("off");
  });
});
