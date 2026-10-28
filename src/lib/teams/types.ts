import type { Position } from "@/types/database";

export interface PlayerForBalance {
  registrationId: string;
  playerName: string;
  position: Position;
  skill?: number; // 1-5, default 3 if unknown
}

export interface TeamResult {
  teamIndex: 0 | 1;
  players: (PlayerForBalance & { skill: number })[];
  totalSkill: number;
  positionCounts: Record<Position, number>;
}

export interface BalanceResult {
  teams: [TeamResult, TeamResult];
  skillDifference: number;
  seed: string;
}
