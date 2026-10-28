import anoLines from "@/content/ano-lines.json";
import { hintsFor } from "@/lib/content";

/*
 * The written fallback for every text job (CLAUDE.md §2 rule 4): the next
 * step of the misconception's hint ladder, or, when there's no diagnosis yet,
 * one of Ano's "noAnswer" lines (a nudge that stands on its own: the "stuck"
 * lines point at a hint below, which may not be there). Never an error.
 */

export function writtenHint(focus: string | null, hintStep: number): string {
  const ladder = focus ? hintsFor(focus)?.hints : undefined;
  if (ladder) return ladder[Math.min(Math.max(hintStep, 0), ladder.length - 1)];
  return anoLines.noAnswer[Math.abs(hintStep) % anoLines.noAnswer.length];
}
