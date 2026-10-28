"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { RollingLetters, useRollOnView } from "./RollingText";

/*
 * The split giant headline (DESIGN.md §2 P3): two huge uppercase words on one
 * line with a gap between them where Ano stands, overlapping the type. On
 * phones the two parts stack ("PREDICT" / "TEST IT."). Each word rolls up
 * from a mask and its letters settle with a slight overshoot, replaying
 * whenever `rollKey` changes (DESIGN.md §9). `when="view"` waits until the
 * headline scrolls into view (for headlines further down a page).
 */

/*
 * Verdict tones colour each letter along a two-stop ramp (a CSS gradient
 * can't be clipped to letters that each animate). Win uses the dark ends of
 * its one hue, verify-700 deepening toward ink, because verify-500 is under
 * 3:1 on cream and fails WCAG AA even for giant text (DESIGN.md §0: one hue
 * family per gradient).
 */
const TONES = {
  ink: null,
  win: ["var(--color-verify-700)", "color-mix(in oklab, var(--color-verify-700) 70%, var(--color-ink-900))"],
  glitch: ["var(--color-anomaly-500)", "var(--color-anomaly-700)"],
} as const;

export type HeadlineTone = keyof typeof TONES;

export function SplitHeadline({
  left,
  right,
  gap,
  rollKey,
  as: Tag = "h1",
  className,
  sizeClassName = "text-[clamp(4.5rem,24vw,7.5rem)] md:text-[clamp(4rem,11vw,10.5rem)]",
  tone = "ink",
  when = "mount",
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
  when?: "mount" | "view";
}) {
  const total = left.length + right.length;
  const ramp = TONES[tone];
  const view = useRollOnView<HTMLHeadingElement>();
  return (
    <Tag ref={when === "view" ? view : undefined} data-roll={when === "mount" ? "go" : undefined} aria-label={`${left} ${right}`} className={cn("type-hero flex flex-col items-start text-ink-900 [transform:skewY(calc(var(--scroll-skew,0)*1deg))] md:flex-row md:items-end md:justify-between md:gap-0", sizeClassName, className)}>
      <span key={`l-${rollKey}`} aria-hidden className="block">
        <RollingLetters text={left} ramp={ramp} total={total} />
      </span>
      {gap && (
        <span aria-hidden className="hidden shrink-0 md:block">
          {gap}
        </span>
      )}
      <span key={`r-${rollKey}`} aria-hidden className="block self-end md:self-auto">
        <RollingLetters text={right} delay={140} ramp={ramp} from={left.length} total={total} />
      </span>
    </Tag>
  );
}
