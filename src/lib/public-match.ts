import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { publicSnapshotSchema } from "./contracts";

// Only the explicitly public RPC projection may reach metadata or image generation.
export const getPublicMatch = cache(async (slug: string) => {
  const client = await createClient();
  const { data, error } = await client.rpc("get_public_match", {
    p_slug: slug,
  });
  const parsed = publicSnapshotSchema.safeParse(data);
  return !error && parsed.success ? parsed.data : null;
});
