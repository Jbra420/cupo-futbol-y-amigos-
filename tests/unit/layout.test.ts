import { describe, expect, it } from "vitest";
import {
  TOKEN_MIN_DX,
  TOKEN_MIN_DY,
  shortName,
  spreadTokens,
  type PitchPoint,
} from "@/lib/teams/layout";

const overlaps = (points: PitchPoint[]) =>
  points.some((a, i) =>
    points
      .slice(i + 1)
      .some(
        (b) =>
          Math.abs(a.x - b.x) < TOKEN_MIN_DX - 0.01 &&
          Math.abs(a.y - b.y) < TOKEN_MIN_DY,
      ),
  );

describe("spreadTokens", () => {
  it("separa una columna de jugadores alineados en el centro", () => {
    const column = [7, 19, 31, 43].map((y, index) => ({
      id: `p${index}`,
      x: 50,
      y,
      pinned: index === 0,
    }));
    const result = spreadTokens(column);
    expect(overlaps(result)).toBe(false);
    expect(result[0].x).toBe(50);
    expect(result.map((point) => point.id)).toEqual(["p0", "p1", "p2", "p3"]);
  });
  it("resuelve una línea llena sin salir de la cancha", () => {
    const line = Array.from({ length: 4 }, (_, index) => ({
      id: `p${index}`,
      x: 45 + index * 3,
      y: 30,
    }));
    const result = spreadTokens(line);
    expect(overlaps(result)).toBe(false);
    result.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(8);
      expect(point.x).toBeLessThanOrEqual(92);
    });
  });
  it("no mueve fichas que ya están separadas y es determinista", () => {
    const points = [
      { id: "a", x: 20, y: 20 },
      { id: "b", x: 80, y: 20 },
      { id: "c", x: 50, y: 70 },
    ];
    expect(spreadTokens(points)).toEqual(points);
    const crowded = [
      { id: "a", x: 50, y: 20 },
      { id: "b", x: 50, y: 25 },
    ];
    expect(spreadTokens(crowded)).toEqual(spreadTokens(crowded));
  });
});

describe("shortName", () => {
  it("abrevia el apellido y conserva nombres simples", () => {
    expect(shortName("María Fernanda de los Ángeles López")).toBe("María L.");
    expect(shortName("  Ana  ")).toBe("Ana");
    expect(shortName("diego torres")).toBe("diego T.");
  });
});
