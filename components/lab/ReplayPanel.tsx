"use client";

import { useEffect, useRef } from "react";
import { IconPlay, IconRestart } from "@/components/icons/icons";
import { formatReadout } from "@/lib/readout";
import { momentSeconds, type ReplayMoment } from "@/lib/replay";
import { Button } from "@/components/ui/Button";
import { playback } from "./playback";
import { useReplay, useReplayState } from "./useReplay";

/*
 * The replay chart after a wrong guess: what really happened (solid ink) and
 * the student's idea (dashed teal) for one reading over the run, with the
 * moment they split marked in the ANOMALY red. Solid versus dashed and the
 * ring marker carry the meaning without colour. The playhead line follows
 * the playback clock by writing to the SVG directly (no React state per
 * frame). "Keep watching" plays on from the moment.
 */

const W = 320;
const H = 120;
const PAD = { l: 8, r: 8, t: 12, b: 12 };

function scales(m: ReplayMoment, duration: number) {
  const all = [...m.realSeries, ...m.ghostSeries].map((p) => p.v);
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const end = Math.max(duration, m.t, ...m.realSeries.map((p) => p.t));
  const x = (t: number) => PAD.l + (t / end) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  return { x, y, end };
}

const path = (pts: { t: number; v: number }[], x: (t: number) => number, y: (v: number) => number) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");

export function ReplayPanel({ moment, runId, timeScale }: { moment: ReplayMoment; runId: number; timeScale: number }) {
  const { start, keepWatching } = useReplay(moment, runId);
  const status = useReplayState((s) => s.status);
  const head = useRef<SVGLineElement>(null);
  const { x, y, end } = scales(moment, playback.duration);

  useEffect(
    () =>
      playback.onFrame((t) => {
        const px = x(Math.min(t, end)).toFixed(1);
        head.current?.setAttribute("x1", px);
        head.current?.setAttribute("x2", px);
      }),
    [x, end],
  );

  const at = moment.steady ? "When the power came on" : `At ${momentSeconds(moment, timeScale).toFixed(1)} s`;
  const real = formatReadout(moment.real, moment.readout);
  const idea = formatReadout(moment.ghost, moment.readout);
  const mx = x(moment.t);

  return (
    <section data-replay={status} aria-labelledby="replay-title" className="flex flex-col gap-2 rounded-panel border border-ink-900/10 bg-cream-50 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="replay-title" className="type-heading text-base">
          The moment you were wrong
        </h3>
        <p className="type-readout text-[13px] text-ink-700" aria-live="polite">
          {status === "waiting" || status === "playing" ? "Replaying…" : `${at}: ${real} (your idea: ${idea})`}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${moment.readout.label} over the run. ${at}, what happened: ${real}. Your idea: ${idea}.`} className="h-24 w-full overflow-visible">
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="stroke-ink-900/15" strokeWidth={1} />
        <path d={path(moment.ghostSeries, x, y)} fill="none" className="stroke-chem-wall" strokeWidth={2.5} strokeDasharray="6 5" strokeLinecap="round" />
        <path d={path(moment.realSeries, x, y)} fill="none" className="stroke-ink-900" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <line x1={mx} x2={mx} y1={PAD.t - 6} y2={H - PAD.b} className="stroke-anomaly-500" strokeWidth={1.5} strokeDasharray="2 3" />
        <circle cx={mx} cy={y(moment.ghost)} r={5} className="fill-white stroke-chem-wall" strokeWidth={2} />
        <circle cx={mx} cy={y(moment.real)} r={7} className="fill-none stroke-anomaly-500" strokeWidth={2.5} />
        <circle cx={mx} cy={y(moment.real)} r={3} className="fill-ink-900" />
        <line ref={head} x1={PAD.l} x2={PAD.l} y1={PAD.t - 6} y2={H - PAD.b} className="stroke-ink-500" strokeWidth={1} />
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-700">
          <span className="flex items-center gap-1.5">
            <svg aria-hidden viewBox="0 0 24 4" className="h-1 w-6">
              <line x1="0" x2="24" y1="2" y2="2" className="stroke-ink-900" strokeWidth={3} />
            </svg>
            What happened
          </span>
          <span className="flex items-center gap-1.5">
            <svg aria-hidden viewBox="0 0 24 4" className="h-1 w-6">
              <line x1="0" x2="24" y1="2" y2="2" className="stroke-chem-wall" strokeWidth={3} strokeDasharray="5 4" />
            </svg>
            Your idea
          </span>
        </p>
        {status === "paused" ? (
          <Button onClick={keepWatching} icon={<IconPlay aria-hidden className="size-4" />}>
            Keep watching
          </Button>
        ) : status === "watching" ? (
          <Button variant="secondary" onClick={start} icon={<IconRestart aria-hidden className="size-4" />}>
            Show me the moment again
          </Button>
        ) : null}
      </div>
    </section>
  );
}
