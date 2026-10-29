import { z } from "zod";
import { positionSchema } from "./validation";

export const matchSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  starts_at: z.string(),
  location: z.string(),
  maps_url: z.string().nullable().default(null),
  capacity: z.number(),
  status: z.enum(["open", "full", "teams_ready", "finished"]),
  price_per_player: z.number().nullable(),
  revision: z.number().default(0),
});
export const registrationSchema = z.object({
  id: z.uuid(),
  player_name: z.string(),
  position: positionSchema,
  status: z.enum(["confirmed", "waitlist", "cancelled"]),
  waitlist_position: z.number().nullable().optional(),
});
export const teamSchema = z.object({
  id: z.uuid(),
  match_id: z.uuid(),
  name: z.string(),
  color: z.string(),
  idx: z.number(),
});
export const assignmentSchema = z.object({
  registration_id: z.uuid(),
  team_id: z.uuid(),
  match_id: z.uuid(),
  pitch_x: z.number(),
  pitch_y: z.number(),
});
export const publicSnapshotSchema = z.object({
  match: matchSchema,
  registrations: z.array(registrationSchema),
  teams: z.array(teamSchema),
  assignments: z.array(assignmentSchema),
});
export const adminRegistrationSchema = registrationSchema.extend({
  paid: z.boolean(),
  skill: z.number(),
  created_at: z.string(),
});
export const adminSnapshotSchema = publicSnapshotSchema.extend({
  registrations: z.array(adminRegistrationSchema),
});
export type MatchInfo = z.infer<typeof matchSchema>;
export type PublicRegistration = z.infer<typeof registrationSchema>;
export type PublicSnapshot = z.infer<typeof publicSnapshotSchema>;
export type AdminSnapshot = z.infer<typeof adminSnapshotSchema>;
export type TeamInfo = z.infer<typeof teamSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
