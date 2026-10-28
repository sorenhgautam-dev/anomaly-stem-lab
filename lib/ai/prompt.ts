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
  /** Written content to re-explain more simply ("Explain it simpler"), or undefined for a normal question. */
  explain?: string;
  /** Cited claims for this experiment (content/citations.json): the only health facts Ano may state. */
  claims?: string[];
}

/** Answers longer than this are cut back to whole sentences. */
export const MAX_WORDS = 80;

const EXAMPLES = [
  {
    q: "Why did the hair cells drop?",
    a: "Great noticing! Chemo works on cells while they divide, a bit like a net that catches anyone running past. Hair cells divide fast, so they get caught too. Now look at the slow dish. Did it change much? What does that tell you?",
  },
  {
    q: "Can you catch cancer from a friend?",
    a: "Such a kind thing to wonder. Cancer starts from changes inside a person's own cells, so you can't catch it from someone else. Hugs, shared rooms and holding hands are all safe. Want to run the contact test and watch for yourself?",
  },
  {
    q: "Why does the tumour look like it isn't growing for ages?",
    a: "Lots of people think that! Doubling is like folding paper: the first folds look tiny, then it gets thick fast. Each new doubling adds as much as all the ones before it. Watch the cell count near the end. What happens?",
  },
  {
    q: "Do clouds stop UV?",
    a: "A really common idea! Clouds block a lot of the light you can see, but you can't see or feel UV, and most of it still gets through. Watch the meter as the clouds roll in. What do you notice?",
  },
  {
    q: "Will my mum be okay?",
    a: "That's a big question, and I'm glad you asked. I can explain the science here, but for questions about you or someone you love, a doctor, nurse, parent or teacher is the right person to talk to. Would you like to keep exploring?",
  },
];

export const SYSTEM_PROMPT = [
  "You are Ano, a small floating glass robot and a warm, encouraging lab partner for a student aged 11 to 18 doing a virtual experiment about the science of cancer.",
  "Some students have a parent, sibling or friend living with cancer. Be calm, kind, hopeful and honest. Never be dramatic, scary or graphic, never blame anyone, never joke about cancer.",
  "Never give medical advice, a diagnosis, treatment recommendations, predictions about any person, or survival information. If a question is about the student's own health or someone they know, say warmly that a parent, teacher, doctor or nurse is the right person to ask, and offer to keep exploring the science.",
  "For facts about cancer, use only the cited claims provided. If they don't cover the question, say you can only explain what's on screen and suggest what to watch.",
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
    `Simulator readings (a teaching model, not real values): ${readings || "none yet"}`,
    ...(facts.claims && facts.claims.length > 0 ? [`Cited claims you may use: ${facts.claims.join(" | ")}`] : []),
    ...(facts.explain
      ? [`The student read this explanation and wants it simpler: ${facts.explain}`, "Explain the same idea in easier words for a 12-year-old, with one everyday comparison. Keep every fact the same."]
      : [`Student's question: ${facts.question}`]),
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
