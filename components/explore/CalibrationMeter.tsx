"use client";

import { calibrationLine, calibrationNudge, CONFIDENCE_ROWS, rightPercent } from "@/lib/calibration";
import { useProgress } from "@/lib/progress";

const EMPTY_CALLS = { guess: { right: 0, total: 0 }, fairly: { right: 0, total: 0 }, certain: { right: 0, total: 0 } };

/*
 * The calibration meter on My ideas: for each "How sure are you?" setting,
 * how many of those guesses turned out right, from this browser's saved runs.
 * The bar is the real share; the words carry the same numbers, so it reads
 * without colour. "What if?" runs aren't guesses, so they never count.
 */

export function CalibrationMeter() {
  const hydrated = useProgress((s) => s.hydrated);
  const saved = useProgress((s) => s.calls);
  // Before saved progress loads it shows the empty meter at the same size, so nothing below it jumps.
  const calls = hydrated ? saved : EMPTY_CALLS;
  const nudge = calibrationNudge(calls);

  return (
    <section aria-labelledby="calibration" className="flex flex-col gap-3">
      <h2 id="calibration" className="type-heading text-2xl">
        How sure vs how right
      </h2>
      <div className="paper-card flex flex-col gap-4 rounded-card p-5">
        <p data-calibration-line className="text-[15px] leading-relaxed text-ink-900">
          {calibrationLine(calls)} {nudge}
        </p>
        <dl className="flex flex-col gap-3">
          {CONFIDENCE_ROWS.map(({ id, label }) => {
            const c = calls[id];
            const p = rightPercent(c);
            return (
              <div key={id} data-calibration={id} className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[13rem_minmax(0,1fr)_8.5rem] sm:items-center sm:gap-3">
                <dt className="text-[14px] text-ink-700">{label}</dt>
                <dd aria-hidden className="h-2.5 overflow-hidden rounded-full bg-ink-900/10">
                  {/* Width is the live share of right guesses, so it's set per value. */}
                  <span className="block h-full rounded-full bg-verify-500 transition-[width] duration-500" style={{ width: `${p ?? 0}%` }} />
                </dd>
                <dd className="type-readout text-[13px] text-ink-700 sm:text-right">{c.total === 0 ? "no guesses yet" : `${c.right} of ${c.total} right (${p}%)`}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
