import anoLines from "@/content/ano-lines.json";
import { getExperiment, hintsFor, theoryFor } from "@/lib/content";

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

/*
 * When Ano's live answers are off (no key, a failed call, a limit), Ask Ano
 * still answers from content/: the line in this experiment's hints and theory
 * that shares the most words with the question, after a short honest note.
 * A question with nothing in common gets the next hint.
 */

const SKIP = new Set("a an and are as at be but by can could did do does for from get got had has have how i if in into is it its me my no not of on or out so than that the their them then there they this to up was we what when where which who why will with would you your".split(" "));

/** Rough word stems: lower case, no plural s, first five letters ("dividing" and "divides" match). */
function stems(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/);
  return new Set(words.filter((w) => w.length > 1 && !SKIP.has(w)).map((w) => w.replace(/s$/, "").slice(0, 5)));
}

export function bestWritten(experimentId: string, question: string, focus: string | null, hintStep: number): string {
  const def = getExperiment(experimentId);
  const ids = [...new Set([focus, ...(def?.misconceptions ?? [])])].filter((id): id is string => !!id);
  const lines = [...ids.flatMap((id) => hintsFor(id)?.hints ?? []), ...((def && theoryFor(def.theoryId)?.body) ?? [])];
  const asked = stems(question);
  let best: string | null = null;
  let most = 0;
  for (const line of lines) {
    const shared = [...stems(line)].filter((w) => asked.has(w)).length;
    if (shared > most) [best, most] = [line, shared];
  }
  return best ?? writtenHint(focus, hintStep);
}

/** Ask Ano's reply without the model: the honest note, then the closest written line. */
export function offlineAnswer(experimentId: string, question: string, focus: string | null, hintStep: number): string {
  return `${anoLines.liveOff[0]} ${bestWritten(experimentId, question, focus, hintStep)}`;
}
