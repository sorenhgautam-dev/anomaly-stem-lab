import { cn } from "@/lib/cn";

/*
 * A flat, CSS-drawn Ano for loading screens (DESIGN.md §6, §7.8), made of
 * parts that fly in and click together as loading progresses. Each part
 * reads its own progress from a CSS variable (--k-antenna, --k-head,
 * --k-body, --k-arm-l, --k-arm-r: 0 scattered, 1 in place) set by the
 * loader, so nothing re-renders per frame. Server-safe.
 */

const PART = "absolute";

export function AnoParts({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-56 w-40", className)}>
      {/* Antenna: drops in from above. */}
      <div className={cn(PART, "left-1/2 top-0 h-7 w-1 -translate-x-1/2 rounded-full bg-cream-300 [transform:translate(-50%,calc((1-var(--k-antenna,1))*-90px))_rotate(calc((1-var(--k-antenna,1))*40deg))]")}>
        <span className="absolute -left-1.5 -top-2 size-4 rounded-full bg-apricot-500 shadow-warm" />
      </div>
      {/* Head: white dome, black visor, glowing eyes, orange ear pods. */}
      <div className={cn(PART, "left-1/2 top-6 h-24 w-32 [transform:translate(calc(-50%+(1-var(--k-head,1))*-120px),calc((1-var(--k-head,1))*-40px))_rotate(calc((1-var(--k-head,1))*-25deg))]")}>
        <span className="absolute -left-2 top-7 h-11 w-4 rounded-full bg-apricot-500" />
        <span className="absolute -right-2 top-7 h-11 w-4 rounded-full bg-apricot-500" />
        <span className="absolute inset-0 rounded-[48%] bg-white shadow-warm" />
        <span className="absolute inset-x-3 top-6 h-12 rounded-[45%] bg-ink-900">
          <span className="absolute left-6 top-4 h-2.5 w-4 rounded-t-full border-x-[3px] border-t-[3px] border-apricot-300" />
          <span className="absolute right-6 top-4 h-2.5 w-4 rounded-t-full border-x-[3px] border-t-[3px] border-apricot-300" />
        </span>
      </div>
      {/* Body: a glossy egg with an orange belt. */}
      <div className={cn(PART, "bottom-2 left-1/2 h-24 w-24 [transform:translate(calc(-50%+(1-var(--k-body,1))*110px),calc((1-var(--k-body,1))*70px))_rotate(calc((1-var(--k-body,1))*30deg))]")}>
        <span className="absolute inset-0 rounded-[50%_50%_46%_46%/58%_58%_42%_42%] bg-white shadow-warm" />
        <span className="absolute inset-x-1 top-[46%] h-2.5 rounded-full bg-apricot-500" />
      </div>
      {/* Arms: swing in from the sides. */}
      <div className={cn(PART, "bottom-10 left-3 h-16 w-3.5 origin-top rounded-full bg-white shadow-warm [transform:translate(calc((1-var(--k-arm-l,1))*-90px),calc((1-var(--k-arm-l,1))*30px))_rotate(calc(18deg+(1-var(--k-arm-l,1))*-70deg))]")}>
        <span className="absolute -top-1 left-1/2 size-4 -translate-x-1/2 rounded-full bg-apricot-500" />
      </div>
      <div className={cn(PART, "bottom-10 right-3 h-16 w-3.5 origin-top rounded-full bg-white shadow-warm [transform:translate(calc((1-var(--k-arm-r,1))*90px),calc((1-var(--k-arm-r,1))*30px))_rotate(calc(-18deg+(1-var(--k-arm-r,1))*70deg))]")}>
        <span className="absolute -top-1 left-1/2 size-4 -translate-x-1/2 rounded-full bg-apricot-500" />
      </div>
      {/* Floor shadow. */}
      <span className="absolute -bottom-1 left-1/2 h-3 w-24 -translate-x-1/2 rounded-full bg-ink-900/10 blur-sm" />
    </div>
  );
}
