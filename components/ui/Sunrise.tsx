import { cn } from "@/lib/cn";

/*
 * The Sunrise background (DESIGN.md §3): a cream base lit by an apricot glow
 * bottom-left, flame top-right and volt far right, each drifting slowly on its
 * own 20–30 s loop. Pushed a little more vibrant than the reference, with a
 * grape accent. Only transforms animate, so it's cheap (DESIGN.md §9.2).
 */

const BLOBS = {
  sunrise: [
    // apricot-300, bottom-left
    "-bottom-[30%] -left-[18%] h-[95%] w-[70%] bg-[radial-gradient(closest-side,var(--color-apricot-300),color-mix(in_oklab,var(--color-apricot-300)_0%,transparent))] animate-drift-a",
    // flame-300 at 55%, top-right
    "-right-[14%] -top-[34%] h-[90%] w-[62%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-flame-300)_62%,transparent),transparent)] animate-drift-b",
    // volt-300 at 35%, far right
    "-right-[24%] top-[22%] h-[80%] w-[48%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-volt-300)_42%,transparent),transparent)] animate-drift-c",
    // a small apricot-400 core for extra warmth
    "-bottom-[12%] left-[8%] h-[46%] w-[34%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-apricot-400)_45%,transparent),transparent)] animate-drift-b",
  ],
  // Chemistry: warmer, more flame.
  chem: [
    "-bottom-[28%] -left-[16%] h-[95%] w-[72%] bg-[radial-gradient(closest-side,var(--color-apricot-300),transparent)] animate-drift-a",
    "-right-[12%] -top-[30%] h-[95%] w-[66%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-flame-300)_75%,transparent),transparent)] animate-drift-b",
    "left-[30%] top-[30%] h-[60%] w-[40%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-flame-200)_55%,transparent),transparent)] animate-drift-c",
  ],
  // Robotics: cool volt and grape, a touch of apricot for warmth.
  robo: [
    "-bottom-[30%] -left-[16%] h-[95%] w-[70%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-volt-300)_80%,transparent),transparent)] animate-drift-a",
    "-right-[14%] -top-[30%] h-[95%] w-[64%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-grape-300)_70%,transparent),transparent)] animate-drift-b",
    "-bottom-[20%] right-[10%] h-[50%] w-[36%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-apricot-300)_45%,transparent),transparent)] animate-drift-c",
  ],
};

export type SunriseTint = keyof typeof BLOBS;

export function Sunrise({ className, still = false, tint = "sunrise" }: { className?: string; still?: boolean; tint?: SunriseTint }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-cream-50", className)}>
      {BLOBS[tint].map((b) => (
        <span key={b} className={cn("absolute rounded-full will-change-transform motion-reduce:animate-none", b, still && "animate-none")} />
      ))}
    </div>
  );
}
