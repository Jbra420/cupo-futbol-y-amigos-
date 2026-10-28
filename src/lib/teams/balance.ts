import seedrandom from "seedrandom";
import type { Position } from "@/types/database";
import type { PlayerForBalance, BalanceResult, TeamResult } from "./types";

type RatedPlayer = PlayerForBalance & { skill: number };
const POSITIONS: Position[] = ["POR", "DEF", "MED", "DEL"];
const total = (players: RatedPlayer[]) =>
  players.reduce((sum, player) => sum + player.skill, 0);
const counts = (players: RatedPlayer[]) =>
  Object.fromEntries(
    POSITIONS.map((position) => [
      position,
      players.filter((player) => player.position === position).length,
    ]),
  ) as Record<Position, number>;
const compareId = (a: PlayerForBalance, b: PlayerForBalance) =>
  a.registrationId < b.registrationId
    ? -1
    : a.registrationId === b.registrationId
      ? 0
      : 1;

/** Seeded serpentine draft, position-preserving size repair and strict local optimization. */
export function balanceTeams(
  input: readonly PlayerForBalance[],
  seed: string,
): BalanceResult {
  if (
    new Set(input.map((player) => player.registrationId)).size !== input.length
  )
    throw new Error("Hay jugadores repetidos.");
  const rng = seedrandom(seed);
  const players: RatedPlayer[] = [...input].sort(compareId).map((player) => ({
    ...player,
    skill:
      Number.isInteger(player.skill) && player.skill! >= 1 && player.skill! <= 5
        ? player.skill!
        : 3,
  }));
  if (players.some((player) => !POSITIONS.includes(player.position)))
    throw new Error("Hay una posición inválida.");
  const rank = new Map(players.map((player) => [player.registrationId, rng()]));
  const teams: [RatedPlayer[], RatedPlayer[]] = [[], []];
  const first = rng() < 0.5 ? 0 : 1;
  POSITIONS.forEach((position, groupIndex) => {
    const group = players
      .filter((player) => player.position === position)
      .sort(
        (a, b) =>
          b.skill - a.skill ||
          rank.get(a.registrationId)! - rank.get(b.registrationId)! ||
          compareId(a, b),
      );
    const start = (first + groupIndex) % 2;
    group.forEach((player, index) => {
      const turn = index % 4;
      teams[turn === 0 || turn === 3 ? start : 1 - start].push(player);
    });
  });
  while (Math.abs(teams[0].length - teams[1].length) > 1) {
    const donor = teams[0].length > teams[1].length ? 0 : 1;
    const receiver = 1 - donor;
    const donorCounts = counts(teams[donor]);
    const receiverCounts = counts(teams[receiver]);
    const candidates = teams[donor].filter(
      (player) =>
        donorCounts[player.position] > receiverCounts[player.position],
    );
    candidates.sort(
      (a, b) =>
        Math.abs(total(teams[donor]) - total(teams[receiver]) - 2 * a.skill) -
          Math.abs(
            total(teams[donor]) - total(teams[receiver]) - 2 * b.skill,
          ) || compareId(a, b),
    );
    const chosen = candidates[0];
    teams[donor].splice(teams[donor].indexOf(chosen), 1);
    teams[receiver].push(chosen);
  }
  // Every accepted swap strictly reduces an integer difference, so this loop terminates.
  while (true) {
    const difference = Math.abs(total(teams[0]) - total(teams[1]));
    let best = difference;
    let swap: [number, number] | null = null;
    for (let a = 0; a < teams[0].length; a++)
      for (let b = 0; b < teams[1].length; b++) {
        if (teams[0][a].position !== teams[1][b].position) continue;
        const next = Math.abs(
          total(teams[0]) -
            total(teams[1]) -
            2 * teams[0][a].skill +
            2 * teams[1][b].skill,
        );
        if (next < best) {
          best = next;
          swap = [a, b];
        }
      }
    if (!swap) break;
    const [a, b] = swap;
    [teams[0][a], teams[1][b]] = [teams[1][b], teams[0][a]];
  }
  const result = teams.map((team, index) => ({
    teamIndex: index,
    players: team,
    totalSkill: total(team),
    positionCounts: counts(team),
  })) as [TeamResult, TeamResult];
  return {
    teams: result,
    skillDifference: Math.abs(result[0].totalSkill - result[1].totalSkill),
    seed,
  };
}
