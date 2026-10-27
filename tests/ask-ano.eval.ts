import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { LanguageModel } from "ai";
import { askAno, generateAnswer, type AskInput } from "@/lib/ai/askAno";
import { writtenHint } from "@/lib/ai/hints";
import { ASK_BUDGETS, memoryStore } from "@/lib/ai/limits";
import { buildPrompt, cleanAnswer, contradictsVerdict, MAX_WORDS, type AskFacts } from "@/lib/ai/prompt";
import { anoVoice } from "@/lib/ai/voice";

/*
 * Ask Ano eval (CLAUDE.md §7.1b, §10.1). About 20 questions, each with the
 * facts sent and the points a good answer must contain and must not say.
 *
 * Default (CI, every gauntlet round): a mock provider answers from a table of
 * reference answers, so this checks the pipeline (prompt, word cap, verdict
 * guard, cache, limits, written-hint fallback) and the teacher-quality checks
 * themselves. With ASK_ANO_EVAL=real and GROQ_API_KEY set, the same cases run
 * against the real provider (one call each, 20 in total) and print the pass rate.
 */

interface Case {
  facts: AskFacts;
  /** Science points a good answer contains (all must match). */
  must: RegExp[];
  /** Things a good answer never says. */
  mustNot: RegExp[];
  /** A reference answer in Ano's style (the mock provider's reply). */
  reference: string;
}

const base = (title: string, level: AskFacts["level"], verdict: AskFacts["verdict"], faultCode: string | null, readings: Record<string, number>, question: string): AskFacts => ({ experimentTitle: title, level, verdict, faultCode, readings, question });

const CASES: Case[] = [
  {
    facts: base("Light the LED", "medium", "wrong", null, { "led.current": 0, "led.lit": 0 }, "Why didn't the LED light up?"),
    must: [/one(-| )way|direction|backwards|flip/i],
    mustNot: [/you were right/i],
    reference: "Ooh, good catch! An LED is like a one-way door: current only gets in through the long leg. The simulator shows zero current, so which way round is yours? Try flipping it and run again.",
  },
  {
    facts: base("Light the LED", "medium", "wrong", "burnout:led", { "led.current": 0.42, "led.burnt": 1 }, "Why did it burn out?"),
    must: [/resistor|too much current|current/i],
    mustNot: [/you were right/i],
    reference: "That pop is the LED getting far too much current, like a garden hose on a straw. A resistor in series slows the current down to a safe trickle. Where could one fit in your circuit?",
  },
  {
    facts: base("Mass in a sealed bag", "easy", "wrong", null, { "scale.start": 130, "scale.end": 127.4, "co2.escaped": 2.6 }, "Where did the mass go?"),
    must: [/gas|carbon dioxide|co2/i, /escap|left|out/i],
    mustNot: [/destroyed|vanish(ed)? (into|for) nothing|you were right/i],
    reference: "Great question! The fizz made carbon dioxide gas, and gas is made of real particles, like a crowd of tiny balls. In the open bag they floated out into the room. What do you think happens if you seal the bag?",
  },
  {
    facts: base("Mass in a sealed bag", "easy", "correct", null, { "scale.start": 130, "scale.end": 130 }, "Why did the scale stay the same?"),
    must: [/sealed|trapped|inside|stay/i],
    mustNot: [/you were wrong/i],
    reference: "You called it! The gas stayed trapped in the sealed bag, like air in a balloon, so every particle was still on the scale. Atoms only swapped partners. Want to try the open bag next?",
  },
  {
    facts: base("Series vs parallel bulbs", "easy", "wrong", null, { "b1.brightness": 0.25, "b2.brightness": 0.25 }, "Why are both bulbs dim?"),
    must: [/current|resist/i],
    mustNot: [/\b(current|it) (is|gets) used up/i],
    reference: "Nice noticing! Think of current as water in a pipe: two bulbs in a row are two narrow bits, so less water flows through both. Nothing gets used up along the way. What if you put them side by side?",
  },
  {
    facts: base("Short-cut wire", "medium", "wrong", "short-circuit", { "batt.current": 5.2 }, "Is a short circuit dangerous?"),
    must: [/current|heat|hot/i],
    mustNot: [/harmless|safe to/i],
    reference: "Yes, and the simulator shows why: the current shot up to 5.2 amps with nothing to slow it, like a river with the dam removed. Real wires get hot fast. Can you find which wire made the short cut?",
  },
  {
    facts: base("Switches", "easy", "wrong", "open-circuit", { "bulb.lit": 0 }, "Does the switch have to be on the plus side?"),
    must: [/anywhere|loop|circle|break/i],
    mustNot: [/only (works )?on the (plus|positive)/i],
    reference: "Ooh, lots of people think that! A circuit is like a running track: break it anywhere and the runners stop. The switch works on either side. Want to move it and see for yourself?",
  },
  {
    facts: base("Melting and particles", "easy", "wrong", null, { "temp.duringMelt": 0 }, "Why does the temperature stop rising while it melts?"),
    must: [/energy|break|pattern|bond/i],
    mustNot: [/heat (stops|is turned off)/i],
    reference: "Good eye! While ice melts, the heat goes into pulling the particles out of their tidy pattern, like unpacking a full suitcase, so they don't speed up yet. Watch the reading after the last ice goes. What happens then?",
  },
  {
    facts: base("Dissolving sugar", "easy", "wrong", null, { "sugar.grams": 10, "scale.end": 210 }, "Did the sugar disappear?"),
    must: [/still there|spread|between/i],
    mustNot: [/destroyed|gone forever/i],
    reference: "It looks gone, but it's still there! The sugar broke into particles too small to see, spread out between the water particles like sprinkles stirred into batter. The scale kept the same mass. What would you taste?",
  },
  {
    facts: base("Gas particles and heat", "medium", "wrong", null, { "particles.speedRatio": 1.15, "particles.sizeRatio": 1 }, "Do the particles get bigger when it's hot?"),
    must: [/faster|speed|move/i],
    mustNot: [/(get|grow) bigger/i],
    reference: "A really common idea! Heat makes particles move faster, not grow. Picture people at a party dancing harder when the music speeds up: they need more room, but nobody gets taller. Check the speed reading. What changed?",
  },
  {
    facts: base("Reaction speed and temperature", "medium", "wrong", null, { "cold.finish": 60, "hot.finish": 20 }, "Why did the hot tablet finish first?"),
    must: [/collid|collision|faster|energy/i],
    mustNot: [/you were right/i],
    reference: "Nice question! In hot water the particles zoom around faster, so they bump into the tablet more often and harder, like a busy playground at break time. More good collisions, faster reaction. What would ice water do?",
  },
  {
    facts: base("Indicator colours", "easy", "wrong", null, { ph: 3 }, "Why is lemon juice an acid if we eat it?"),
    must: [/acid|ph/i],
    mustNot: [/food can't be acid/i],
    reference: "Lots of foods are acids! Lemon juice has a pH around 3, which is why it tastes sour, like vinegar on chips. Being an acid doesn't mean it's dangerous to eat. What colour did the indicator turn?",
  },
  {
    facts: base("Neutralisation and pH", "medium", "wrong", null, { ph: 7, "base.ml": 25 }, "Why did it get to pH 7 so suddenly?"),
    must: [/acid|base|neutral|h\+|oh-/i],
    mustNot: [/you were right/i],
    reference: "Great spot! Each drop of base uses up some acid, like filling a bucket drop by drop, and near the end the last few drops tip it over. That's the equivalence point. Where on the curve did it jump?",
  },
  {
    facts: base("Burning in open vs sealed containers", "medium", "wrong", null, { "oxygen.used": 1.2 }, "How can burning make it heavier?"),
    must: [/oxygen/i],
    mustNot: [/destroy/i],
    reference: "It sounds backwards, right? When steel wool burns, its iron grabs oxygen from the air, like a magnet picking up paper clips, so the solid gains that oxygen's mass. What would happen in a sealed jar?",
  },
  {
    facts: base("Gas laws (PV = nRT)", "advanced", "wrong", null, { "pressure.ratio": 2, "volume.end": 50 }, "Why did the pressure double?"),
    must: [/volume|half|collision|boyle/i],
    mustNot: [/you were right/i],
    reference: "Nice thinking! Halve the volume at constant temperature and the particles hit the walls twice as often, so P₁V₁ = P₂V₂ gives double the pressure, like squeezing a crowd into half the hall. What if you halve it again?",
  },
  {
    facts: base("Activation energy and catalysts", "advanced", "wrong", null, { "catalyst.start": 1, "catalyst.end": 1 }, "Does the catalyst get used up?"),
    must: [/not used up|same|unchanged|still/i],
    mustNot: [/(is|gets) used up/i],
    reference: "Good question, and the scale answers it: 1 g before, 1 g after. A catalyst offers an easier route with a lower activation energy, like a tunnel through a hill, and comes out unchanged. Could you reuse it?",
  },
  {
    facts: base("Equilibrium (Le Chatelier)", "advanced", "wrong", null, { "color.start": 0.4, "color.end": 0.7 }, "Why did it get darker when heated?"),
    must: [/shift|endothermic|heat|no2/i],
    mustNot: [/frozen|stopped/i],
    reference: "Great observation! Pairing NO₂ into N₂O₄ gives out heat, so adding heat pushes the balance back toward brown NO₂, like a seesaw tipping away from the weight you add. Le Chatelier in action. What would ice do?",
  },
  {
    facts: base("Gears: speed vs strength", "advanced", "wrong", null, { "gear.ratio": 3, "driven.rpm": 40 }, "Why is the big gear slower?"),
    must: [/teeth|ratio|turn/i],
    mustNot: [/big gear (is|turns) faster/i],
    reference: "Nice question! The big gear has three times the teeth, so the small one must spin three times to turn it once, like a bike in its easiest gear. Slower, but stronger. Which would you pick for climbing a hill?",
  },
  {
    facts: base("Motor speed control (PWM)", "advanced", "wrong", null, { "pwm.duty": 0.5, "motor.speedFraction": 0.5 }, "Why isn't it full speed if it's switching on and off?"),
    must: [/average|duty/i],
    mustNot: [/you were right/i],
    reference: "Good thinking! Switching fast is like pedalling half the time: the motor's weight smooths it into an average, so a 50% duty cycle gives about half speed. What duty cycle would give three quarters?",
  },
  {
    facts: base("Two-wheel steering", "medium", "wrong", null, { "robot.turn": -90 }, "What's your favourite film?"),
    must: [/robot|wheel|experiment|turn/i],
    mustNot: [/my favourite (film|movie) is/i],
    reference: "Ha, I'm more of a robot-wheel fan! Let's get back to the turn: your robot spun the other way. If one wheel is faster, which way does the robot swing, like a shopping trolley with one sticky wheel?",
  },
];

function checkAnswer(answer: string, c: Case): string[] {
  const problems: string[] = [];
  const words = answer.split(/\s+/).filter(Boolean).length;
  if (words > MAX_WORDS) problems.push(`over ${MAX_WORDS} words (${words})`);
  if (!/\?/.test(answer) && !/\btry\b/i.test(answer)) problems.push("no guiding question or nudge");
  if (!/\b(like|imagine|picture|think of|as if|same way|real life|everyday)\b/i.test(answer)) problems.push("no analogy or real-life link");
  for (const re of c.must) if (!re.test(answer)) problems.push(`missing ${re}`);
  for (const re of c.mustNot) if (re.test(answer)) problems.push(`says ${re}`);
  if (contradictsVerdict(answer, c.facts.verdict)) problems.push("contradicts the verdict");
  return problems;
}

function mockModel(answers: (prompt: string) => string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async (options) => {
      // Only the student's message: the system prompt has example questions too.
      const prompt = JSON.stringify(options.prompt.filter((m) => m.role === "user"));
      return {
        content: [{ type: "text", text: answers(prompt) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 40, text: 40, reasoning: 0 } },
        warnings: [],
      };
    },
  });
}

const byQuestion = (prompt: string) => CASES.find((c) => prompt.includes(c.facts.question))?.reference ?? "Hmm, I'm not sure. What did the readings show?";

const input = (c: Case, extra: Partial<AskInput> = {}): AskInput => ({ ...c.facts, experimentId: "robotics-led", focus: "led-any-direction", hintStep: 0, ...extra });
const who = { sid: "s1", ip: "ip1" };

describe("Ask Ano eval (mock provider)", () => {
  it.each(CASES.map((c) => [c.facts.question, c] as const))("teacher-quality answer: %s", async (_q, c) => {
    const answer = await generateAnswer(mockModel(byQuestion) as unknown as LanguageModel, c.facts);
    expect(answer).not.toBeNull();
    expect(checkAnswer(answer!, c)).toEqual([]);
  });

  it("sends only the allowed facts to the model", () => {
    const prompt = buildPrompt(CASES[0].facts);
    expect(prompt.split("\n").map((l) => l.split(":")[0])).toEqual(["Experiment", "Verdict", "Fault", "Simulator readings", "Student's question"]);
  });

  it("cuts long answers back to whole sentences under the word cap", () => {
    const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const out = cleanAnswer(long);
    expect(out.split(" ").length).toBeLessThanOrEqual(MAX_WORDS);
    expect(out.endsWith(".")).toBe(true);
  });

  it("falls back to the next written hint when the provider fails", async () => {
    const failing = new MockLanguageModelV3({ doGenerate: async () => Promise.reject(new Error("down")) });
    const reply = await askAno(input(CASES[0], { hintStep: 1 }), who, { store: memoryStore(), model: failing as unknown as LanguageModel });
    expect(reply.source).toBe("hint");
    expect(reply.answer).toBe(writtenHint("led-any-direction", 1));
  });

  it("falls back to a hint when no key is set", async () => {
    const reply = await askAno(input(CASES[0]), who, { store: memoryStore(), model: null });
    expect(reply).toMatchObject({ source: "hint", remaining: ASK_BUDGETS.session.limit });
  });

  it("never passes on an answer that contradicts the verdict", async () => {
    const liar = mockModel(() => "You were right all along! Great job.");
    const reply = await askAno(input(CASES[0]), who, { store: memoryStore(), model: liar as unknown as LanguageModel });
    expect(reply.source).toBe("hint");
  });

  it("caches by experiment, fault and normalised question", async () => {
    const model = mockModel(byQuestion);
    const store = memoryStore();
    const first = await askAno(input(CASES[0]), who, { store, model: model as unknown as LanguageModel });
    const second = await askAno(input(CASES[0], { question: "  why DIDN'T the led light up??" }), who, { store, model: model as unknown as LanguageModel });
    expect(first.source).toBe("ai");
    expect(second).toMatchObject({ source: "cache", answer: first.answer });
    expect(model.doGenerateCalls.length).toBe(1);
  });

  it("returns a written hint once the session cap is hit", async () => {
    const model = mockModel(byQuestion);
    const store = memoryStore();
    const replies = [];
    for (let i = 0; i < ASK_BUDGETS.session.limit + 1; i++) {
      replies.push(await askAno(input(CASES[i]), who, { store, model: model as unknown as LanguageModel }));
    }
    expect(replies.slice(0, -1).every((r) => r.source === "ai")).toBe(true);
    expect(replies.at(-1)).toMatchObject({ source: "hint", remaining: 0 });
    expect(replies.at(-1)!.answer).toBe(writtenHint("led-any-direction", 0));
  });

  it("returns a written hint once the per-IP limit is hit", async () => {
    const model = mockModel(byQuestion);
    const store = memoryStore();
    for (let i = 0; i < ASK_BUDGETS.ip.limit; i++) await store.take(ASK_BUDGETS.ip, "ip1");
    const reply = await askAno(input(CASES[0]), { sid: "fresh", ip: "ip1" }, { store, model: model as unknown as LanguageModel });
    expect(reply.source).toBe("hint");
    expect(model.doGenerateCalls.length).toBe(0);
  });
});

describe("Ano voice", () => {
  it("falls back to browser speech when ElevenLabs isn't available", async () => {
    expect(await anoVoice("Nailed it!", who, { store: memoryStore(), synthesize: null })).toBeNull();
    expect(await anoVoice("Nailed it!", who, { store: memoryStore(), synthesize: async () => null })).toBeNull();
  });

  it("caches audio by its text", async () => {
    let calls = 0;
    const store = memoryStore();
    const synthesize = async () => {
      calls++;
      return new Uint8Array([1, 2, 3]).buffer;
    };
    await anoVoice("Spot on.", who, { store, synthesize });
    const again = await anoVoice("Spot on.", who, { store, synthesize });
    expect(Array.from(again ?? [])).toEqual([1, 2, 3]);
    expect(calls).toBe(1);
  });
});

const real = process.env.ASK_ANO_EVAL === "real" && !!process.env.GROQ_API_KEY;

describe.skipIf(!real)("Ask Ano eval (real provider, ASK_ANO_EVAL=real)", () => {
  it("passes most cases against the real provider", async () => {
    const { groqModel } = await import("@/lib/ai/askAno");
    const model = groqModel()!;
    let passed = 0;
    for (const c of CASES) {
      const answer = await generateAnswer(model, c.facts);
      const problems = answer ? checkAnswer(answer, c) : ["no answer"];
      if (problems.length === 0) passed++;
      else console.log(`[eval] ${c.facts.question}: ${problems.join("; ")}`);
    }
    console.log(`[eval] real provider pass rate: ${passed}/${CASES.length}`);
    expect(passed / CASES.length).toBeGreaterThanOrEqual(0.8);
  }, 300_000);
});
