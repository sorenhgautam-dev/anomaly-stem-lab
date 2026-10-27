import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * The split giant headline (DESIGN.md §2 P3): two huge uppercase words on one
 * line with a gap between them where Ano stands, overlapping the type. On
 * phones the two parts stack ("PREDICT" / "TEST IT."). Each word rolls up
 * from a mask and its letters settle with a slight overshoot, replaying
 * whenever `rollKey` changes (DESIGN.md §9).
 */

/*
 * Verdict tones colour each letter along a two-stop ramp (a CSS gradient
 * can't be clipped to letters that each animate). Win uses the dark ends of
 * its ramps, verify-700 → volt-600, because DESIGN.md's verify-500 → volt-400
 * is under 3:1 on cream and fails WCAG AA even for giant text.
 */
const TONES = {
  ink: null,
  win: ["var(--color-verify-700)", "var(--color-volt-600)"],
  glitch: ["var(--color-anomaly-500)", "var(--color-flame-500)"],
} as const;

export type HeadlineTone = keyof typeof TONES;

function RollingWord({ text, delay, tone, from, total }: { text: string; delay: number; tone: HeadlineTone; from: number; total: number }) {
  const ramp = TONES[tone];
  return (
    <span className="inline-block overflow-hidden whitespace-nowrap pb-[0.06em] align-bottom">
      <span className="inline-block">
        {Array.from(text).map((ch, i) => {
          const k = total > 1 ? (from + i) / (total - 1) : 0;
          return (
            <span
              key={i}
              className="inline-block animate-roll-up whitespace-pre motion-reduce:animate-none"
              // Letters follow one another (and sit along the tone's ramp), so each is styled on its own.
              style={{ animationDelay: `${delay + i * 28}ms`, color: ramp ? `color-mix(in oklab, ${ramp[0]} ${Math.round((1 - k) * 100)}%, ${ramp[1]})` : undefined }}
            >
              {ch}
            </span>
          );
        })}
      </span>
    </span>
  );
}

export function SplitHeadline({
  left,
  right,
  gap,
  rollKey,
  as: Tag = "h1",
  className,
  sizeClassName = "text-[clamp(4.5rem,24vw,7.5rem)] md:text-[clamp(4rem,11vw,10.5rem)]",
  tone = "ink",
}: {
  left: string;
  right: string;
  /** What stands in the gap (usually Ano's 3D view). Hidden on phones. */
  gap?: ReactNode;
  rollKey?: string | number;
  as?: "h1" | "h2";
  className?: string;
  sizeClassName?: string;
  tone?: HeadlineTone;
}) {
  const total = left.length + right.length;
  return (
    <Tag aria-label={`${left} ${right}`} className={cn("type-hero flex flex-col items-start text-ink-900 [transform:skewY(calc(var(--scroll-skew,0)*1deg))] md:flex-row md:items-end md:justify-between md:gap-0", sizeClassName, className)}>
      <span key={`l-${rollKey}`} aria-hidden className="block">
        <RollingWord text={left} delay={0} tone={tone} from={0} total={total} />
      </span>
      {gap && (
        <span aria-hidden className="hidden shrink-0 md:block">
          {gap}
        </span>
      )}
      <span key={`r-${rollKey}`} aria-hidden className="block self-end md:self-auto">
        <RollingWord text={right} delay={140} tone={tone} from={left.length} total={total} />
      </span>
    </Tag>
  );
}
