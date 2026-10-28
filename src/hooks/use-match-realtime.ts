"use client";
import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/client";

export function useMatchRealtime(
  matchId: string,
  onRefresh: () => void,
  enabled = true,
) {
  const callback = useRef(onRefresh);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    callback.current = onRefresh;
  }, [onRefresh]);
  useEffect(() => {
    if (!enabled) return;
    const client = createClient();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (active) callback.current();
      }, 80);
    };
    let channel = client.channel(`match:${matchId}:${nanoid()}`);
    for (const table of [
      "registrations",
      "team_assignments",
      "teams",
      "matches",
    ]) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `${table === "matches" ? "id" : "match_id"}=eq.${matchId}`,
        },
        refresh,
      );
    }
    channel
      .on("system", {}, (payload) => {
        if (!active || payload.extension !== "postgres_changes") return;
        setConnected(payload.status === "ok");
        if (payload.status === "ok") refresh();
      })
      .subscribe((status) => {
        if (active && ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status))
          setConnected(false);
      });
    const visibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      clearTimeout(timer);
      void client.removeChannel(channel);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [matchId, enabled]);
  return connected;
}
