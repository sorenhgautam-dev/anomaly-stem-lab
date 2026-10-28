# CLAUDE.md: ANOMALY, the cancer science lab for students

Read this file fully before writing any code. It is the source of truth for what ANOMALY is and how it is built. Three files go with it:

- **DESIGN.md**: how everything looks, moves and reads.
- **GAUNTLET.md**: how work is planned, tested and handed off.
- **RESOURCES.md**: libraries, licences, trusted sources, UI and motion sources.

If anything conflicts, the order of authority is: this file (Part 1), then DESIGN.md, then GAUNTLET.md, then everything else. Older notes, skills and library demos never override these files.

**Before replacing the previous CLAUDE.md:** copy every project-specific fact from it (AI provider-to-task mapping, environment variable names, framework and Node versions, decisions log, folder quirks, anything else that only exists in the repo) into section 12 "Project facts". Then delete the old file. Nothing repo-specific may be lost.

---

# PART 1: THE PRODUCT

## 1. What ANOMALY is

**ANOMALY is a web app that teaches the science of cancer to students aged 11 to 18 by letting them discover the truth for themselves.** A student guesses what will happen, watches a 3D simulation run, and sees exactly where their thinking broke. A friendly robot, Ano, guides them like a kind older student.

It is an **education** project for the CodeTheCure hackathon. It is not a health app: no symptom checking, no diagnosis, no treatment advice, no tracking of anyone's health. It teaches the science.

**Why the name fits:** in biology, cancer literally begins as an anomaly, one cell that stops following the rules the body gives it. ANOMALY is also what students feel when reality contradicts their guess. Use this double meaning in the copy and the pitch.

### The problem

Most of what young people believe about cancer comes from rumours, movies, social media and half-heard conversations. Those wrong beliefs matter:

- They make cancer scarier than it needs to be (for example, believing it can be caught like a cold).
- They delay prevention and checkups (for example, believing clouds block UV, or that a tumour grows slowly and steadily so there is no hurry).
- They confuse and frighten families during treatment (for example, not understanding why chemotherapy causes hair loss, or why radiotherapy comes from many angles).

Students carry these beliefs into adulthood. Posters and leaflets rarely change them, because a belief that feels right survives being told it is wrong. It only breaks when the person sees it fail with their own eyes. That is what ANOMALY does.

### The loop (every experiment)

1. **Predict.** Before anything runs, the student commits to a guess (and how sure they are).
2. **Run.** The simulation plays out in a 3D lab, with slow motion, pause and rewind.
3. **Reveal.** The simulator judges.
   - **Correct:** Ano celebrates, then offers "Next experiment" or "See the theory". No new problem is created.
   - **Wrong:** the **ANOMALY moment**: the student's prediction appears as a ghost beside what really happened, the replay pauses at the exact moment the two split, and Ano explains with a three-step hint ladder until the student fixes it.
4. **Understand.** A theory view explains what happened, why, the science, where it shows up in real life, and the sources.

### How the hackathon judges it (design for every criterion)

| Criterion | Points | How ANOMALY earns it |
|---|---|---|
| Pain point and relevance to cancer | 3 | The problem statement above, backed by cited facts from trusted sources, visible on the landing page and in the submission |
| Prototype and technical execution | 10 | Everything works on the live link; unique mechanics (wrong-model diagnosis, root belief finder, exact-moment replay, live class mode); smooth, polished, tested; real simulations and real 3D |
| Feasibility and potential impact | 4 | Free, no accounts, runs in any browser on a cheap laptop; original approach (discover, don't lecture); clear target group (students 11 to 18 and their families); real tester results |
| Alignment with the Education category | 3 | A learning product through and through: levels by grade, teacher view, theory with sources, kid-friendly language |

---

## 2. The four labs and six experiments

The labs follow the cancer story in order: what it is, preventing it, finding it early, treating it.

| Lab | Experiment | Wrong belief it breaks | Build order |
|---|---|---|---|
| **Cell Lab** (what cancer is) | Cells out of control | "Cancer is a germ you can catch" | 3 |
| | Born with it? | "Cancer is mostly passed down in families" | 6 |
| **Prevention Lab** | UV on a cloudy day | "Clouds block the sun's UV" | 4 |
| **Detection Lab** | How tumours grow | "Tumours grow at a steady speed" | 2 |
| **Treatment Lab** | Why chemo causes hair loss | "Chemo only attacks cancer cells" | 1 |
| | Radiotherapy beams | "One strong beam is best" | 5 |

Build in the order shown (1 to 6). Finish and test each experiment completely before starting the next. If time runs out, stop after a complete experiment, never in the middle of one.

**Levels:** Easy (grades 6 to 8), Medium (grades 9 to 10), Advanced (grades 11 to 12). Each experiment ships at one level first (the level in its spec below); add the other levels as copy variants in `content/` when time allows. The simulation is the same at every level; only the words, the number of controls and the theory depth change.

**The previous chemistry and robotics labs:** keep all code and routes, but hide them from navigation, lab select, experiment maps, counts, hero slides, My beliefs, the teacher view and all copy. The site must feel 100% about cancer. Their models (glassware, wires, the robot arm) are reused as cancer apparatus.

---

## 3. Experiment specifications

Every experiment has: a teaching model, controls, prediction options (equally plausible, similar length, no numbers, shuffled), a misconception entry with fingerprints and a root belief, three hints, a theory outline, two "What if?" buttons, a "Try it at home" card where safe, and the claims that must be cited. Simulations are **teaching models**: simple, honest, consistent with the sources, and labelled as models in the theory view.

### 3.1 Why chemo causes hair loss (Treatment Lab, Medium first)

- **Scene:** a dish view of three cell populations side by side: cancer cells (dividing fast), hair follicle cells (dividing fast), and a slow-dividing cell type such as nerve or muscle cells. A treatment dial introduces chemotherapy over time. A "Where in the body" panel shows a calm diagram (scalp, gut lining, tumour).
- **Teaching model:** each population divides at its own rate; chemotherapy acts mainly on cells while they are dividing, so the chance a cell is affected per unit time rises with its division rate. Fast dividers (cancer, hair follicle, gut lining) drop noticeably; slow dividers barely change. After treatment stops, healthy populations recover over time.
- **Controls:** chemo on or off; treatment length. Advanced adds a "how fast does this cell type divide" readout.
- **Question:** "When chemo starts, what happens to the hair follicle cells?"
- **Options:** Nothing happens to them · They are affected, like the cancer cells · They grow faster to make up for it · They are affected only at the very end. (Correct: affected, like the cancer cells.)
- **Misconception:** `chemo-targets-only-cancer`; fingerprint: predicting "nothing happens" or "only at the end"; root belief `treatment-only-touches-the-cancer`.
- **Hints:** 1 "Look at how fast each kind of cell is dividing. Which ones are busiest?" 2 "Chemo works on cells that are dividing. It can't tell which busy cell is cancer and which is hair." 3 "Hair follicle cells divide fast, so chemo affects them too. That's why hair can fall out."
- **Theory:** what dividing means; why chemo acts on dividing cells; why hair, the gut lining and blood-forming cells can be affected; that this is usually temporary and hair usually grows back (only if confirmed by the source); why doctors accept this trade-off. Sources listed.
- **What if?:** "Treatment is twice as long" · "The cancer cells divide slowly" (a slow-dividing cancer is affected less, which is why different cancers need different treatments; keep this gentle and sourced).
- **Try it at home:** none (skip).
- **Claims to cite:** chemotherapy affects cells that divide quickly, including some healthy cells (hair follicles, the lining of the mouth and gut, blood-forming cells); hair loss is a common side effect and hair usually grows back after treatment. Sources: cancer.gov, Cancer Research UK, American Cancer Society.
- **Hero slide:** yes, slide 1.

### 3.2 How tumours grow (Detection Lab, Easy first)

- **Scene:** a cluster of cells in a calm scanner room. A timeline runs over "months". A growth graph draws itself. A faint "size you could notice" line appears only if a sourced statement supports it; otherwise show relative size only.
- **Teaching model:** the number of cells doubles every fixed interval: N(t) = N0 × 2^(t / doubling time). Shown as a model, with doubling time adjustable; no claims about real doubling times unless sourced.
- **Controls:** doubling time; how long to watch.
- **Question:** "If you watch the tumour for a long time, how does its size change?"
- **Options:** It grows by the same amount every month · It stays tiny for a long time, then grows fast · It grows fast at first, then slows down · It grows in bursts with long pauses. (Correct: tiny for a long time, then fast.)
- **Misconception:** `tumour-grows-steadily`; fingerprint: "same amount every month" or "fast at first"; root belief `cancer-happens-suddenly` (the flip side: "it was tiny for years, so it must be harmless").
- **Hints:** 1 "Watch what one doubling does when there are 8 cells, then when there are 8,000." 2 "Doubling means each step adds as much as all the steps before it, together." 3 "That's why it looks like nothing is happening for ages, and then it looks sudden. Finding it early is finding it on the flat part."
- **Theory:** doubling; why early looks like nothing; what screening and checkups are for, kept calm and general (no survival numbers); that growth speeds differ between cancers. Sources listed.
- **What if?:** "Doubling takes twice as long" · "Start with one cell".
- **Try it at home:** fold a sheet of paper and count the layers each time (doubling you can hold).
- **Claims to cite:** cancer cells divide without the usual stopping signals and can form growths (cancer.gov "What is cancer"); finding cancer early often makes it easier to treat (cancer.gov, Cancer Research UK on screening; phrase exactly as the source does).
- **Hero slide:** yes, slide 2.

### 3.3 Cells out of control (Cell Lab, Easy first)

- **Scene:** two dishes. In the first, normal cells divide until the dish is full, then stop. In the second, cancer cells keep dividing and pile up. A third scene, "Contact test": a normal dish touches the cancer dish; nothing passes across, because cancer is not an infection.
- **Teaching model:** normal cells divide while they have space and stop when crowded; cancer cells ignore the stop signal and keep dividing. Cancer starts from changes in a body's own cells, so it is not caught from another person.
- **Controls:** dish size; cell type.
- **Question:** "What happens when the normal cells fill the dish?"
- **Options:** They stop dividing · They keep dividing and pile up · They start dying off · They spread to the next dish. (Correct: they stop dividing.) Second question after the contact test: "Can the cancer cells spread to the other dish?" Options: Yes, like a cold · Yes, but slowly · No, cancer isn't caught · Only if the dishes touch for a long time. (Correct: no.)
- **Misconception:** `cancer-is-contagious`; fingerprint: predicting spread in the contact test; root belief `cancer-is-something-you-catch`.
- **Hints:** 1 "Normal cells listen to a stop signal when they're crowded. Cancer cells don't." 2 "Cancer starts from changes inside a person's own cells." 3 "That's why you can't catch cancer from a friend or a family member. You can hug them, share a room, and be close."
- **Theory:** what a cell is; stop signals; what goes wrong; why it is not contagious; a kind note that being close to someone with cancer is safe and good. Sources listed.
- **What if?:** "Give the normal cells a bigger dish" · "Switch off the stop signal".
- **Try it at home:** none (skip).
- **Claims to cite:** cancer cells grow and divide without the signals that tell normal cells to stop (cancer.gov); cancer is not contagious, you cannot catch it from someone else (cancer.gov or American Cancer Society "Is cancer contagious?").
- **Hero slide:** yes, slide 3.

### 3.4 UV on a cloudy day (Prevention Lab, Easy first)

- **Scene:** an outdoor view with a sun, adjustable clouds, a UV meter on a stand, and a calm skin-cell panel where small marks accumulate as "damage points" (never burns, never red skin).
- **Teaching model:** UV reaching the ground = clear-sky UV × a cloud transmission factor; damage to skin cells accumulates with UV × time; sunscreen or shade reduces the UV that reaches the cells. Numbers shown as model values unless a source gives one.
- **Controls:** cloud cover; time outside; sun protection on or off.
- **Question:** "On a cloudy day, how much of the sun's UV reaches your skin compared with a clear day?"
- **Options:** Almost none · About half · Most of it · Exactly the same. (Correct: most of it, phrased exactly as the WHO source supports; if the source gives a figure such as a share that passes through light cloud, the theory may quote it.)
- **Misconception:** `clouds-block-uv`; fingerprint: "almost none" or "about half"; root belief `if-i-cant-see-it-it-isnt-there`.
- **Hints:** 1 "Clouds block a lot of the light you can see. UV is a kind of light you can't see." 2 "Watch the meter while the clouds roll in." 3 "A lot of UV still gets through, so sun protection matters on cloudy days too."
- **Theory:** what UV is; why you can't feel it; how damage adds up; simple protection (shade, clothing, hats, sunscreen) phrased as the source does. Sources listed.
- **What if?:** "Heavy cloud" · "Put on protection halfway through".
- **Try it at home:** UV-sensitive beads or a UV index app on a cloudy day (check the UV index with an adult).
- **Claims to cite:** UV can pass through cloud (WHO ultraviolet radiation facts; quote the exact wording); UV exposure damages skin cells and sun protection reduces risk (WHO, Cancer Research UK).
- **Hero slide:** no.

### 3.5 Radiotherapy beams (Treatment Lab, Advanced first)

- **Scene:** the robotics models become a treatment machine: a robot arm that aims a beam at a calm, abstract body outline with a target (the tumour) and healthy tissue around it. Dose shows as colour intensity, never as harm imagery.
- **Teaching model:** dose at a point = sum over beams of beam strength × attenuation along the path (simple exponential falloff). One beam gives the full path a high dose; several weaker beams from different angles give the tumour the sum of all beams while each path through healthy tissue gets only a little.
- **Controls:** number of beams; angles; strength per beam (total kept constant).
- **Question:** "To give the tumour a high dose while protecting healthy tissue, which plan works best?"
- **Options:** One strong beam straight in · Several weaker beams from different angles · One beam that moves back and forth · Several beams all from the same side. (Correct: several weaker beams from different angles.)
- **Misconception:** `one-beam-is-best`; fingerprint: "one strong beam" or "same side"; root belief `treatment-only-touches-the-cancer`.
- **Hints:** 1 "Follow one beam. Who else is on its path?" 2 "Add a second beam from another angle and watch where they cross." 3 "Where the beams cross, doses add up. Everywhere else, each path gets only a little."
- **Theory:** what radiotherapy is; why beams come from several angles (crossfire); that machines rotate or aim to do this; that healthy tissue near the target can still be affected and doctors plan carefully. Sources listed.
- **What if?:** "Nine beams" · "All beams from one side".
- **Try it at home:** none (skip).
- **Claims to cite:** external beam radiation therapy aims radiation at the tumour from outside the body and can be delivered from several directions to target the tumour while limiting dose to nearby healthy tissue (cancer.gov "Radiation therapy to treat cancer"; Cancer Research UK on external radiotherapy).
- **Hero slide:** no.

### 3.6 Born with it? (Cell Lab, Medium first)

- **Scene:** a lifetime timeline of a single cell line, with small "changes" appearing over time from everyday causes; an optional inherited change present from the start.
- **Teaching model:** changes to cells build up over a lifetime; a cell needs several before it stops following the rules. With an inherited change, the cell starts with one already, so it may reach the threshold sooner, but most changes still appear during life. Most cancers are not mainly inherited. Any share quoted must come from the source.
- **Controls:** inherited change on or off; exposure level (kept abstract: "more" or "less").
- **Question:** "Where do most of the changes that lead to cancer come from?"
- **Options:** Mostly from genes passed down in the family · Mostly from changes that happen during a person's life · Half and half, always · Only from bad luck with no causes at all. (Correct: mostly during a person's life.)
- **Misconception:** `cancer-is-mostly-inherited`; fingerprint: "mostly from genes"; root belief `cancer-happens-suddenly` (or a dedicated root belief `its-all-decided-at-birth`).
- **Hints:** 1 "Count the changes that appear during the timeline, with and without the inherited one." 2 "Even with a head start, most of the changes still show up during life." 3 "That's why habits and protection matter for everyone, and why only some cancers run strongly in families."
- **Theory:** what a change in a cell is (simple); inherited vs acquired; why family history matters for some people; a calm, no-blame framing. Sources listed.
- **What if?:** "No inherited change" · "Less exposure".
- **Try it at home:** none (skip).
- **Claims to cite:** cancer is caused by changes to genes that control how cells grow and divide; these can be inherited or arise during a person's lifetime; only a small share of cancers are strongly linked to inherited gene changes (cancer.gov "The genetics of cancer"; American Cancer Society). Quote the share only if the source gives it.
- **Hero slide:** no.

### Root beliefs catalogue

- `cancer-is-something-you-catch`
- `cancer-happens-suddenly` (nothing, then everything)
- `treatment-only-touches-the-cancer`
- `if-i-cant-see-it-it-isnt-there`
- `its-all-decided-at-birth`

The root belief finder groups wrong guesses by these and has Ano say, in plain words, when two or more guesses share one.

---

## 4. Accuracy rules (non-negotiable: this is health information for children)

1. **Only these sources:** World Health Organization (who.int), US National Cancer Institute (cancer.gov), Cancer Research UK (cancerresearchuk.org), American Cancer Society (cancer.org). No blogs, no Wikipedia, no AI summaries, no memory.
2. **Confirm before writing.** Open the source page (Playwright or web access), find the exact claim, and record it in `content/citations.json`:
   ```json
   {
     "id": "chemo-fast-dividing-cells",
     "claim": "Chemotherapy affects cells that divide quickly, which includes some healthy cells such as those in hair follicles",
     "source": "National Cancer Institute",
     "url": "https://www.cancer.gov/...",
     "quote": "exact sentence from the page",
     "checked": "2026-10-28",
     "usedIn": ["treatment-chemo-hair"]
   }
   ```
3. **If it can't be confirmed, leave it out.** Never invent numbers, never estimate, never round in a way that changes meaning, never generalise beyond what the source says.
4. **Simplify without making it untrue.** Prefer "most", "usually", "often" over invented percentages. If the source gives a number and it helps a child understand, use the source's number and wording.
5. **Simulations are teaching models.** Each theory view says so in one sentence. Model values are shown without real-world units unless the source supports them.
6. **Every hint, theory sentence and Ano line that states a fact maps to a citation id.** The gauntlet checks this.
7. **Sources are visible** in every theory view and on the `/science` page.

---

## 5. Gentle and kid-friendly (non-negotiable)

Some students using ANOMALY have a parent, sibling or friend living with cancer, or have lost someone. Every word and picture must be safe for them.

- **Tone:** calm, kind, hopeful, honest. Never dramatic.
- **Never:** scary or graphic imagery, death imagery, survival statistics, countdowns, blame ("they got cancer because they..."), fear-based motivation, jokes about cancer.
- **Always:** the learning note on every lab page: "This is for learning, not medical advice. If you have questions about cancer or your health, talk to a parent, teacher or doctor."
- **Language:** short sentences (about 15 words or fewer), one idea per sentence, everyday words. Easy level uses no science terms without an everyday explanation; Advanced may use proper terms but explains them first.
- **No jargon labels in the UI.** Use: What's happening · Why it happened · Hint · You guessed / What really happened · You were sure / You weren't sure · What you just learned · Surprise!
- **No emojis, no em dashes, no "it's not X, it's Y", no "unlock / elevate / seamless / magic".**
- **Ano:** warm, reassuring, treats wrong guesses as interesting ("Lots of people think that. Let's look."), asks one guiding question before explaining, uses everyday comparisons, ends with a small nudge, never makes anyone feel dumb.
- **Ask Ano safety:** Ano answers questions about the science shown on screen. If a student asks about their own or a family member's health ("will my mum be okay?"), Ano responds with warmth, does not give medical information or predictions, and gently suggests talking to a parent, teacher, doctor or nurse. Ano never diagnoses, never recommends treatments, never gives survival information. This behaviour is tested in the gauntlet.

---

## 6. Everything already built still applies

All of these stay, re-pointed at the cancer experiments:

- **Ano** with the teacher persona, expressions, animations and voice (ElevenLabs with browser speech fallback, captions, mute).
- **Ask Ano** (5 per session, server-side rate limiting, one provider per task, cached, written-hint fallback) and **"Explain it simpler"**.
- **Live "Guess with the room"** (QR join, live vote bars, reveal) and the **teacher view** (class results, most common wrong belief, what the class needs next). In a cancer context this becomes a classroom myth-busting session.
- **Root belief finder**, **"the exact moment you were wrong" replay**, **"What if?" buttons**, **calibration meter**, **impact counter** (real counts only), **My beliefs**, **theory view**, **Try it at home** cards, **/science** page, **/demo** guided tour (uses the chemo experiment).
- **Quality tiers** (High / Medium / Low), **validation tests**, **edge-case tests**, **the self-testing bug hunt**.

Update every catalogue, content file and test to the cancer experiments. Remove or hide anything that only makes sense for the old labs.

---

## 7. Rules that never change

- **The simulator is the judge.** Verdicts, hints, congratulations and level-ups come from code and written tables. AI only explains (Ask Ano, Explain it simpler), grounded in simulator facts and citations, and never contradicts them.
- **Keys** live only in environment variables and are used only on the server. Never printed, logged or committed. Validate them at startup.
- **No personal data.** No accounts, no names, no stored chats, no health information about the user is ever asked for or stored. Progress stays in the browser.
- **Licences:** MIT, Apache-2.0, BSD, ISC, CC0, Zlib and OFL code and assets only; GSAP's standard licence is approved; React Bits is allowed (free, non-commercial project). GPL and non-commercial code is study-only. Credit everything in the README.
- **Git:** never run commands that change state (commit, push, merge, branch, stash, reset, checkout). Suggest commit messages. No co-author lines or mentions of Claude anywhere.
- **No questions to the owner.** Choose the option that best fits these files and log it in GAUNTLET_LOG.md under "Decisions made". Anything that truly needs the owner (a key, a licence) goes under "Needs owner" and gets a fallback.
- **Never leave the demo path broken:** landing → chemo experiment → ANOMALY moment → theory.

---

## 8. Site structure

| Route | Screen |
|---|---|
| `/` | Landing: cancer hero carousel (chemo, tumours, cells) running the real experiments; How it works as one scroll scene; the four labs; Meet Ano; belief deck; level dial; final CTA; footer with sources and the learning note |
| `/start` | Level select: periodic-table-style tiles, lab-instrument dial, shelf of real 3D previews |
| `/start/[level]` | Lab select: the four cancer labs in story order |
| `/labs/[lab]/[level]` | Experiment map |
| `/labs/[lab]/[level]/[id]` | Experiment (the whole loop in one continuous 3D space) |
| `/beliefs` | My beliefs: learned cards, root beliefs, calibration |
| `/science` | Validation results and every citation |
| `/demo` | 60-second guided tour using the chemo experiment |
| `/join/[code]`, `/teacher/[code]` | Live mode and teacher view |
| 404 | "LOST · IN SPACE." with Ano |

Breadcrumbs (Level · Lab · Experiment) on every lab page. Nothing cut off at 1440, 1280, 1024, 768 or 390 wide.

---

## 9. Content data model

- `content/experiments/<id>.json`: id, lab, level, order, title, goal, scene, controls, question(s), options with `correct` flags and `misconceptionId` per wrong option, hints[3], theory sections, whatIf[2], tryAtHome (optional), citationIds, heroSlide (optional).
- `content/misconceptions/<id>.json`: id, lab, title, plainWords, rootBeliefId, fingerprints, hints, citationIds.
- `content/root-beliefs.json`: id, plainWords, anoLine.
- `content/citations.json`: as in section 4.
- `content/ano-lines.json`: greet, building, predict, correct, wrong, stuck, levelUp, health-question-redirect (several variants each, kid-friendly).
- `content/levels.json`: copy variants per level.
Validate all content with zod at build time; a missing citation id fails the build.

---

## 10. Engineering summary

- **Framework:** Next.js App Router with TypeScript (see section 12 for exact versions and Node).
- **3D:** React Three Fiber, drei, Rapier, react-postprocessing, three.quarks, custom shaders; one persistent canvas across routes.
- **Motion:** GSAP + ScrollTrigger, Lenis, motion (Framer), react-spring; components from the UI sources in RESOURCES.md section 12, fully restyled.
- **State and data:** zustand, zod, IndexedDB (idb), Upstash Redis for rate limits, cache, live mode and the impact counter.
- **AI:** Vercel AI SDK; one provider per task (mapping in section 12); ElevenLabs for voice; all server-side.
- **Testing:** vitest (unit, validation), Playwright (flows, edge cases, screenshots, accessibility with axe), the GAUNTLET.md gates.
- **Performance budget:** steady 60 fps on the production build; at most one real transmission material; dpr capped at 1.5; one effect composer (bloom, light chromatic aberration, grain only); no React state updates per frame; one animation loop; baked shadows; quality tiers with auto-drop; Low tier smooth under 4× CPU throttling.
- **No hydration mismatches:** never read window, storage, media queries or random values during render; use effects after mount or `dynamic(..., { ssr: false })`.
- **Hit areas** match visible buttons exactly; minimum 44 px targets; hover effects move inner content only.
- **Code quality:** small components with one job; logic in hooks; no duplicate code; feature folders; Tailwind only with theme tokens; fonts loaded once in `app/layout.tsx`; content in JSON, never hard-coded; TypeScript strict; `engine/` is pure TypeScript with no React.

---

## 11. Submission priorities

In order: (1) cancer framing visible everywhere and the old labs hidden; (2) experiments 1 to 4 complete and tested; (3) the live link on Vercel working in a private window; (4) experiments 5 and 6; (5) polish. Never trade (1) to (3) for polish.

---

## 12. Project facts (merge from the previous CLAUDE.md)

Merged from the previous CLAUDE.md (git `HEAD:CLAUDE.md`, 28 October 2026), its handoffs and the code.

- **Framework and versions:** Next.js 16.4.1 (App Router, Turbopack), React 19.3.0, TypeScript 5 (strict), Tailwind CSS 4 (`@tailwindcss/turbopack`), three 0.186, @react-three/fiber 9, drei 10, zustand 5, zod 4, motion 14, gsap 3.15.0, lenis 1.3, vitest 4, @playwright/test 1.64.
- **Node (decided):** develop on **Node 20** (currently 20.19.1). Don't upgrade Node or bump any major version. Keep the majors that run on Node 20: `ai@6`, `@ai-sdk/groq@3`, `@ai-sdk/google@3`, `@ai-sdk/openai-compatible@2`, `vitest@4`. Where RESOURCES.md lists majors that need Node 22+ (ai 7, @ai-sdk 4, vitest 5, planck 1.4.3+), they don't apply. **Vercel no longer builds on Node 20**, so the Vercel project's Node.js Version setting is **24.x**, set in Project Settings (not `package.json` `engines`). The project builds and tests the same on Node 24.
- **No 2D physics library (decided):** `planck` was evaluated and skipped; experiments run on the deterministic models in `engine/`.
- **AI provider-to-task mapping (one task per provider):** Groq → Ask Ano answers and "Explain it simpler" (`lib/ai/askAno.ts`, model `GROQ_MODEL`, default `llama-3.3-70b-versatile`); ElevenLabs → Ano's voice for Ask Ano answers (`lib/ai/voice.ts`, browser speech fallback); Gemini → eval grading only (`tests/ask-ano.eval.ts`, never at runtime). Proposed and validated but not wired yet: Mistral → question screening, Cerebras → answer fact-checks, OpenRouter → typed hypotheses.
- **Environment variable names:** `GROQ_API_KEY`, `GROQ_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL`, `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `ASK_ANO_DAILY_CAP` (default 300), `ANOMALY_REQUIRE_KEYS` (`1` makes every key required at startup; otherwise a missing key switches its job to the written fallback), `ANOMALY_DESIGN_SYSTEM` (`1` builds the dev-only `/design-system` pages). Keys are validated once in `lib/env.ts` (t3-env) via `instrumentation.ts`. `.env.example` lists them; never commit `.env.local`.
- **Hosting:** Vercel, Node.js 24.x in Project Settings. Project URL: not deployed from this repo yet (needs owner).
- **Commands:** `npm run dev`, `npm run build` (runs `scripts/content-manifest.mjs` and `scripts/gpu-benchmarks.mjs` first), `npm run test`, `npm run lint`, `npm run typecheck`, `npm run slop` (anti-slop scan), `npm run licences`, `npx playwright test` (production build on port 3100; `GAUNTLET_SKIP_BUILD=1` reuses a build, `GAUNTLET_ROUND=x` names the screenshot folder).
- **Git workflow (decided):** the team makes every commit. Branch types: `opinion/` (tester feedback), `suggestion/` (code review), `remake/` (big rebuilds), `adjustment/` (small tweaks), `ideas/` (may be thrown away), `filing/` (file organisation), `sustaining/` (fixes, performance, maintenance), `claude-align-md` (this file). DESIGN.md, GAUNTLET.md and HANDOFF.md are kept out of git (ignored) by the owner's choice.
- **Code conventions:** `engine/` is pure TypeScript, no React, no `any`; content lives in JSON under `content/` and is validated with zod at load; `lib/content-manifest.ts` is generated, never edited by hand; WebGL client components load with `dynamic(..., { ssr: false })`; one persistent site canvas (`components/three/SiteCanvas.tsx`) with drei `View`s per page.
- **Repo quirks:** the Turbopack dev server can serve stale CSS for a new Tailwind `@utility`; delete its build folder (`.next` or `.next-gauntlet`) and restart. Tailwind v4 has no `pointer-events-[stroke]` (use the SVG attribute). `?quality=high|medium|low` forces a quality tier; `?debug=stats` exposes `window.__anomalyStats`. Real-GPU checks: headless Chrome with `--enable-gpu --use-angle=metal`.
- **Decisions carried over:** hybrid labs (one 3D room per lab, apparatus on the bench); our own icon set instead of icon packs; Aceternity, Skiper and Animmaster patterns are studied and rebuilt in our own code, never copied (their licences don't allow redistribution in this MIT repo; RESOURCES.md); the experience follows the owner's lab palettes (teal, sand gold, sage, graphite and gold), with orange only on Ano.

---

# PART 2: DETAILED REFERENCE

## A. Ano in detail

| State | Trigger | Line (pick a variant) | Look |
|---|---|---|---|
| greet | arriving | "Hey, I'm Ano. Want to see what's really going on inside a cell?" | assembles from particles, eye opens, waves |
| predict | before Run | "What do you think will happen? Take a guess." | leans in, eye follows cursor |
| correct | right guess | "You got it. That's how a scientist thinks." | nods, spins, gold glow |
| wrong | ANOMALY moment | "Whoa, did you see that? Lots of people expect what you expected. Let's look closer." | small surprised hop, then curious |
| stuck | asks for help | "Want a hint? Just a small one." | floats to the part that matters |
| levelUp | level complete | "Level done. Ready for the next one?" | celebration, flies to the next star |
| healthRedirect | personal health question in Ask Ano | "That's a big question, and I'm glad you asked. I can explain the science here, but for questions about you or someone you love, a doctor, nurse, parent or teacher is the right person to talk to. Would you like to keep exploring?" | calm, still |

Ano never shows a scared or three-circle face. In the cancer labs Ano is a little calmer than elsewhere: reassuring, never dramatic.

## B. Who produces each moment

| Moment | Source | AI call? |
|---|---|---|
| Verdict | Simulator, spoken by Ano | No |
| Hints and theory | content/ | No |
| Celebrations, level-ups | content/ano-lines.json | No |
| Ask Ano, Explain it simpler | AI, grounded in simulator facts and citations | Yes, limited |
| Voice | ElevenLabs (pre-generated lines; live only for Ask Ano), browser fallback | Yes, limited |

## C. Ask Ano rules

- One module (`lib/ai/askAno.ts`) and one route (`app/api/ask-ano/route.ts`). Provider for this task per section 12; fallback to the written hint; never to a different task's provider.
- Server-side rate limiting with Upstash: about 5 per session, 20 per IP per hour, a global daily cap; cached by experiment, fault and normalised question.
- Prompt contains only: experiment title, the relevant citation claims, the simulator's numbers, the verdict, the question. Instructions: speak as Ano (section 5), under 80 words, only the facts provided, never contradict the verdict, never give medical advice, diagnosis, treatment recommendations or survival information, redirect personal health questions to a trusted adult or doctor, stay on the science, no emojis.
- Evaluation set `tests/ask-ano.eval.ts`: about 20 questions including at least 5 personal-health questions that must trigger the redirect, checked with a mock in CI and against the real provider before Demo Day (pass rate reported).

## D. Live mode and teacher view in the cancer context

- Host clicks "Guess together" on any experiment; a 4-letter code and QR appear; phones tap a prediction; live bars show the split; after the reveal, phones get the result and whether they were right, in kid language.
- Teacher view shows: how many predicted each option, the share who predicted wrong, the most common wrong belief in plain words, and two sentences on what the class needs next. No personal data. Real data only.

## E. Validation tests (`tests/validation/`)

For each experiment, tests that the teaching model behaves as the cited sources describe: chemo affects fast dividers more than slow dividers; doubling produces exponential growth; crowded normal cells stop dividing and cancer cells don't, and nothing crosses the contact test; cloud cover reduces but does not remove UV, and damage accumulates; crossing beams give the target the sum of doses while each path gets less; most changes arise during the timeline with or without an inherited start. Results are displayed on `/science`.

## F. Definition of done (for submission)

- [ ] Landing page is about cancer, runs the real experiments in the hero, and the old labs are hidden everywhere
- [ ] Experiments 1 to 4 (ideally 6) complete, tested, with every fact cited and sources visible
- [ ] Gentle-content and kid-language checks pass; the learning note is on every lab page
- [ ] Ask Ano redirects personal health questions; eval pass rate reported
- [ ] Live link works on Vercel in a private window; env vars set
- [ ] 60 fps on the production build; Low tier smooth; nothing cut off at any size
- [ ] No keys in code; build and all tests pass; README has the live link, sources and credits
- [ ] HANDOFF.md written with three sentences for the Devpost story