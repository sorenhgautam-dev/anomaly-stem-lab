"use client";

import { useEffect, useState } from "react";

/*
 * A live room's state, polled every 1.5 s while the page is open (no
 * sockets: phones on school Wi-Fi poll fine, and Upstash needs no server
 * process). `status` says why there's no room: still loading, a code that
 * doesn't exist (or expired), or live mode switched off on this site.
 */

export interface RoomState {
  experimentId: string;
  phase: "guessing" | "revealed";
  counts: number[];
}

export type RoomStatus = "loading" | "ok" | "missing" | "off";

export function useRoom(code: string | null, every = 1500): { room: RoomState | null; status: RoomStatus } {
  const [state, setState] = useState<{ room: RoomState | null; status: RoomStatus }>({ room: null, status: "loading" });
  useEffect(() => {
    if (!code) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/${code}`, { cache: "no-store" });
        if (!alive) return;
        if (res.ok) setState({ room: (await res.json()) as RoomState, status: "ok" });
        else setState((s) => ({ room: s.room, status: res.status === 503 ? "off" : res.status === 404 ? "missing" : s.status }));
      } catch {
        // A dropped poll keeps the last state; the next one tries again.
      }
      if (alive) timer = setTimeout(tick, every);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [code, every]);
  return state;
}

/** A random token for this phone's guess in one room, kept for the tab's life only. */
export function voterToken(code: string): string {
  const key = `anomaly:live:${code}`;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) return saved;
    const made = crypto.randomUUID();
    sessionStorage.setItem(key, made);
    return made;
  } catch {
    return crypto.randomUUID();
  }
}
