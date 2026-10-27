import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* The heading for a landing section below the hero. */
export function SectionHeading({ id, title, children, className }: { id: string; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("reveal max-w-2xl", className)}>
      <h2 id={id} className="type-hero text-[clamp(3rem,8vw,6.5rem)]">
        {title}
      </h2>
      {children && <p className="mt-4 text-lg leading-relaxed text-ink-700">{children}</p>}
    </div>
  );
}
