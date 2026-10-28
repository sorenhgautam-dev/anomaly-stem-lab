import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";

/*
 * The learning note (DESIGN.md §5, CLAUDE.md §5): a small, calm paper strip
 * on every lab page, the science page and the footer. ANOMALY teaches the
 * science; questions about anyone's health belong with a trusted adult.
 */
export function LearningNote({ className }: { className?: string }) {
  return (
    <p data-learning-note className={cn("rounded-tile border border-ink-900/10 bg-cream-50 px-3 py-2 text-[13px] leading-snug text-ink-700", className)}>
      {landing.learningNote}
    </p>
  );
}
