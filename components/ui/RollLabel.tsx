import { cn } from "@/lib/cn";

/*
 * A text label that rolls on hover and keyboard focus (pattern studied on
 * Skiper's text roll navigation; our own code). Two stacked copies of the
 * word sit in a one-line mask; on hover each letter of the top copy slides
 * up out of the mask while the copy below slides in, staggered from the
 * middle letter outward. The parent needs `group/roll`. Screen readers read
 * the word once; reduced motion keeps it still.
 */

export function RollLabel({ text, className }: { text: string; className?: string }) {
  const letters = Array.from(text);
  const mid = (letters.length - 1) / 2;
  const copy = (under: boolean) =>
    letters.map((ch, i) => (
      <span
        key={i}
        className={cn(
          "inline-block whitespace-pre transition-transform duration-300 ease-out-soft motion-reduce:transition-none",
          under ? "translate-y-full group-hover/roll:translate-y-0 group-focus-visible/roll:translate-y-0" : "group-hover/roll:-translate-y-full group-focus-visible/roll:-translate-y-full",
          "motion-reduce:group-hover/roll:translate-y-0 motion-reduce:group-focus-visible/roll:translate-y-0",
        )}
        // Centre-out stagger: the middle letter goes first, the ends last (about 120 ms across a word).
        style={{ transitionDelay: `${Math.round(Math.abs(i - mid) * (120 / Math.max(1, mid)))}ms` }}
      >
        {ch}
      </span>
    ));
  return (
    <span className={cn("relative inline-flex overflow-hidden leading-[1.25]", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {copy(false)}
      </span>
      <span aria-hidden className="absolute inset-0 inline-flex motion-reduce:hidden">
        {copy(true)}
      </span>
    </span>
  );
}
