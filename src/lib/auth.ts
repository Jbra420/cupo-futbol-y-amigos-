import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "./env";

export const getOrganizer = cache(async () => {
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) return null;
  const access = await supabase.rpc("is_app_administrator");
  if (access.error || access.data !== true) return null;
  return { supabase, user: data.user };
});
