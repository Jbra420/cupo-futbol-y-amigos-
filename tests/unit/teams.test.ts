import { describe, expect, it } from "vitest";
import { balanceTeams } from "@/lib/teams/balance";
import type { PlayerForBalance } from "@/lib/teams/types";
import type { Position } from "@/types/database";
const positions: Position[] = ["POR", "DEF", "MED", "DEL"];
const fixture = (size: number): PlayerForBalance[] =>
  Array.from({ length: size }, (_, index) => ({
    registrationId: `player-${String(index).padStart(2, "0")}`,
    playerName: `Jugador ${index}`,
    position: positions[index % 4],
    skill: (index % 5) + 1,
  }));
describe("balanceTeams", () => {
  it("conserva a todos, equilibra tamaños y posiciones para tamaños de 0 a 22", () => {
    for (let size = 0; size <= 22; size++)
      for (let seed = 0; seed < 15; seed++) {
        const players = fixture(size);
        const { teams } = balanceTeams(players, String(seed));
        expect(
          Math.abs(teams[0].players.length - teams[1].players.length),
        ).toBeLessThanOrEqual(1);
        expect(
          new Set(
            teams.flatMap((team) =>
              team.players.map((player) => player.registrationId),
            ),
          ),
        ).toEqual(new Set(players.map((player) => player.registrationId)));
        positions.forEach((position) =>
          expect(
            Math.abs(
              teams[0].positionCounts[position] -
                teams[1].positionCounts[position],
            ),
          ).toBeLessThanOrEqual(1),
        );
      }
  });
  it("divide dos arqueros entre equipos y admite un solo arquero", () => {
    const players = fixture(10).map((player, index) => ({
      ...player,
      position: (index < 2 ? "POR" : "DEF") as Position,
    }));
    const result = balanceTeams(players, "arqueros");
    expect(result.teams.map((team) => team.positionCounts.POR)).toEqual([1, 1]);
    expect(
      balanceTeams(players.slice(1), "impar").teams.reduce(
        (sum, team) => sum + team.positionCounts.POR,
        0,
      ),
    ).toBe(1);
  });
  it("reproduce el resultado incluso si cambia el orden de entrada", () => {
    const players = fixture(18);
    expect(balanceTeams(players, "fijo")).toEqual(
      balanceTeams([...players].reverse(), "fijo"),
    );
  });
  it("usa nivel 3 cuando no se conoce y no modifica entradas congeladas", () => {
    const players = fixture(7).map((player) =>
      Object.freeze({ ...player, skill: undefined }),
    );
    Object.freeze(players);
    const result = balanceTeams(players, "default");
    expect(
      result.teams
        .flatMap((team) => team.players)
        .every((player) => player.skill === 3),
    ).toBe(true);
    expect(players.every((player) => player.skill === undefined)).toBe(true);
  });
  it("alcanza diferencia cero en un caso con óptimo conocido", () => {
    const players = fixture(8).map((player, index) => ({
      ...player,
      position: "DEF" as Position,
      skill: [5, 4, 3, 2, 5, 4, 3, 2][index],
    }));
    expect(balanceTeams(players, "optimo").skillDifference).toBe(0);
  });
  it("no deja un intercambio de la misma posición que mejore la diferencia", () => {
    for (let seed = 0; seed < 30; seed++) {
      const { teams, skillDifference } = balanceTeams(
        fixture(22),
        String(seed),
      );
      for (const a of teams[0].players)
        for (const b of teams[1].players)
          if (a.position === b.position)
            expect(
              Math.abs(
                teams[0].totalSkill -
                  teams[1].totalSkill -
                  2 * a.skill +
                  2 * b.skill,
              ),
            ).toBeGreaterThanOrEqual(skillDifference);
    }
  });
  it("varía los empates con seeds distintos y rechaza ids duplicados", () => {
    const players = fixture(12).map((player) => ({ ...player, skill: 3 }));
    expect(
      new Set(
        Array.from({ length: 8 }, (_, seed) =>
          JSON.stringify(balanceTeams(players, String(seed)).teams),
        ),
      ).size,
    ).toBeGreaterThan(1);
    expect(() => balanceTeams([players[0], players[0]], "duplicado")).toThrow();
  });
});
