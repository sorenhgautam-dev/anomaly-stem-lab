import { cn } from "@/lib/cn";

/*
 * The verdict headline (CLAUDE.md §3.7 step 3): its letters pop in one after
 * another on a spring (correct) or stutter in with an RGB split (wrong). The
 * last word is set in the italic serif accent. Screen readers get the plain
 * phrase once.
 */
export function KineticHeadline({ text, tone }: { text: string; tone: "correct" | "wrong" }) {
  const words = text.split(" ");
  let index = 0;
  return (
    <p aria-label={text} className="type-headline text-[clamp(2.25rem,4.5vw,3.75rem)]">
      {words.map((word, w) => (
        <span key={w} aria-hidden className={cn("inline-block whitespace-nowrap", w === words.length - 1 && w > 0 && "type-accent")}>
          {[...word].map((letter) => {
            const i = index++;
            return (
              <span
                key={i}
                className={cn(
                  "inline-block bg-linear-to-b bg-clip-text text-transparent",
                  tone === "correct" ? "animate-letter-pop from-resolve-300 to-resolve-600" : "animate-letter-glitch from-anomaly-300 to-anomaly-600",
                )}
                style={{ animationDelay: `${i * (tone === "correct" ? 38 : 45)}ms` }}
              >
                {letter}
              </span>
            );
          })}
          {w < words.length - 1 && <span className="inline-block w-[0.28em]" />}
        </span>
      ))}
    </p>
  );
}
