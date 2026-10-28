"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { setMuted } from "@/lib/sound";
import { IconButton } from "./IconButton";

/*
 * The visible mute toggle (CLAUDE.md §3.1: sound starts only after the first
 * click, with a mute toggle in sight). Four equaliser bars that keep a
 * gentle beat while sound is on and settle into dots when it's muted
 * (pattern studied on Skiper's music toggle; our own code, CSS transforms
 * only). Reduced motion holds the bars still. The choice is remembered in this
 * browser; storage can be missing or blocked, so every read and write is
 * guarded and the default is sound on. The first render matches the server.
 */

const KEY = "anomaly:muted";
/** Each bar's beat, and its height when motion is reduced. */
const BARS = [
  { delay: "-120ms", duration: "780ms", still: "motion-reduce:scale-y-50" },
  { delay: "-480ms", duration: "960ms", still: "motion-reduce:scale-y-100" },
  { delay: "-260ms", duration: "700ms", still: "motion-reduce:scale-y-75" },
  { delay: "-640ms", duration: "880ms", still: "motion-reduce:scale-y-[0.4]" },
];
const listeners = new Set<() => void>();
let muted = false;
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    muted = window.localStorage.getItem(KEY) === "1";
  } catch {
    muted = false;
  }
  setMuted(muted);
}

function toggle() {
  muted = !muted;
  setMuted(muted);
  try {
    window.localStorage.setItem(KEY, muted ? "1" : "0");
  } catch {
    // Not remembered, but still applied for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function SoundToggle({ className }: { className?: string }) {
  const off = useSyncExternalStore(
    subscribe,
    () => muted,
    () => false,
  );
  useEffect(() => {
    load();
    listeners.forEach((l) => l());
  }, []);
  return (
    <IconButton label="Mute sound" aria-pressed={off} onClick={toggle} className={className}>
      <span aria-hidden className="flex h-5 items-center gap-[3px]">
        {BARS.map((b, i) => (
          <span
            key={i}
            className={cn(
              "h-full w-[3px] origin-center rounded-full transition-[scale,background-color] duration-500 ease-spring",
              i % 2 ? "bg-robo-gold" : "bg-ink-900",
              off ? "scale-y-[0.22]" : cn("motion-safe:animate-eq", b.still),
            )}
            style={off ? undefined : { animationDelay: b.delay, animationDuration: b.duration }}
          />
        ))}
      </span>
    </IconButton>
  );
}
