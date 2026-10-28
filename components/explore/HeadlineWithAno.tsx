"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnoView } from "@/components/ano/AnoView";
import type { AnoAction, AnoExpression } from "@/components/ano/types";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { cn } from "@/lib/cn";

/*
 * A page headline with Ano standing in its gap (DESIGN.md §2 P3, §7.2:
 * "PICK · YOUR LEVEL." with Ano in the gap) and his speech bubble hanging
 * from him, its tail pointing up at him. The gap is decoration (the headline
 * hides it from screen readers), so the bubble lives outside the heading,
 * shifted under the gap by measuring where the gap landed. On phones Ano
 * stands beside the bubble under the headline.
 */

/** Where the bubble's top tail sits from its left edge (SpeechBubble's "top" tail: left-8 plus half its 12 px). */
const TAIL_X = 38;

export function HeadlineWithAno({ left, right, line, expression, action, sizeClassName, className }: { left: string; right: string; line: string; expression: AnoExpression; action?: AnoAction | null; sizeClassName?: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const gap = useRef<HTMLSpanElement>(null);
  const [x, setX] = useState<number | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const w = wrap.current?.getBoundingClientRect();
      const g = gap.current?.getBoundingClientRect();
      if (!w || !g || g.width === 0) return setX(null);
      setX(Math.max(0, g.left + g.width / 2 - w.left - TAIL_X));
    };
    place();
    // The gap moves when the display font arrives or the window resizes.
    void document.fonts?.ready.then(place);
    const ro = new ResizeObserver(place);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  const label = `Ano, looking ${expression}`;
  return (
    <div ref={wrap}>
      <SplitHeadline
        className={cn("relative z-15 [word-spacing:0.1em] md:justify-start md:gap-[0.06em]", className)}
        left={left}
        right={right}
        sizeClassName={sizeClassName}
        gap={
          <span ref={gap} className="relative block h-[0.8em] w-[1.1em]">
            <AnoView className="absolute -inset-x-[28%] -top-[60%] -bottom-[6%]" framing="hero" shadow={false} expression={expression} action={action} label={label} />
          </span>
        }
      />
      {/* Wide screens: the bubble hangs from Ano. */}
      <div className="relative z-20 mt-3 hidden w-[min(22rem,40vw)] transition-opacity duration-300 md:block" style={{ marginLeft: x ?? 0, opacity: x === null ? 0 : 1 }}>
        <SpeechBubble key={line} text={line} tail="top" />
      </div>
      {/* Phones: Ano beside the bubble. */}
      <div className="relative z-20 mt-4 flex items-center gap-1 md:hidden">
        <AnoView className="h-36 w-28 shrink-0" framing="bust" expression={expression} action={action} label={label} />
        <SpeechBubble key={line} text={line} tail="left" className="min-w-0 flex-1" />
      </div>
    </div>
  );
}
