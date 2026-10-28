import { cn } from "@/lib/cn";

/*
 * The live vote bars: one row per option, in the experiment's own order,
 * each bar as long as its share of the guesses. After the reveal the right
 * answer's row is marked. Real counts only.
 */
export function VoteBars({ options, counts, answer }: { options: readonly string[]; counts: readonly number[]; answer?: string | null }) {
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <ul className="flex flex-col gap-3" aria-label="Guesses so far">
      {options.map((option, i) => {
        const n = counts[i] ?? 0;
        const right = answer === option;
        return (
          <li key={option} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[15px] leading-snug">
              <span className={cn("text-ink-900", right && "font-semibold text-verify-700")}>
                {option}
                {right && " · what really happens"}
              </span>
              <span className="type-readout shrink-0 text-ink-700">{n}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink-900/[0.07]">
              {/* A transform, never a width, so the bar grows without re-laying out the list. */}
              <div className={cn("h-full origin-left rounded-full transition-transform duration-500 ease-out-soft motion-reduce:transition-none", right ? "bg-verify-500" : "bg-ink-700")} style={{ transform: `scaleX(${total ? n / total : 0})` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
