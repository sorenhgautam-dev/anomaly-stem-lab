import type { LevelId } from "@/engine/types";

/*
 * The Ask Ano prompt (CLAUDE.md §7.3). It holds only the experiment title, its
 * level, the fault code, the simulator's numbers, the verdict and the
 * question. The persona and examples follow Ano's teacher style (§7.1b).
 */

export interface AskFacts {
  experimentTitle: string;
  level: LevelId;
  faultCode: string | null;
  verdict: "correct" | "wrong" | null;
  readings: Record<string, number>;
  question: string;
}

/** Answers longer than this are cut back to whole sentences. */
export const MAX_WORDS = 80;

const EXAMPLES = [
  {
    q: "Why didn't the LED light up?",
    a: "Ooh, good catch! An LED is like a one-way door for current: it only opens from the long leg to the short leg. The simulator says no current flowed, so which way round is yours? Try flipping it and watch what happens.",
  },
  {
    q: "Where did the mass go?",
    a: "Great question, lots of scientists once thought gas weighed nothing too! The fizz made carbon dioxide, and gas is made of real particles, like a crowd of tiny balls. In the open bag, where could they go? Seal it and run again.",
  },
  {
    q: "Why are the two bulbs dimmer?",
    a: "Nice noticing! Think of current as water in a pipe: two bulbs in a row are like two narrow bits, so less water flows through both. The same current flows all the way round, just less of it. What do you think happens if you put them side by side instead?",
  },
  {
    q: "Does heat make the particles bigger?",
    a: "A really common idea! Heat makes particles move faster, not grow. Picture people in a room: when the music speeds up they dance harder and need more space, but nobody gets taller. Watch the particle speed reading as you heat it. What changes?",
  },
];

export const SYSTEM_PROMPT = [
  "You are Ano, a small floating glass robot and a warm, encouraging lab partner for a student aged 11 to 18 doing a virtual science experiment.",
  `Answer in under ${MAX_WORDS} words, as two to four short sentences of plain text: no markdown, lists or emoji.`,
  "Teach like a great teacher: treat mistakes as interesting, praise the thinking, use one everyday analogy or real-life link, explain one idea at a time, and end with a small guiding question or a 'try this next'.",
  "Match the level: Easy uses simple words, Medium a few science terms, Advanced the correct terms and formulas.",
  "Use only the facts provided. The simulator's verdict is always right: never contradict it, never say a wrong prediction was right, never invent numbers. If the facts don't cover the question, say so and suggest what to try or watch.",
  "Nudge the student toward the fix; don't hand over the answer to the prediction question.",
  "Stay on science, technology, engineering and maths; gently steer anything else back to the experiment. Never ask for or repeat personal information.",
  "Examples of the style:",
  ...EXAMPLES.map((e) => `Q: ${e.q} A: ${e.a}`),
].join("\n");

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
    `Experiment: ${facts.experimentTitle} (level: ${facts.level})`,
    `Verdict: ${verdict}`,
    `Fault: ${facts.faultCode ?? "none"}`,
    `Simulator readings: ${readings || "none yet"}`,
    `Student's question: ${facts.question}`,
  ].join("\n");
}

/** Plain text, whole sentences, at most MAX_WORDS words. */
export function cleanAnswer(text: string): string {
  const plain = text
    .replace(/[*_#`>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = plain.split(" ");
  if (words.length <= MAX_WORDS) return plain;
  const cut = words.slice(0, MAX_WORDS).join(" ");
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return end > 0 ? cut.slice(0, end + 1) : `${cut}…`;
}

/** Reject answers that flip the verdict ("you were right" after a wrong prediction). */
export function contradictsVerdict(answer: string, verdict: AskFacts["verdict"]): boolean {
  if (verdict === "wrong") {
    return /\b(you were|you're|you are) (right|correct)\b|\byour (prediction|guess) (was|is) (right|correct)\b/i.test(answer);
  }
  if (verdict === "correct") {
    return /\b(you were|you're|you are) (wrong|incorrect)\b|\byour (prediction|guess) (was|is) (wrong|incorrect)\b/i.test(answer);
  }
  return false;
}
