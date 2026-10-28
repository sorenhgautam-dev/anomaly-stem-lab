"use client";

import { useEffect, useRef } from "react";
import { playback } from "./playback";

/*
 * The Run button's middle state (pattern studied on Aceternity's stateful
 * button; our own code): after Run, the dock shows a black "Running" pill
 * whose ring fills with the real run's progress, read from the playback
 * clock each frame and written straight to the ring, never through React
 * state. When the run ends, the result card pops in with its verified or
 * anomaly mark, completing idle, running, result. Reduced motion still
 * shows the progress (it's information, not decoration).
 */

export function RunStatus() {
  const ring = useRef<SVGCircleElement>(null);
  useEffect(
    () =>
      playback.onFrame((t) => {
        ring.current?.setAttribute("stroke-dashoffset", String(Math.max(0, 1 - t / playback.duration)));
      }),
    [],
  );
  return (
    <p role="status" className="inline-flex h-12 w-fit animate-pop-in items-center gap-3 rounded-full bg-ink-900 pl-2 pr-5 text-[15px] font-semibold text-white motion-reduce:animate-none">
      <svg aria-hidden viewBox="0 0 36 36" className="size-8 -rotate-90">
        <circle cx={18} cy={18} r={13} fill="none" strokeWidth={4} className="stroke-white/20" />
        <circle ref={ring} cx={18} cy={18} r={13} fill="none" strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} className="stroke-apricot-400" />
      </svg>
      Running the simulator
    </p>
  );
}
