export type SupabaseConfig = { url: string; anonKey: string };

export function readSupabaseConfig(input: {
  url: string | undefined;
  publishableKey?: string;
  anonKey?: string;
}): SupabaseConfig | null {
  const url = input.url?.trim();
  const anonKey = input.publishableKey?.trim() || input.anonKey?.trim();
  if (!url || !anonKey) return null;
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))
      return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash)
      return null;
    return { url: url.replace(/\/$/, ""), anonKey };
  } catch {
    return null;
  }
}

export function getSupabaseConfig(): SupabaseConfig | null {
  return readSupabaseConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();
  if (!config) throw new Error("La conexión con CUPO aún no está disponible.");
  return config;
}
