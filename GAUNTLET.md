# GAUNTLET.md — unattended build-and-test loop

The owner is away and wants the redesign in `DESIGN.md` built and proven while they're gone. Work through the queue below in **rounds**. Every round must pass the **gates** before moving on. Keep going without waiting for "continue" (this overrides the earlier "pause after each phase" instruction for this session), and stop when a stop condition is met.

---

## 1. Budget (owner's limit: about 25% of their weekly usage)

You can't measure the owner's weekly limit exactly, so stay well inside it with these hard caps:

- **At most 6 rounds** in this session (one queue item per round).
- **At most 3 fix attempts per failing gate per round.** If it still fails, log it and move on.
- **Full gate run once per round.** While working, run only the targeted test or check for what you changed.
- **Real AI API calls: at most 30 in total** for the whole session (Ask Ano eval, voice). Everything else uses mocks.
- **Screenshots:** only changed pages at 3 widths per round; all pages only in the final round.
- Be economical: don't re-read large files you've already read unless they changed; don't regenerate files that already pass.
- If you see any usage or rate-limit warning, **stop immediately** and write the handoff.

---

## 2. Git rules

- **Don't** run git commit, push, merge, branch, stash, reset or checkout. The owner does all of that.
- Read-only git is fine (`git status`, `git diff`, `git branch --show-current`).
- Log suggested commits in `HANDOFF.md` grouped by branch type: `opinion/`, `suggestion/`, `remake/`, `adjustment/`, `ideas/`, `filing/`, `sustaining/`, `claude-align-md`.
- No co-author lines or mentions of Claude anywhere.

---

## 3. Setup (round 0, doesn't count toward the 6)

1. Read `CLAUDE.md`, `RESOURCES.md`, `DESIGN.md`, this file, and view `design/reference/landing.png`.
2. Add a short note to `CLAUDE.md` saying `DESIGN.md` replaces its earlier colour and dark-lab visual sections, and that `GAUNTLET.md` defines the unattended test loop.
3. Install test tools if missing (dev dependencies only): `@playwright/test` (Apache-2.0), `@axe-core/playwright` (MPL-2.0, dev only, never shipped), `license-checker` (BSD-3-Clause). Run `npx playwright install chromium`.
4. Create `playwright.config.ts` that builds and serves the **production** app (`npm run build && npm start` on port 3100) and writes screenshots to `tests/screenshots/round-N/`.
5. Create `GAUNTLET_LOG.md` and record the starting state (current branch, build status, test status).

---

## 4. The queue (one item per round, in order)

1. **Design foundation:** colour ramps, gradients, fonts and shadows from DESIGN.md in the Tailwind theme; all components from DESIGN.md section 5; a dev-only `/design-system` page showing every component and the font comparison (Archivo + up to two alternatives).
2. **Ano 3D:** build Ano per DESIGN.md section 6 with all expressions and animations, shown on `/design-system`.
3. **Landing page:** hero carousel (P1–P7, 3 slides) and all sections below the hero (DESIGN.md 7.1).
4. **Selection pages:** level select, lab select, experiment map, My beliefs (7.2–7.4, 7.6).
5. **Experiment page, all in 3D:** bright studio lab, the shared 3D apparatus kit, result card, success and ANOMALY moments, theory sheet (7.5, 7.7, sections 8 and 8.1: the whole process in one continuous 3D space). Light the LED and Mass in a sealed bag first and most polished, then convert every other experiment to 3D using the kit. If the budget runs out, log which experiments are still 2D.
6. **Transitions, VFX and final pass:** page transitions, Lusion-style animations and low-end smoothness (sections 9, 9.1, 9.2), loading and 404 pages, then the **full gauntlet on every page** and the handoff.

---

## 5. The gates (all must pass at the end of every round)

| Gate | Check | Pass when |
|---|---|---|
| G1 Types | `npx tsc --noEmit` | No errors |
| G2 Lint | `npm run lint` | No errors |
| G3 Unit | `npx vitest run` | All pass, including solver and engine tests |
| G4 Build | `npm run build` | Succeeds |
| G5 Flows | Playwright e2e on the production build: landing → level → lab → map → experiment; complete **Light the LED** and **Mass in a sealed bag** once with a correct prediction and once with a wrong one; open the theory sheet; use back navigation and breadcrumbs; carousel arrows, dots and swipe | All pass |
| G6 Console | During G5, collect browser console messages and failed requests | No errors, no hydration warnings, no 404s |
| G7 Hit areas | For every button and link on tested pages: clicking the visual centre works, and the clickable box matches the visible box within 2 px | All pass |
| G8 Accessibility | axe on every tested page; keyboard can reach and use every control; reduced-motion mode works | No serious or critical issues |
| G9 Visual | Screenshots at 1440, 1024 and 390 px wide. View them yourself next to the reference image and score each page with the rubric in DESIGN.md section 12 | Every score at least 4. Write the scores and one sentence of reasoning per page in the log |
| G10 Performance | Production build. Sample frame times in headed Chromium where a GPU is available and log draw calls from r3f-perf | Within the CLAUDE.md section 9 budget, and the Low tier stays smooth with 4× CPU throttling (DESIGN.md 9.2). **If it can't be measured reliably here, mark it "needs manual check" instead of guessing** |
| G11 AI and voice | Ask Ano eval with the mock provider every round; real providers only in rounds 5 and 6, within the 30-call cap; voice route falls back to browser speech when ElevenLabs is unavailable; rate limiter returns a written hint when the limit is hit | All pass; report the real-provider pass rate |
| G12 Licences | `npx license-checker --production --onlyAllow "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD;CC0-1.0;Zlib;OFL-1.1;Unlicense;BlueOak-1.0.0;Python-2.0;CC-BY-4.0"` | No disallowed licences in production dependencies (GSAP's standard licence is approved by the owner; note it) |

Be honest in every result. Never mark a gate as passed without running it.

---

## 6. Free API providers

- Use only keys already in `.env.local`. **Never** create accounts, never use more than one account per provider, never print or log keys.
- Each provider has **one dedicated task** (owner's rule). Current providers: Groq, Gemini, Cerebras, Mistral, OpenRouter, ElevenLabs. If the mapping isn't already in CLAUDE.md, propose one in the log, implement it, and note it for the owner. Example tasks: Ask Ano answers; turning typed hypotheses into tests; rephrasing hints for the level; eval grading; voice.
- AI never decides whether an experiment is correct. The simulator is the judge.
- If a key is missing, that task falls back (written hints or browser speech) and the key goes under "Keys needed" in the handoff.

---

## 7. Each round, step by step

1. Write a 3–6 bullet plan for the queue item in `GAUNTLET_LOG.md`.
2. Build it, following DESIGN.md and the rules in CLAUDE.md.
3. Run all gates (section 5).
4. Fix failures (max 3 attempts per gate). If something still fails, log exactly what and why, and continue.
5. Log the round: what changed, files touched, gate results table, rubric scores, screenshots paths, suggested commit message and branch.

---

## 8. Stop conditions

Stop and write the handoff when any of these happens:
- All 6 rounds are done.
- A usage or rate-limit warning appears.
- You're blocked on a decision only the owner can make (log the question, finish any other work you can, then stop).

---

## 9. Handoff (`HANDOFF.md`)

1. Summary in 5 lines.
2. What's done, per queue item.
3. Final gate results table and rubric scores per page.
4. Screenshot folder paths, including the font comparison.
5. **Suggested commits:** grouped by branch (type/name), each with a message and file list, in the order to commit them.
6. Open issues and anything marked "needs manual check".
7. Keys needed and the provider-to-task mapping.
8. Questions for the owner.