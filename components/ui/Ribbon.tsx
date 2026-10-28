import { cn } from "@/lib/cn";

/*
 * The gradient ribbon (DESIGN.md §2 P7): a slim wavy band in one hue family
 * (§3) along the bottom edge of the frame, as in the reference image, gently
 * swaying. Two layers at different speeds give it depth. SVG paths, animated
 * by transform only. Its colours are the --ribbon-1…3 properties (apricot
 * unless a page sets them; globals.css registers them so they cross-fade).
 */

const BACK = "M0 90 C 180 40, 360 130, 600 82 S 1020 30, 1260 86 S 1560 120, 1680 70 L 1680 200 L 0 200 Z";
const FRONT = "M0 120 C 220 70, 420 150, 660 112 S 1080 64, 1320 116 S 1580 140, 1680 104 L 1680 200 L 0 200 Z";

export function Ribbon({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-14 overflow-hidden sm:h-16", className)}>
      <svg className="absolute bottom-0 left-0 h-full w-[115%] animate-ribbon motion-reduce:animate-none" viewBox="0 0 1680 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ribbon-back" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--ribbon-1)" />
            <stop offset="1" stopColor="var(--ribbon-2)" />
          </linearGradient>
          <linearGradient id="ribbon-front" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--ribbon-2)" />
            <stop offset="1" stopColor="var(--ribbon-3)" />
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
