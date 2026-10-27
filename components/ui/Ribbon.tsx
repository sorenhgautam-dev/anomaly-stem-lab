import { cn } from "@/lib/cn";

/*
 * The gradient ribbon (DESIGN.md §2 P7): a wavy apricot → flame band along the
 * bottom edge of the frame, gently swaying. Two layers at different speeds
 * give it depth. SVG paths, animated by transform only.
 */

const BACK = "M0 90 C 180 40, 360 130, 600 82 S 1020 30, 1260 86 S 1560 120, 1680 70 L 1680 200 L 0 200 Z";
const FRONT = "M0 120 C 220 70, 420 150, 660 112 S 1080 64, 1320 116 S 1580 140, 1680 104 L 1680 200 L 0 200 Z";

export function Ribbon({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-28 overflow-hidden sm:h-36", className)}>
      <svg className="absolute bottom-0 left-0 h-full w-[115%] animate-ribbon motion-reduce:animate-none" viewBox="0 0 1680 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ribbon-back" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--color-apricot-200)" />
            <stop offset="0.4" stopColor="var(--color-flame-300)" />
            <stop offset="0.75" stopColor="var(--color-apricot-300)" />
            <stop offset="1" stopColor="var(--color-volt-300)" />
          </linearGradient>
          <linearGradient id="ribbon-front" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--color-apricot-200)" />
            <stop offset="0.38" stopColor="var(--color-apricot-500)" />
            <stop offset="0.68" stopColor="var(--color-flame-400)" />
            <stop offset="1" stopColor="var(--color-apricot-300)" />
          </linearGradient>
        </defs>
        <path d={BACK} fill="url(#ribbon-back)" opacity="0.55" />
      </svg>
      <svg className="absolute bottom-0 -left-[10%] h-full w-[118%] animate-ribbon [animation-direction:alternate-reverse] [animation-duration:21s] motion-reduce:animate-none" viewBox="0 0 1680 200" preserveAspectRatio="none">
        <path d={FRONT} fill="url(#ribbon-front)" />
      </svg>
    </div>
  );
}
