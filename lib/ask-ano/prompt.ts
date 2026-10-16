/*
 * The Ask Ano prompt (CLAUDE.md §7.3). It contains only: the experiment title,
 * the fault code, the simulator's numbers, the verdict and the question.
 */

export interface AskFacts {
  experimentTitle: string;
  faultCode: string | null;
  verdict: "correct" | "wrong" | null;
  readings: Record<string, number>;
  question: string;
}

export const SYSTEM_PROMPT = [
  "You are Ano, a small glass robot and a friendly lab partner for a teenager (14 to 18) doing a virtual science experiment.",
  "Answer the student's question in under 60 words, in plain, warm language. No markdown, no lists, no emoji.",
  "Use only the facts provided about the experiment. If the facts don't cover the question, say so briefly and suggest what to try or watch in the experiment.",
  "The simulator's verdict is always right. Never contradict it, never say a wrong prediction was right, and never invent numbers.",
  "Explain the idea and nudge the student toward the fix; don't just hand over the answer to the prediction question.",
  "Stay on science, technology, engineering and maths. If the question is about anything else, gently steer back to the experiment.",
  "Never ask for or repeat personal information.",
].join(" ");

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "n/a";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.01 || abs >= 10000)) return value.toExponential(2);
  return String(Math.round(value * 1000) / 1000);
}

export function buildPrompt(facts: AskFacts): string {
  const readings = Object.entries(facts.readings)
    .map(([key, value]) => `${key} = ${formatNumber(value)}`)
    .join(", ");
  const verdict =
    facts.verdict === "correct"
      ? "The student's prediction matched the simulator."
      : facts.verdict === "wrong"
        ? "The student's prediction did NOT match the simulator."
        : "The student hasn't run the experiment yet.";
  return [
    `Experiment: ${facts.experimentTitle}`,
    `Verdict: ${verdict}`,
    `Fault: ${facts.faultCode ?? "none"}`,
    `Simulator readings: ${readings || "none yet"}`,
    `Student's question: ${facts.question}`,
  ].join("\n");
}

/** Reject answers that flip the verdict ("you were right" after a wrong prediction). */
export function contradictsVerdict(answer: string, verdict: AskFacts["verdict"]): boolean {
  if (verdict === "wrong") {
    return /\b(you were|you're|you are) (right|correct)\b|\byour prediction (was|is) (right|correct)\b/i.test(answer);
  }
  if (verdict === "correct") {
    return /\b(you were|you're|you are) (wrong|incorrect)\b|\byour prediction (was|is) (wrong|incorrect)\b/i.test(answer);
  }
  return false;
}
