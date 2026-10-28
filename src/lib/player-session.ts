import { createClient } from "./supabase/client";
let pending: Promise<void> | null = null;
export async function ensurePlayerSession() {
  if (!pending) {
    const work = async () => {
      const client = createClient();
      const { data } = await client.auth.getSession();
      if (!data.session) {
        const result = await client.auth.signInAnonymously();
        if (result.error)
          throw new Error(
            "No pudimos preparar tu cupo. Revisa tu conexión e inténtalo otra vez.",
          );
      }
    };
    const locked = async () => {
      if (typeof navigator !== "undefined" && navigator.locks)
        await navigator.locks.request("cupo-player-session", work);
      else await work();
    };
    pending = locked().finally(() => {
      pending = null;
    });
  }
  return pending;
}
