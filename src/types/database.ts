import type { Database } from "./supabase";

export type { Database, Json } from "./supabase";
export type Position = "POR" | "DEF" | "MED" | "DEL";
export type MatchStatus = "open" | "full" | "teams_ready" | "finished";
export type RegistrationStatus = "confirmed" | "waitlist" | "cancelled";

export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];
export type Registration = Database["public"]["Tables"]["registrations"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type TeamAssignment =
  Database["public"]["Tables"]["team_assignments"]["Row"];
