import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ScrollWords } from "@/components/ui/ScrollWords";

/*
 * The heading for a landing section below the hero: giant type that
 * reveals word by word with the scroll (ScrollWords, DESIGN.md §9.1), and a
 * short line that rises in after it. `light` is for a section on an ink
 * colour block.
 */
export function SectionHeading({ id, title, children, light = false, className }: { id: string; title: string; children?: ReactNode; light?: boolean; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <ScrollWords id={id} text={title} className={cn("type-hero text-[clamp(3rem,8vw,6.5rem)]", light && "text-white")} />
      {children && <p className={cn("reveal mt-4 text-lg leading-relaxed [--reveal-end:60%]", light ? "text-cream-200" : "text-ink-700")}>{children}</p>}
    </div>
  );
}
