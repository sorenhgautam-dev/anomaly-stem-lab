"use client";

import { useEffect, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";

/*
 * The live impact counter (lib/impact.ts): how many tricky ideas students
 * have busted on ANOMALY, across everyone. The number is only ever the real
 * count from the server, read after mount and every minute while the page
 * is open. If the counter can't be reached there is no number at all, just
 * a friendly line: nothing is seeded, estimated or faked.
 */

type Count = { state: "loading" } | { state: "live"; value: number } | { state: "offline" };

const REFRESH_MS = 60_000;

export function ImpactCounter() {
  const [count, setCount] = useState<Count>({ state: "loading" });

  useEffect(() => {
    let alive = true;
    const read = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/impact", { cache: "no-store" });
        const data = (await res.json()) as { count?: number | null };
        if (!alive) return;
        setCount(typeof data.count === "number" && Number.isFinite(data.count) ? { state: "live", value: data.count } : { state: "offline" });
      } catch {
        if (alive) setCount({ state: "offline" });
      }
    };
    void read();
    const id = window.setInterval(read, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div data-impact={count.state} aria-live="polite" className="paper-card flex min-h-24 flex-col justify-center gap-1 rounded-card px-5 py-4">
      {count.state === "live" ? (
        <>
          <p className="type-hero text-[clamp(3rem,7vw,4.5rem)] text-ink-900">
            <CountUp text={String(count.value)} />
          </p>
          <p className="text-[15px] text-ink-700">{count.value === 0 ? "tricky ideas busted so far. Yours could be the first!" : count.value === 1 ? "tricky idea busted so far, by students everywhere." : "tricky ideas busted so far, by students everywhere."}</p>
        </>
      ) : count.state === "offline" ? (
        <p className="text-[15px] leading-relaxed text-ink-700">The live count of busted ideas is taking a break right now. Every idea you bust still saves on this device.</p>
      ) : (
        <p className="text-[15px] text-ink-500">Counting busted ideas…</p>
      )}
    </div>
  );
}
