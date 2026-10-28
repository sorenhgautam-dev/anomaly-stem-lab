# GAUNTLET_LOG.md

Unattended build-and-test loop (GAUNTLET.md). Newest round at the bottom.

---

## Round 0: setup (16 October 2026)

### Starting state (before any change)
| Item | State |
|---|---|
| Branch | `main` (commit `11c5016`) |
| Working tree | Clean except `RESOURCES.md` (owner's uncommitted `detect-gpu` row; left as is) |
| G1 `npx tsc --noEmit` | Pass |
| G2 `npm run lint` | Pass |
| G3 `npx vitest run` | **Fail: 487 passed, 11 failed** (every chemistry theory page lacked `sources`) |
| G4 `npm run build` | Not run before setup; passes after setup (below) |
| `.env.local` | **Missing.** No AI keys, so every AI job runs on its written fallback this session |
| `design/reference/landing.png` | **Missing** (not in the repo or anywhere on disk) |

### Setup done
1. Read CLAUDE.md, RESOURCES.md, DESIGN.md and GAUNTLET.md in full.
2. Added the DESIGN.md / GAUNTLET.md note at the top of CLAUDE.md.
3. Installed dev tools: `@playwright/test@1.64.1` (Apache-2.0), `@axe-core/playwright@4.14.0` (MPL-2.0, dev only), `license-checker@25.0.1` (BSD-3-Clause); `npx playwright install chromium`.
4. `playwright.config.ts`: builds and serves the production app on port 3100 and writes screenshots to `tests/screenshots/round-N/`.
5. This log.

Also done in setup so the gates can run honestly from round 1:
- **G3 fixed:** added `sources` to the 11 chemistry theory pages, citing OpenStax Chemistry 2e sections. Every URL was fetched: all 15 return 200, and a made-up section returns 404. Now 528 passed, 1 skipped (the real-provider eval).
- **G11 made runnable:** rebuilt Ask Ano as one job with one provider (see "AI jobs" below), added the voice route, server-side rate limits and `tests/ask-ano.eval.ts` (20 questions, mock provider).
- **G12 baseline:** see the licence decision below.
- Runtime packages for the redesign (all checked): `motion@14.3.0` (MIT), `@radix-ui/react-dialog@1.3.1` (MIT), `detect-gpu@5.0.70` (MIT), `class-variance-authority@0.7.1` (Apache-2.0), `@t3-oss/env-nextjs@0.13.11` (MIT), `@upstash/ratelimit@2.2.0` (MIT), `@upstash/redis@1.39.0` (MIT).

### Gate results after setup
| Gate | Result |
|---|---|
| G1 Types | Pass |
| G2 Lint | Pass |
| G3 Unit | Pass (528 passed, 1 skipped) |
| G4 Build | Pass |
| G11 AI (mock) | Pass (eval in G3; real provider skipped: no key) |
| G12 Licences | Literal command **fails** on `@img/sharp-libvips-darwin-arm64` (LGPL-3.0); passes with the documented exception (`npm run licences:documented`) |

### AI jobs (provider-to-task mapping, proposed and implemented)
CLAUDE.md §7.5 has no approved table yet, so per GAUNTLET.md §6 this is proposed, implemented and flagged for the owner. One provider per job, one job per provider, no fallback chains:

| Job | Provider | Module / route | Status |
|---|---|---|---|
| Ask Ano answers | Groq | `lib/ai/askAno.ts`, `app/api/ask-ano` | Implemented; falls back to the next written hint |
| Ano's voice (Ask Ano answers) | ElevenLabs | `lib/ai/voice.ts`, `app/api/ano-voice` | Implemented; falls back to the browser's `speechSynthesis` |
| Eval grading | Gemini | `tests/ask-ano.eval.ts` only (never at runtime) | Real-mode eval implemented with heuristic grading; Gemini grader not wired (no key to test it) |
| Question screening (on-topic check) | Mistral | — | Proposed only |
| Answer fact-check vs simulator | Cerebras | — | Proposed only |
| Typed hypothesis → misconception match | OpenRouter | — | Proposed only (new feature) |

### Decisions made
- **DESIGN.md and GAUNTLET.md lived outside the repo** (`~/Documents/soren-test/`). Copied them into the project root so the CLAUDE.md note and the gates point at real files. The originals are untouched.
- **No reference image.** `design/reference/landing.png` doesn't exist. DESIGN.md §2 describes P1–P7 precisely, so the build follows that text, and G9 scores each page against those written patterns instead of the image. Logged under "Needs owner".
- **Chemistry theory sources.** The failing test demanded sources. Citing OpenStax sections that were each fetched and confirmed is grounding, not invention (RESOURCES.md §6). The owner should still skim that each section matches its page.
- **The old Ask Ano tried five providers in a chain**, which breaks CLAUDE.md §7.5. Replaced it with Groq only. The old `lib/ask-ano/` folder is removed.
- **Missing keys fall back instead of stopping the server.** CLAUDE.md §7.5 says a missing key stops the server, but there is no `.env.local` here, so that rule would fail every gate, and GAUNTLET.md §6 says missing keys fall back. `lib/env.ts` always stops the server on a *malformed* key; `ANOMALY_REQUIRE_KEYS=1` also makes *missing* keys fatal, for the demo deployment.
- **ElevenLabs over plain `fetch`, not `@elevenlabs/elevenlabs-js`.** It's one REST call, and no key exists to test an SDK against. Default voice `21m00Tcm4TlvDq8ikWAM` and model `eleven_flash_v2_5`, both overridable in env.
- **The voice route answers 200 `{ fallback: "speech" }` when it can't speak**, not 503, so a missing key never shows up as a failed request (G6).
- **Rate limits** use Upstash when its keys are set, otherwise the same budgets in memory: 5 questions per session, 20 per IP per hour, 300 per day globally (`ASK_ANO_DAILY_CAP`). IPs are hashed; questions are never stored (cache keys are hashes).
- **Ask Ano prompt** now carries Ano's teacher persona (§7.1b), four example answers and an 80-word cap. The level is added to the prompt so wording matches it.
- **detect-gpu** fetches its benchmark tables from unpkg by default. They're now copied into `public/gpu-benchmarks/` at predev/prebuild (`scripts/gpu-benchmarks.mjs`, git-ignored), so nothing is fetched from a CDN.
- **Licences.** `@img/sharp-libvips-*` is an LGPL-3.0 native binary that Next.js installs as an optional dependency of `sharp` (server-side image optimisation; dynamically linked, never shipped to the browser). `@react-three/rapier` has no licence field, but its repo is MIT (RESOURCES.md). Both are excluded in `npm run licences:documented`; the literal gate command is kept as `npm run licences` so its result stays visible. The owner should confirm the libvips exception.
- **Playwright drives the installed Google Chrome** (`channel: "chrome"`) with GPU flags, because the bundled headless shell renders WebGL in software.
- **Screenshots are git-ignored** (`tests/screenshots/`), so the repo doesn't fill with binaries. They stay on disk for review.

### Needs owner
- Add `design/reference/landing.png`, then re-score G9 against it.
- Add `.env.local` with the keys in `.env.example` (see HANDOFF.md "Keys needed").
- Approve or change the provider-to-task mapping above.
- Confirm the libvips LGPL exception.

---

## Round 1: design foundation

### Plan
- Put the DESIGN.md §3 ramps, gradients and warm shadows, and the §4 fonts (Archivo, Geist, Geist Mono), into the Tailwind theme. Keep the old dark tokens in a marked legacy block so pages not rebuilt yet still render; delete it in round 6.
- Build every DESIGN.md §5 component in `components/ui/` (cva variants, hit area equals visible area), plus the shared page patterns P1–P7 (frame, header, split headline, stage card, floating cards, ribbon, Sunrise).
- Restyle the site cursor for the light theme (ink dot, ring that grows over controls, short warm trail; normal blending).
- Add a dev-only `/design-system` page showing every component and the font comparison (Archivo vs Anton vs Bricolage Grotesque), with screenshots.
- Start the Playwright gates: G5 flows on the pages as they stand, plus G6 console, G7 hit areas, G8 axe and keyboard, and G9 screenshots.

### What changed
- **Theme** (`app/globals.css`): DESIGN.md ramps (cream, ink, apricot, flame, volt, grape, verify, anomaly) plus white; the Sunrise, Ribbon, Chem, Robo, Level, Win and Glitch gradients as utilities; warm shadows (`shadow-warm-sm/-/lg`); radii by hierarchy (frame 32, sheet 28, card 20, tile 10); motion tokens (float, roll-up, drift, ribbon, sheet, talk); type utilities `type-hero`, `type-heading`, `type-eyebrow`, `type-readout`; `glass-card`, which drops its blur on the Low tier. The old dark tokens and utilities sit in a marked LEGACY block.
- **Fonts** (`app/layout.tsx`): Archivo (with its width axis), Geist and Geist Mono via `next/font`, mapped to `font-display`, `font-sans` and `font-mono`. Host Grotesk and Instrument Serif stay only for the legacy utilities. JetBrains Mono is gone (readouts are now Geist Mono).
- **Components** (`components/ui/`): Button (primary, secondary, ghost; sheen, lift, squash, ripple; the hit area never moves), IconButton, Chip (with ConfidenceChip and StatusDot), GlassCard, ResultCard, BeliefShiftCard, InfoChipCard, CarouselControls, PredictionChoices (radio group with arrow keys), Slider, SegmentedToggle, Switch, BreadcrumbBar, SpeechBubble (Listen with talk bars and captions), TheorySheet (Radix Dialog: right sheet on desktop, bottom sheet on mobile), Toast. Page patterns: Frame (P1), SiteHeader and Logo (P2), SplitHeadline (P3, letters roll up from a mask), StageCard (P4), Ribbon (P7), Sunrise.
- **Motion helpers** (`lib/motion.ts`): reduced-motion hook (hydration-safe), magnetic pull and tilt on inner content only, release ripple.
- **Voice in the browser** (`lib/voice.ts`): off by default. Ask Ano answers try `/api/ano-voice` first; everything else uses `speechSynthesis`.
- **Cursor and VFX restyled for the light theme**: the soft cursor (ink dot with a white edge, short warm trail, a ring that grows over controls, ripple on release); the VFX layer now blends normally, sparks get a dark core, and the colours come from the new palette.
- **`/design-system`**: every token and component, the patterns together, and the font comparison. It 404s in production unless `ANOMALY_DESIGN_SYSTEM=1` (the gauntlet's test build sets it).
- **Gauntlet tests** (`tests/e2e/`): flows (G5) with console capture (G6), hit areas (G7), axe, keyboard and reduced motion (G8), screenshots (G9) and perf (G10).
- Small hooks for the tests and tools: `data-phase` / `data-verdict` on the experiment's `<main>`; `next.config.ts` reads `ANOMALY_DIST_DIR`, so a second dev server can run beside the team's (Next 16 allows only one per folder).

### Files touched
`app/globals.css`, `app/layout.tsx`, `app/design-system/page.tsx`, `app/(explore)/layout.tsx` (legacy text colour shim), `components/landing/Landing.tsx` (legacy shim), `components/lab/LabExperiment.tsx` (test hooks), `components/ui/{Button,IconButton,Chip,GlassCard,ResultCard,BeliefShiftCard,InfoChipCard,CarouselControls,PredictionChoices,Slider,Toggle,BreadcrumbBar,SpeechBubble,TheorySheet,Toast,Frame,Sunrise,Ribbon,StageCard,Logo,SiteHeader,SplitHeadline}.tsx`, `components/design-system/*`, `components/fx/{cursor.ts,FxLayer.tsx}`, `lib/fx/{draw,moments,streams}.ts`, `lib/{tokens,cn,motion,voice}.ts`, `tests/e2e/*`, `playwright.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`, `.gitignore`.

### Gate results
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 528 passed, 1 skipped (real-provider eval: no key) |
| G4 Build | Pass | |
| G5 Flows | Pass (6/6) | Journey, LED correct/wrong, sealed bag correct/wrong, theory sheet, back/forward, breadcrumbs. Carousel test skipped: the carousel is built in round 3 |
| G6 Console | Pass | No console errors, hydration warnings or failed requests during G5 |
| G7 Hit areas | **Fail on legacy pages; pass on new ones** | `/design-system`: 40/40 controls pass after 1 fix attempt (segmented toggle had no visible box; disabled buttons are now skipped). Legacy failures, rebuilt in rounds 3–5: the old "ANOMALY" wordmark link (2.5 px) on every explore page, the lab-choice buttons (324 px), a map star (61 px), the old filter and toggle buttons (16 px) |
| G8 Accessibility | **Fail on legacy pages; pass on new ones** | `/design-system` axe clean after 1 fix (High-confidence chip contrast). Legacy: `/start` contrast (`text-pearl/45`); `/labs/robotics/medium` and the LED page `label-content-name-mismatch`. Keyboard-only LED run passes; reduced motion passes (0 CSS animations left running) |
| G9 Visual | Pass | `/design-system` scores below |
| G10 Performance | Pass | Apple M1 Pro over Metal (real GPU). Every page holds 59.9 fps, p95 16.7 ms. Low tier with 4× CPU throttle (a probe confirms work runs 3.3× slower) still holds 59.9 fps. Draw calls (high/low): landing 105/64, LED 62/44, sealed bag 141/59 |
| G11 AI and voice | Pass (mock) | 20 eval questions pass the teacher-quality checks; fallback, verdict guard, cache, session and IP limits and voice fallback all tested. Real provider: not run (no key; 0 of 30 calls used) |
| G12 Licences | Literal **fail**, documented pass | `@img/sharp-libvips-darwin-arm64` LGPL-3.0 (Next.js optional binary); owner to confirm |

### Rubric (DESIGN.md §12), `/design-system` at 1440, 1024 and 390
| Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|
| 4 | 5 | 5 | 4 | 4 | 5 | 4 |

Uses P1–P5 and P7 together (Ano fills the gap in round 2); the Sunrise and ribbon are vivid while every text sits on white or cream; the condensed 900 Archivo headline is huge and tight at every width and stacks on phones; one radius and shadow system throughout.

**Font choice:** Archivo. It's the DESIGN.md default, and its width axis gives one family for the condensed hero and the normal-width headings. Anton is as heavy but has no weights or widths; Bricolage is friendlier but can't go as narrow. Screenshots: `tests/screenshots/round-1/fonts-{archivo,anton,bricolage}.png`.

### Decisions made
- **Legacy tokens kept for now.** Removing the dark tokens before each page is rebuilt would leave white-on-cream text on old pages and fail G8 there. They live in a marked block and are deleted in round 6.
- **The High-confidence chip uses ink-700 text**, not DESIGN.md's apricot-700: apricot-700 on apricot-100 measures about 4.2:1, under WCAG AA for 12 px text, and DESIGN.md §3 requires AA. The other chip pairs all pass (4.8–5.7:1).
- **G7 definition.** A control's visible box is what's drawn at rest or on hover (its own background, border or shadow, or a face child covering at least half of it); otherwise the union of its text and icons. So every control either shows its shape at rest or lights up a hover background exactly the size of its hit area. Disabled controls are skipped.
- **Carousel dots** are 44 px discs, each with a faint visible fill, so the visible and clickable areas match and they meet the 44 px minimum (CLAUDE.md §10.1).
- **`/design-system` is gated by an env flag** rather than dev-only, because the gauntlet must screenshot and test it on a production build.
- **A second dev server.** The team's `next dev` on :3000 was serving a stale root layout, and Next 16 refuses a second dev server in the same folder. Rather than stop someone else's process, `next.config.ts` now takes `ANOMALY_DIST_DIR`, and the gauntlet's dev server runs with `.next-gauntlet` on :3200.

### Screenshots
`tests/screenshots/round-1/` (design-system at 1440/1024/390, viewport and full page; font comparison).

### Suggested commit
Branch `remake/bright-lab-foundation`: "Add the Bright Lab design system: tokens, fonts, UI components and the design-system page".

---

## Round 2: Ano 3D

### Plan
- One persistent site canvas (`components/three/SiteCanvas.tsx`) in the root layout. Every 3D thing becomes a drei `<View>`, scissored into the canvas, so there's one WebGL context and scenes survive route changes.
- Three quality tiers (High / Medium / Low) from detect-gpu plus live `PerformanceMonitor` adjustment, a per-tier dpr cap, and `html[data-quality]` for CSS.
- A studio environment baked once (warm key, cool rim, apricot and flame bounce) for reflections, with no HDRI download.
- Ano built from primitives (DESIGN.md §6): squashed glossy head, dark visor with a canvas-drawn face (happy, curious, thinking, surprised, celebrating, talk bars, blinks, eyes that follow the cursor), orange headphone ears and antenna, egg body with a belt, segmented arms with ball joints and mitten hands. Parts are merged per material and limb, about 14 draw calls.
- Springy motion: idle float, breathing and blinks; head follows the cursor (±20°); wave, nod, surprised hop, spin, a boop when clicked near; talk bars while speaking; peek pose; specular highlights sweep with the mouse.
- `/design-system` gallery: every expression, a playground with every move, and Ano in the hero gap.

### What changed
- **One site canvas** (`components/three/SiteCanvas.tsx`, mounted in `app/layout.tsx`): fixed, above page backgrounds (z-10) and below cards and dialogs, with pointer events off. It waits for the GPU tier, then picks antialiasing, dpr and ACES tone mapping. `PerformanceMonitor` steps the tier down or up live. `?debug=stats` exposes draw calls.
- **Quality tiers** (`lib/quality.ts`): High / Medium / Low from detect-gpu (benchmarks self-hosted), live adjustment, `?quality=` override, `html[data-quality]`, dpr caps (1.5 / 1 / 0.85) and a particle-scale helper. Old callers keep working.
- **Studio environment** (`components/three/studio-env.ts`): a warm room with a key softbox, a fill card, apricot and flame bounce and a volt rim, baked once per renderer into a PMREM map. No HDRI download.
- **Ano** (`components/ano/`): `parts.ts` (geometry merged per material and limb; materials per tier), `body.ts` (object tree), `rig.ts` (motion), `face.ts` (canvas face: five expressions plus talk bars, blinks, eyes that follow the cursor, a glow), `spring.ts`, `Ano.tsx` (R3F wrapper), `AnoView.tsx` (Ano anywhere in the layout, full or bust framing, highlights sweep with the mouse). Moves: wave, nod, surprised hop, spin, a boop on a nearby click, the peek pose and a springy antenna. Reduced motion: no idle drift or big moves; the face still changes.
- **`/design-system`**: Ano waves in the hero gap; a gallery of every expression and talk bars; a playground for expressions, moves, poses, talk bars and "Say it" (browser speech).
- Shared pointer (`components/three/pointer.ts`).

### Files touched
`app/layout.tsx`, `components/three/{SiteCanvas,SiteCanvasMount}.tsx`, `components/three/{pointer,studio-env}.ts`, `components/ano/{types,face,parts,body,rig,spring}.ts`, `components/ano/{Ano,AnoView}.tsx`, `components/design-system/{AnoDemo,PatternsDemo}.tsx`, `app/design-system/page.tsx`, `lib/quality.ts`, `tests/e2e/perf.spec.ts` (draw-call key and throttle probe), `tests/e2e/quality.spec.ts` (one result file per test).

### Gate results
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 528 passed, 1 skipped |
| G4 Build | Pass | |
| G5 Flows | Pass (6/6) | Carousel still skipped (round 3) |
| G6 Console | Pass | |
| G7 Hit areas | **Fail on legacy pages; pass on new ones** | `/design-system`: 54/54 pass, none under 44 px. Same legacy failures as round 1 |
| G8 Accessibility | **Fail on legacy pages; pass on new ones** | `/design-system` axe clean; Ano views are `role="img"` with a label (or hidden). Keyboard and reduced motion pass |
| G9 Visual | Pass | Scores below |
| G10 Performance | Pass | With all 7 Anos on screen: 112 draw calls (16 per Ano), 59.9 fps, p95 16.8 ms; Low tier with 4× CPU throttle: same 59.9 fps. Other pages unchanged from round 1 |
| G11 AI and voice | Pass (mock) | Unchanged; 0 real calls |
| G12 Licences | Literal fail, documented pass | No new runtime packages |

### Rubric (DESIGN.md §12), `/design-system`
| Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|
| 5 | 5 | 5 | 4 | 5 | 5 | 4 |

Ano now stands in the headline gap like the P3 pattern describes. Glossy white with apricot accents and a glowing face matches the warm palette; the visor gets its own dimmed reflections, so the face stays readable. Every expression is distinct at gallery size.

### Decisions made
- **One canvas plus drei `<View>`s** instead of a canvas per 3D object: one WebGL context, shared geometry and materials, scenes that survive navigation (CLAUDE.md §3.7). The cost is a stacking rule: the canvas sits at z-10, so floating cards and dialogs use z-20 and up, and section wrappers must not create stacking contexts.
- **No post-processing on the site canvas.** EffectComposer doesn't work per view, and additive bloom washes out on cream. Glows come from emissive faces and the 2D VFX layer instead (DESIGN.md §8 and §9.2 already ask for normal blending and no post on Low).
- **Ano's visor reflects at 0.3 intensity**: at full studio intensity the softboxes showed as grey bars across the face.
- **ACES tone mapping at 1.02 exposure** for the site canvas; whites stay creamy rather than grey.

### Screenshots
`tests/screenshots/round-2/` (design-system at 1440/1024/390, viewport and full page).

### Suggested commit
Branch `remake/ano-3d`: "Add the site canvas, quality tiers and 3D Ano with expressions and moves".

---

## Round 3: landing page

### Plan
- Replace the dark Lusion landing with the Bright Lab hero (DESIGN.md §7.1): a rounded frame, a header, and a three-slide carousel. Each slide's headline words roll in; the cards (Result, Belief shift) swap data at different parallax depths; Ano changes pose. Auto-advance every 7 s, pausing on hover, focus or a pause button. Arrows, dots and swipe.
- "Try it" on slide 1 turns the hero into the "Which falls faster?" experiment in place: guess, drop (deterministic model, real 3D balls, a ghost for a wrong guess), then NAILED IT. or ANOMALY DETECTED., Ano reacts, "Pick your level".
- Lower band (P6) with the real experiment count from `content/`; the ribbon (P7).
- Below the hero: How it works (four animated steps), two lab cards with small 3D objects (flask, rover) that tilt toward the cursor, Meet Ano (expression buttons and the voice toggle), the belief wall (real misconceptions and their progress), levels strip, final "YOUR · TURN." CTA, footer and a credits page.
- Smooth scroll (Lenis), scroll-driven reveals in CSS (static with reduced motion), and the landing's content moved into `content/landing.json`.

### What changed
- **New landing** (`app/page.tsx`, `components/landing/`). Hero: Frame, header, a three-slide carousel (`useCarousel`: 7 s auto-advance, pause on hover or focus, a pause button for WCAG 2.2.2, none with reduced motion, arrows, dots, swipe). On each slide the headline's letters roll in, Ano poses (wave, hop, nod) and the Result and Belief cards pop in at two parallax depths. Lower band (P6) with the real count ("Explore 21 experiments…" from `EXPERIMENTS.length`); ribbon (P7).
- **"Try it" turns the hero into the experiment in place** (CLAUDE.md §3.2): `drop-sim.ts` is a deterministic model (free fall, √(2h/g), mass-free, with unit tests), and `DropScene` is real 3D: a steel ball, a glass ball, trapdoor ledges, a floor, dust rings, Ano on the floor, and a ghost of the student's belief falling faster. Verdict: "NAILED IT." (Win ramp) with a burst, confetti and a chime, or "ANOMALY DETECTED." (Glitch ramp) with a glitch, sting and shake. Every sound has a caption toast.
- Below the hero: How it works (four steps, icons on tiny loops), the two lab cards with 3D objects (`components/three/lab-objects.ts`: a glass flask with sloshing pink liquid and bubbles, an Ano-style rover; they lean toward the cursor and tilt with the card), Meet Ano (expression buttons that also play a move, the voice switch, a Listen bubble), the belief wall (9 real misconceptions, alternating labs, status from saved progress after mount), the levels strip (real counts 8/7/6), the final "YOUR · TURN." CTA, footer and `/credits`.
- Lenis smooth scroll on the landing; CSS scroll-driven reveals (`.reveal`, off with reduced motion and where unsupported); a global `<Toaster>` for captions.
- Removed the old dark landing (camera rail, kinetic title, preloader, physics objects, lens cursor and so on) and `Ano3D`. `mulberry32` moved to `lib/random.ts`. Old modules the legacy lab-choice scene still needed stayed until round 4.

### Gate results
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 523 passed, 1 skipped (−9 old landing layout tests, +4 drop-model tests) |
| G4 Build | Pass | |
| G5 Flows | **Fail (6/7)** | Journey, LED and sealed bag (correct and wrong), theory, back nav and breadcrumbs pass. Carousel: arrows and dots pass; **mouse swipe didn't change slide on the production build** (expected "1 of 3", got "3 of 3"). The same swipe works on the dev server; re-tested on the round 4 build (fix attempt 1) |
| G6 Console | Pass | No errors during the flows |
| G7 Hit areas | **Pass on new pages, fail on legacy** | Landing 28/28, credits 12/12, design-system pass, none under 44 px. Legacy explore pages as before (rebuilt in round 4) |
| G8 Accessibility | **Fail** | Landing and credits axe clean; reduced motion passes. **Keyboard test failed**, from a flaw in the test: it pressed Space on the first radio on the LED page, which is the confidence setting, so no prediction was ever made and no verdict came. The test now targets the prediction group (`data-prediction`) and checks a choice was made; re-run in round 4 |
| G9 Visual | Pass | Scores below |
| G10 Performance | Pass | Landing hero: 59.9 fps, p95 16.8 ms, 16 draw calls; Low tier with 4× CPU throttle: 59.9 fps. Lab cards and Meet Ano add 2 and 1 views further down |
| G11 AI and voice | Pass (mock) | 0 real calls |
| G12 Licences | Literal fail, documented pass | No new packages |

### Rubric (DESIGN.md §12)
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Landing | 5 | 5 | 5 | 4 | 4 | 5 | 4 |
| Credits | 4 | 4 | 5 | 4 | 4 | 5 | 5 |

Landing: every P1–P7 pattern is present, and Ano stands in the gap of the giant split headline. Belief and Result cards sit above and below the type rather than over it, and the hero teaser plays in place. Spacing is tight between the Result card and the lower band at 1440×900, so 4. Credits: plain but consistent; it moved into a Sunrise frame after scoring (vibrancy was 3 on the first screenshot).

### Decisions made
- **The teaser is in place, not a modal.** A Radix dialog sits above the site canvas, so a 3D view inside one would be hidden. Turning the hero into the experiment is also closer to "the visitor experiences the product's core idea in the first five seconds".
- **No real transmission for the glass ball**: over the transparent site canvas it rendered as a flat white disc. Faked glass (tint, gloss, iridescence) instead, which also keeps CLAUDE.md §9's limit of one transmission object.
- **Win headline ramp** uses verify-700 → volt-600 (see SplitHeadline), because verify-500 → volt-400 measures under 3:1 on cream.
- **Smooth scroll uses Lenis's own rAF**, not the canvas loop as CLAUDE.md §9 prefers: if WebGL fails the canvas loop never starts, and the page wouldn't scroll at all.
- **Scroll reveals are CSS scroll-driven animations**, so there's no JavaScript and no hidden content if scripts fail.
- **The "How it works" chip links to `#how-it-works`**; lab cards on the landing link to `/start`, because CLAUDE.md §1.1 says students always pick a level first.
- **Dev server restarted** (my own, on :3200) after its watcher missed an appended export; the team's server on :3000 was left alone.

### Screenshots
`tests/screenshots/round-3/` (landing and credits at 1440/1024/390, viewport and full page).

### Suggested commit
Branch `remake/landing-bright`: "Rebuild the landing page: hero carousel, in-place drop experiment and the sections below".

---

## Round 4: selection pages

### Plan
- One explore top bar (`ExploreBar`): logo, Level · Lab · Experiment breadcrumbs (every part clickable) and My beliefs. It replaces the old fixed dark breadcrumbs.
- Level select (§7.2): "PICK · YOUR LEVEL.", three tall level-gradient cards with grade badge, line and real counts, Ano peeking over Medium.
- Lab select (§7.3): "CHOOSE · YOUR LAB.", Chemistry (glossy flask) and Robotics (rover) cards that tilt toward the cursor, with real per-level counts.
- Experiment map (§7.4): a Chem- or Robo-tinted frame, glass nodes on a measured winding path, done / current (pulsing) / locked / coming-soon status, Ano peeking over the current node, and a level-complete celebration with the next level.
- My beliefs (§7.6): "YOUR · BELIEFS.", every misconception as a Belief shift card (broken, challenged or not yet tested from saved progress), lab and level filters, each opening its experiment. Remove the old React Flow map and `@xyflow/react`.
- Re-run the round 3 failures (carousel swipe, keyboard test) on this build.

### What changed
- **`ExploreBar`** on every explore page: logo, Level · Lab · Experiment breadcrumbs (the level goes to `/start`, the lab to its map, the experiment is the current page), and My beliefs. It replaces the old fixed dark breadcrumbs; there are no crumbs on My beliefs, which has its own button.
- **Level select** (`/start`): "PICK YOUR LEVEL." with three tall level-gradient cards (numeral, grade badge, line, real counts with "coming soon"); text sits on white glass panels; the cards tilt toward the cursor. Ano peeks over Medium: his view ends at the card's top edge with a new close `peek` framing, so the rest of him reads as behind the card.
- **Lab select** (`/start/[level]`): "CHOOSE YOUR LAB." with the landing's lab cards (3D flask, rover) linking to the level's map, and per-level counts.
- **Experiment map** (`/labs/[lab]/[level]`): a Chem- or Robo-tinted frame (new `tint` on Sunrise and Frame), glass nodes on a winding dashed path measured from the nodes (redrawn on resize), done / current (pulsing ring, "Up next") / open / locked (solid cream, not a link) / coming soon. Ano peeks over the current node; a level-complete card with confetti and "On to {next level}".
- **My beliefs** (`/beliefs`): "YOUR BELIEFS." with Ano thinking in the gap, broken/challenged/untested counts, lab and level filters, every misconception as a Belief shift card with a lab accent bar, sorted broken first. `lib/beliefs.ts` is shared with the landing's belief wall.
- Removed the old explore components (the 3D lab-choice scene, experiment-map stars, breadcrumbs, AnoLine), the React Flow misconception map and `@xyflow/react`, and the last old landing modules. The dark lab room now mounts only on experiment pages.

### Gate results
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 523 passed, 1 skipped |
| G4 Build | Pass | |
| G5 Flows | **Pass (7/7)** | Including the carousel (arrows, dots, swipe) and the round 3 swipe failure, now passing on this build |
| G6 Console | Pass | |
| G7 Hit areas | **Pass on all rebuilt pages; legacy fails** | levels 7, labs 7, map 6, beliefs 40, landing 28, credits 12, design-system 54: all pass, none under 44 px. Only the two legacy experiment pages fail (rebuilt in round 5) |
| G8 Accessibility | **Pass on rebuilt pages** after 1 fix attempt | First run: `label-content-name-mismatch` on level cards, lab cards and map nodes (my `aria-label`s replaced the visible text). Removed them, so the visible text is the name; all clean. Keyboard (now aiming at the prediction group) and reduced motion pass |
| G9 Visual | Pass after 1 fix | 390 px: Ano's peek overlapped the Easy card, and "All levels" wrapped; both fixed and re-shot |
| G10 Performance | Pass | Unchanged pages as before; new pages are DOM plus 1–2 small views |
| G11 AI and voice | Pass (mock) | 0 real calls |
| G12 Licences | Literal fail, documented pass | One package fewer (`@xyflow/react` removed) |

### Rubric (DESIGN.md §12)
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Level select | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Lab select | 4 | 5 | 5 | 4 | 5 | 5 | 5 |
| Experiment map | 4 | 4 | 5 | 4 | 4 | 5 | 5 |
| My beliefs | 4 | 4 | 5 | 4 | 4 | 5 | 5 |

Level select has the strongest pattern match (frame, giant headline, Ano peeking over a card). The map's path, status chips and the peeking Ano make the next step obvious. My beliefs is calmer (most beliefs are untested on a fresh device), with colour carried by the accent bars and the Sunrise.

### Decisions made
- **The "Not sure? Let Ano place you" warm-up was skipped** (optional in both CLAUDE.md §1.1 and DESIGN.md §7.2); Ano's line suggests starting with Easy instead.
- **The React Flow misconception map was retired** for DESIGN.md §7.6's card grid; "broken" beliefs show as verify-green cards rather than shattering nodes.
- **Breadcrumbs:** Level → `/start`, Lab → that lab's map. Switching lab goes through the level crumb, then choose your lab.
- **Locked nodes aren't links** (unlock in order, CLAUDE.md §1.1); experiment URLs still open directly, as before.

### Screenshots
`tests/screenshots/round-4/` (levels, labs, map, beliefs, credits at 1440/1024/390; levels and beliefs re-shot after the phone fixes).

### Suggested commit
Branch `remake/selection-pages`: "Rebuild level select, lab select, the experiment map and My beliefs".

---

## Round 5: experiment page, all in 3D

### Plan
- One continuous 3D space per experiment (DESIGN.md §8.1): a bright studio (cream cove backdrop, rounded clay bench, warm/cool lab tint, baked soft shadows) drawn by the site canvas as a full-screen view under the HUD, with a camera director (CameraControls) that glides through arrive → build → predict → run → reveal shots; orbit, zoom, and double-click to reset.
- A shared 3D apparatus kit (`components/lab3d/kit/`): circuit parts (battery, wire tubes with current particles at the simulator's current, LED, resistor with colour bands, bulb, switch, motor, buzzer, board, glowing slot outlines), chemistry parts (beaker and liquids, flask, test tube, zip bag, scale with readout, thermometer, burner), robot parts, glass labels for readouts, and one pooled VFX system (sparks, smoke, bubbles, shockwave, confetti) with normal blending.
- Light the LED and Mass in a sealed bag first and most polished: parts snap into glowing outlines, a 3D ghost of the prediction (ghost LED glow, ghost scale reading), and reality side by side after a wrong run.
- Restyle the whole lab HUD for the light theme: mission card, confidence, inspector, parts tray and controls, prediction cards with a black Run pill, time scrubber, Ano dock with speech bubble and Ask Ano, Result card, success ("NAILED IT." + confetti + Next / See the theory) and ANOMALY ("ANOMALY." glitch + ghost + hint ladder + try-this edit) moments, and the theory sheet.
- Convert every other stage to the kit (parallel helpers, one stage per file); anything not converted falls back to its 2D apparatus on a lit panel and is listed here.
- Real AI providers are allowed from round 5 (30-call cap), but there are no keys, so G11 stays mock-only.

### What changed
- **One continuous 3D lab per experiment** (DESIGN.md §8, §8.1). The site canvas draws the lab as a full-screen view under the HUD:
  - A bright studio: a cream backdrop with lab-tinted light blobs, a floor that fades out, a rounded clay bench and baked contact shadows.
  - A camera director (drei `CameraControls`) that glides through arrive → build → predict → run → reveal. Students can orbit, zoom and double-click to reset.
  - Shots are pulled back on smaller views (`fitShots`), so the apparatus stays clear of the HUD at 1024 px, at 1280 × 720 and on phones.
- **Shared 3D apparatus kit** (`components/lab3d/kit/`, DESIGN.md §7.5):
  - Circuit parts: battery, wire tubes with current dots moving at the simulator's current, LED, bulb, resistor with colour bands, switch, motor, buzzer, board, glowing slot outlines, and parts that fly in from a 3D tray.
  - Glassware with live liquids: beaker, flask, test tube.
  - Containers and instruments: zip bag, gas cloud, scale, thermometer, hot plate, burner.
  - Live readouts: glass labels in Geist Mono and live 3D graphs.
  - One pooled, instanced VFX system for sparks, smoke, bubbles, glow, confetti and shockwave rings, with normal blending.
  - Helpers added per lab:
    - Heat: particle swarm, balloon, ice, race beakers.
    - Reactions: jar and steel wool, gas syringe, catalyst powder, gas tube, bath.
    - Liquids: dropper, burette, pH meter, colour chart.
    - Gas: syringe and pressure gauge.
    - Robotics: arena, chassis, wheels, trails, gears, motor, driver, scope, multimeter.
- **Every experiment is now 3D: 15 stages, 21 experiments, none left in 2D.**
  - Light the LED and Mass in a sealed bag were built first and polished most.
  - The other 13 stages were built in parallel on the same kit: melt, gas heat, reaction speed, burning, catalyst, equilibrium, dissolving, indicator, neutralisation, gas laws, robot steering, gears and PWM.
  - Each one:
    - runs from the simulator's timeline (never React state per frame);
    - shows the student's prediction as a ghost: a dashed volt label plus a translucent or wireframe volt copy;
    - sets a focus anchor for Ano and the verdict burst.
  - Seven stages have a "zoom to particles" dive with a caption saying what the dots are.
- **The whole process in 3D** (§8.1):
  1. Ano floats in and waves.
  2. Parts snap into glowing outlines; clicking a part shows a glass label with its name and, after a run, its live current and voltage.
  3. Picking a prediction floats a "Your idea: …" ghost over the result.
  4. The run takes the best angle, with the time scrubber.
  5. The reveal shows ghost and reality side by side.
     - Correct: green and volt shockwaves, 3D confetti, Ano nods, "NAILED IT." (or a variation) assembles.
     - ANOMALY: the scene freezes for 360 ms with a canvas glitch, "ANOMALY." slams in, Ano hops and floats to the part that matters.
  6. Zoom to particles, or "zoom in on the current" for circuits.
  7. The theory sheet opens beside the lab, which dives in to show the idea.
- **Light lab HUD:**
  - Mission card with the safety note and confidence.
  - Inspector with live values.
  - Ano and his speech bubble at the bottom left (§7.5), with Ask Ano. Ano is measured into the gap between the mission card and the bubble, so he fits however tall they are.
  - A dock with build controls, prediction cards, the black Run pill and the time scrubber.
  - Result card, level ribbon, Next experiment / See the theory / Back to map, and on a wrong run the hint ladder with "Try this".
- **Removed:** the dark lab room (`components/labroom/`), the old HUD components and the shader warm-up.
- **Tests:**
  - The ANOMALY check no longer depends on the giant word, which is only on screen for under two seconds.
  - G10 also samples frame times during a run on both lab pages.
  - G7, G8 and G9 now cover every experiment page.

### Files touched
- **New:** `components/lab3d/` (whole folder):
  - `LabStage`, `lab-state`, `lab-ui`, `shots`, `useStageValues`
  - `scene/`: `CameraDirector`, `Studio`, `LabAno`, `PredictionGhost`, `VerdictBurst`, `useShotName`, `LabScene`
  - `kit/`: materials, the VFX queue and pool, `TextBoard`, `Graph3D`, and the `circuit/`, `chem/` (with `heat/`, `react/`, `liquid/`, `gas/`) and `robot/` kits
  - `stages/`: 15 stages and `registry.ts`
- **New:** in `components/lab/`: `AnoDock`, `BuildControls`, `Fallback2D`, `LevelProgress`, `MissionCard`, `PredictDock`, `ResultDock`, `VerdictMoment`, `useAskAno`.
- **Changed:**
  - In `components/lab/`: `LabExperiment`, `Inspector`, `TimeScrubber`, `useRun`
  - `components/ui/PredictionChoices.tsx` (smaller minimum card width)
  - `components/three/SiteCanvas.tsx` (`data-site-canvas`)
  - `lib/store.ts` (arm and place a part)
  - `app/(explore)/labs/[lab]/[level]/[id]/page.tsx`
  - `app/globals.css` (scene glitch)
  - `tests/e2e/flows.spec.ts`, `perf.spec.ts`, `pages.ts`
- **Deleted:**
  - In `components/lab/`: `AnoOrb`, `AnoPanel`, `Controls`, `KineticHeadline`, `LabMoments`, `LevelMiniMap`, `MissionBar`, `PartsTray`, `PredictionPanel`, `ResultPanel`, `RoomWindow`, `StageView`, `TheoryView`, `VerdictCard`, `WindowTicker`
  - `components/labroom/` (whole folder)
  - `components/ui/ShaderWarmup.tsx`

### Gate results
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 519 passed, 1 skipped (4 fewer than round 4: `components/labroom/rig-math.test.ts` went with the dark lab room) |
| G4 Build | Pass | |
| G5 Flows | **Pass (7/7)** | Journey; LED and sealed bag, correct and wrong; theory sheet; back navigation and breadcrumbs; carousel |
| G6 Console | Pass | No errors in any flow. The only warning is three's own `THREE.Clock` deprecation, from inside R3F (not our code) |
| G7 Hit areas | **Pass on all 29 pages** | All 21 experiment pages are now tested (14–19 targets each), none under 44 px, no hit/visible mismatch |
| G8 Accessibility | **Pass** | axe has no serious or critical issues on any of the 29 pages; the keyboard run (tab to a prediction, Space, tab to Run, Enter, verdict) and the reduced-motion check pass |
| G9 Visual | Pass after 2 fixes | See below |
| G10 Performance | **Pass** | Apple M1 Pro, ANGLE Metal. 59.9 fps median, p95 16.8 ms and no frames over 50 ms on the landing (16 draw calls), LED (62; 65 during a run), sealed bag (42; 43 during a run) and lab select (21). The same holds on the Low tier with 4× CPU throttling, idle and during a run (a fixed work chunk went from 6 ms to 20 ms, so the throttle really applies). The helpers measured robot 50–57, gears 48–50 and PWM 60–63 draw calls at 60 fps in dev |
| G11 AI and voice | Pass (mock) | 30 passed, 1 skipped (the real-provider eval). No keys, so 0 of 30 real calls used |
| G12 Licences | Literal fail, documented pass | Unchanged: only `@img/sharp-libvips-darwin-arm64` (LGPL-3.0) |

**G9 fixes:**
1. In the first screenshots, Ano's head went under tall mission cards (burning, catalyst, gas laws, neutralisation, reaction speed). Ano is now sized and placed from the measured gap between the mission card and his bubble.
2. At 1024 px the dock's three answer cards wrapped into two rows and pushed Run below the fold. Below 1280 px the bubble is now narrower and the Run pill sits under the answers.

The pages were re-shot after both fixes.

**Re-run after the fixes** (a fresh production build, this time with the design-system flag): G5 7/7, and G7/G8 pass on all 29 pages including `/design-system` (54 targets), with no axe issues, no hit mismatches and nothing under 44 px. 101 passed, 1 skipped (the font comparison: design system unchanged).

**Not measured this round:** the first gate build left out the design-system flag, so G10 for `/design-system` measured its 404. That page didn't change this round; round 6 measures it again.

### Rubric (DESIGN.md §12)
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Light the LED | 4 | 4 | 4 | 4 | 5 | 5 | 5 |
| Mass in a sealed bag | 4 | 4 | 4 | 4 | 5 | 5 | 5 |
| Other chemistry (10 pages) | 4 | 4 | 4 | 4 | 4 | 5 | 5 |
| Other circuits (6 pages) | 4 | 4 | 4 | 4 | 4 | 5 | 5 |
| Robot steering, gears, PWM | 4 | 4 | 4 | 4 | 4 | 4 | 5 |

The lab pages follow the reference's patterns where they fit a lab:
- the Sunrise backdrop tinted per lab;
- white glass cards with warm shadows (P3, P5);
- Ano with a speech bubble (P4);
- the black Run pill;
- the giant condensed verdict word in the Win or Glitch ramp.

Type is 4 because headlines stay small in labs on purpose (CLAUDE.md §2.6: clarity beats effects). The robot arena's dark mat is a deliberate contrast choice, which keeps robotics at 4 for consistency.

### Decisions made
- **All 13 remaining stages were built in parallel by four helpers on the shared kit**, each in its own files. I reviewed every result grid and applied their shared-file fixes:
  - labels that change width get a fresh texture (a WebGL overflow had frozen them);
  - the Low-tier materials no longer pass undefined parameters;
  - a stage's anchors are dropped when the experiment changes;
  - long "Your idea" labels wrap;
  - the prediction ghost hides during the particle dive.
- **Hybrid fallback kept as a safety net only.** CLAUDE.md §3.6 planned a 2D apparatus on a lit panel for unconverted experiments. Every stage is now 3D, so `Fallback2D` never renders; it and the old 2D stages are removed in round 6.
- **Prediction cards stay DOM glass cards over the 3D scene**, not 3D objects (DESIGN.md §8.1 step 3), so keyboard, screen readers and G8 keep working. The prediction itself appears in 3D as the ghost label.
- **The giant verdict word is a DOM overlay** whose letters assemble out of depth (CSS perspective), rather than WebGL text: it stays crisp at every size and costs no draw calls. The 3D moment is the shockwave, confetti and Ano.
- **The ANOMALY freeze pauses the whole frame loop for 360 ms** (`setFrameloop("never")`) while the canvas glitches in CSS. It is off with reduced motion.
- **No post-processing in the labs.** Bloom washes out on cream (DESIGN.md §8), and CLAUDE.md §9 keeps one composer for the landing. LED glow uses emissive sprites instead.
- **Faked glass everywhere in the labs** (clearcoat, iridescence, transparency). Real transmission stays reserved for one object per screen (CLAUDE.md §9).
- **Our own pooled, instanced VFX and spring cameras, instead of `three.quarks` and Theatre.js** (DESIGN.md §8.1 suggests both). One small pool covers every effect, adds no dependencies, and kept every page at 60 fps with 4× throttling.
- **Particle views exaggerate small changes** (about 4× for molecule speed, 1.6× for the balloon swell) so a 10 % change is visible. The readouts always show the true numbers, and the code says so.
- **The camera pulls back on smaller views** rather than the HUD shrinking, and Ano is measured into the free gap between the mission card and his bubble, so nothing hides behind the HUD at 1024, 1280 or 1440 px.
- **The robot arena mat is dark** for contrast with the white robot and its neon trail. It's heavier than the cream-first rule; one function (`matTexture()` in `kit/robot/Arena3D.tsx`) lightens it if the owner prefers (asked in the handoff).
- **A one-off formatter run:** at one point `npx prettier` wrapped one file at 80 columns. It was reformatted straight back to the repo's long-line style; there is no project formatter, and nothing else changed.
- **A dry-run git command:** early in this session I ran `git mv -n` (dry run, `-n`). It changed nothing (checked with `git status`), and no other git command that changes anything was run.

### Screenshots
`tests/screenshots/round-5/`: all 21 experiment pages at 1440, 1024 and 390 px (viewport and full page), re-shot after the G9 fixes. Working grids of each stage's build → run → moment → result are in the session scratchpad (not part of the repo).

### Suggested commits
Branch `remake/lab-3d`, in this order:
1. "Rebuild the experiment page as one continuous 3D lab with a shared apparatus kit". This covers the lab HUD, `components/lab3d/` scene, kit, circuit and fizz stages, the store change, the deletions and the test updates.
2. "Build the remaining chemistry and robotics experiments in 3D". This covers the other 13 stage files, their kit folders (`kit/chem/heat`, `react`, `liquid`, `gas`, `kit/robot`) and the registry captions.

---

## Round 6: transitions, VFX and the final pass

### Plan
- **Page transitions** (DESIGN.md §9), with React `<ViewTransition>`:
  - shared-element morphs: level card → lab select, lab card → map, map node → the experiment's mission card;
  - a Sunrise wipe for every other move;
  - back links and the browser's back button play the wipe from the top;
  - reduced motion: a quick fade.
- **Loading and 404** (§7.8):
  - a first-load preloader and a route loading screen where a CSS Ano assembles part by part while a percentage counts the real loading work;
  - "LOST · IN SPACE." with Ano shrugging (a new `shrug` move) and a black pill home.
- **Smooth on low-end devices** (§9.2): the canvas stops rendering when the tab is hidden or no 3D view is on the page, and the ANOMALY freeze goes through the same switch.
- **Final pass:** remove the legacy dark tokens, fonts and utilities and the old 2D stages; check §9.1's motion list.
- **Full gauntlet on every page,** with screenshots of all pages at 3 widths, then HANDOFF.md.

### What changed
- **Page transitions** (DESIGN.md §9), with React's `<ViewTransition>` and the browser's View Transitions API:
  - **Shared-element morphs.** A level card grows into the lab-select frame, a lab card grows into its map frame, and a map node flies into the experiment's mission card. Each pair shares a name and blurs softly mid-flight.
  - **Sunrise wipe for every other move.** The old screen sinks, blurs and fades; the new one is revealed from below across a Sunrise backdrop (the transition group's own background).
  - **Back plays in reverse.** Breadcrumbs and "Back to map" carry a `nav-back` type, and the browser's back button sets `html[data-nav-back]`.
  - **Reduced motion:** a 160 ms fade.
  - Morph targets and their sources now fully prefetch, so the new page commits in the same frame as the navigation and the pair can form. Without that, the destination showed its Suspense fallback first and nothing morphed.
- **Loading** (§7.8): a CSS-drawn Ano assembles part by part while a big percentage counts the real loading work (fonts, GPU tier, the site canvas's first frame, window load). It always finishes within 3.2 s, then lifts away like a curtain. The same screen shows while a page streams in (`app/loading.tsx`). It never blocks clicks, and it has its own view-transition name so a transition during load can't hide it.
- **404** (§7.8): "LOST · IN SPACE." with Ano shrugging (a new `shrug` move) in the headline gap, a speech bubble, Back home (black pill) and Pick a level.
- **Render only when needed** (§9.2):
  - The site canvas draws only while the tab is visible and at least one 3D view is on screen, counted by an IntersectionObserver on each view.
  - When nothing is left on screen it clears itself, so no stale picture lingers.
  - The ANOMALY freeze goes through the same switch.
  - Checked: the lab keeps rendering after the freeze, and pages without 3D draw nothing.
- **Motion details** (§9.1):
  - Landing headlines lean slightly with the scroll speed (Lenis velocity into `--scroll-skew`, eased back to upright).
  - Inspector readouts count up to their values. The visible copy is a DOM node React never touches; screen readers get the real text.
- **Cleanup:**
  - Removed the legacy dark tokens (depth, ion, glow, mist, resolve and the old single colours), the old fonts (Host Grotesk, Instrument Serif), the legacy utilities and every unused legacy class and keyframe. `globals.css` went from 28.7 KB to 18.4 KB.
  - Removed `TOKENS`/`RAMP` from `lib/tokens.ts`.
  - Removed the old 2D stages (`components/chemistry/`, `components/robotics/`, `Fallback2D`, `components/lab/stages.tsx`). The board geometry the 3D circuits still use moved to `components/lab3d/kit/circuit/board-geometry.ts`.
  - The stage registry is now a full `Record<StageId, …>`, so a new stage can't ship without its 3D apparatus.
- **Tests:** two new flows: the preloader finishes and gets out of the way, and the 404 answers 404 with a working way home.

### Files touched
- **New:**
  - `app/loading.tsx`, `app/not-found.tsx`
  - `components/loading/` (`AnoParts`, `Preloader`, `RouteLoading`, `useLoadProgress`)
  - `components/lost/ShruggingAno.tsx`
  - `components/explore/NavDirection.tsx`
  - `components/three/boot.ts`, `components/three/frameloop.ts`
  - `components/ui/CountUp.tsx`
  - `components/lab3d/kit/circuit/board-geometry.ts` (moved)
- **Changed:**
  - `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/credits/page.tsx`
  - `app/(explore)/layout.tsx`, `app/(explore)/start/[level]/page.tsx`, `app/(explore)/labs/[lab]/[level]/page.tsx`
  - `components/ui/Frame.tsx`, `BreadcrumbBar.tsx`, `SmoothScroll.tsx`, `SplitHeadline.tsx`
  - `components/explore/LevelCard.tsx`, `PathNode.tsx`, `ExperimentPath.tsx`
  - `components/landing/LabCard.tsx`
  - `components/lab/MissionCard.tsx`, `ResultDock.tsx`, `Inspector.tsx`, `LabExperiment.tsx`
  - `components/three/SiteCanvas.tsx`, `LabObjectView.tsx`
  - `components/ano/AnoView.tsx`, `rig.ts`, `types.ts`
  - `components/landing/DropView.tsx`
  - `components/lab3d/LabStage.tsx`, `scene/VerdictBurst.tsx`, `stages/registry.ts`, `stages/CircuitStage3D.tsx`, `kit/circuit/space.ts`, `kit/circuit/Wire3D.tsx`
  - `lib/tokens.ts`
  - `tests/e2e/flows.spec.ts`
- **Deleted:**
  - `components/chemistry/` (whole folder)
  - `components/robotics/` (whole folder)
  - `components/lab/Fallback2D.tsx`, `components/lab/stages.tsx`

### Gate results (final run, every page)
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 519 passed, 1 skipped |
| G4 Build | Pass | Production build with the design-system flag on |
| G5 Flows | **Pass (9/9)** | Journey; LED and sealed bag, correct and wrong; theory sheet; back navigation and breadcrumbs; carousel arrows, dots and swipe; the preloader; the 404 |
| G6 Console | Pass | No errors, hydration warnings or failed requests in any flow (the 404 document's own 404 is expected and filtered) |
| G7 Hit areas | **Pass on all 29 pages** | 6 to 55 targets per page (the 404 now has 9), none under 44 px, no hit/visible mismatch |
| G8 Accessibility | **Pass** | axe has no serious or critical issues on any page; keyboard and reduced-motion runs pass |
| G9 Visual | Pass | All 29 pages at 1440, 1024 and 390 (87 screenshots plus full-page versions) and the font comparison. Scores below |
| G10 Performance | **Pass** | Apple M1 Pro, ANGLE Metal. 59.9 fps median, p95 ≤ 16.8 ms, no frames over 50 ms on landing (16 draw calls), LED (62; 65 during a run), sealed bag (42; 43 during a run), lab select (21) and design system (16 in view). The same holds on the Low tier with the CPU throttled 4× (a work chunk went from 6 ms to 18–20 ms), idle and during a run |
| G11 AI and voice | Pass (mock) | 30 passed, 1 skipped (real provider). No keys, so 0 of 30 real calls were used in the whole session |
| G12 Licences | Literal fail, documented pass | Unchanged: only `@img/sharp-libvips-darwin-arm64` (LGPL-3.0, Next.js's optional image binary) |

### Rubric (DESIGN.md §12), final
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Landing | 5 | 5 | 5 | 4 | 5 | 5 | 4 |
| Level select | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Lab select | 4 | 5 | 5 | 4 | 5 | 5 | 5 |
| Experiment map | 4 | 4 | 5 | 4 | 5 | 5 | 5 |
| My beliefs | 4 | 4 | 5 | 4 | 4 | 5 | 5 |
| Credits | 4 | 4 | 5 | 4 | 4 | 5 | 5 |
| 404 | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Light the LED, Mass in a sealed bag | 4 | 4 | 4 | 4 | 5 | 5 | 5 |
| Other experiments (19 pages) | 4 | 4 | 4 | 4 | 4 | 4–5 | 5 |
| Design system | 5 | 5 | 5 | 4 | 5 | 5 | 4 |

Every page scores at least 4 on every point. Polish went up on the map and the selection pages, because they now move into each other with morphs instead of cutting.

### Decisions made
- **Morph targets are whole frames** (the next page's rounded frame) for level → lab and lab → map. A card expands into the next page, which reads as DESIGN.md §9's "a level card expands into the next page's background". The map node lands on the mission card, the experiment's own summary of itself.
- **Full prefetch on morph sources only** (level cards, lab cards on lab select, map nodes), so the destination is ready when clicked. Other links keep Next's default partial prefetch.
- **The lab-select page reads its params behind one Suspense boundary for the whole frame** (as the map page already did), so the frame can carry the level's name.
- **The preloader is CSS, not WebGL.** It has to be on screen before the 3D canvas exists, so it's server-rendered and needs no JavaScript to show. The 3D Ano takes over once the page is ready.
- **The preloader counts real signals but never waits more than 3.2 s** (CLAUDE.md §11: "loads … within 3 seconds"). If WebGL is missing, the page still opens.
- **`frameloop` "never" when nothing is on screen**, rather than "demand" with manual invalidation: the views animate constantly while visible, so the only savings are offscreen or hidden.
- **Scroll skew is on the landing only**, the one page with Lenis. It's off with reduced motion and on touch screens.

### Screenshots
`tests/screenshots/round-6/`: every page at 1440, 1024 and 390 (viewport and full page), and `fonts-archivo.png`, `fonts-anton.png`, `fonts-bricolage.png` (also in `round-1/`).

### Suggested commit
See HANDOFF.md "Suggested commits": round 6's files belong to the branch of the feature they change. The new loading and 404 screens are `remake/loading-and-404`.

---

# Session 2: Lusion-level polish (28 October 2026)

The owner asked for a second unattended gauntlet to make the app feel as polished and alive as lusion.co while keeping DESIGN.md's look. GAUNTLET.md's rules, gates and caps apply unchanged (6 rounds at most, 3 fix attempts per gate, one full gate run per round, 30 real AI calls, changed pages only for screenshots until the last round).

## Round 0: setup (session 2)

### Starting state (before any change)
| Item | State |
|---|---|
| Branch | `main` at `291702b`, working tree clean (the first gauntlet's ten branches are all committed) |
| G1 `npx tsc --noEmit` | Pass |
| G2 `npm run lint` | Pass |
| G3 `npx vitest run` | Pass (519 passed, 1 skipped: the real-provider eval) |
| G4 `npm run build` | Pass (with `ANOMALY_DESIGN_SYSTEM=1`) |
| `.env.local` | Still missing, so every AI job runs on its written fallback again |
| `design/reference/landing.png` | **Found.** It was in the owner's `~/Documents/soren-test/` folder, saved as `landing.png ` with a trailing space, which is why the first session's search missed it. Copied to `design/reference/landing.png` |
| Test tools, Playwright config | Already in place from session 1 |

### The polish queue (one item per round)
GAUNTLET.md's own queue was finished in session 1. This session's six rounds follow the owner's list (Lusion's craft, DESIGN.md §8.1, §9, §9.1, §9.2) in the same build-then-gate rhythm:

| Round | Item | Owner's bullet |
|---|---|---|
| p1 | Hero re-matched to the reference image, and one shared motion kit (springs, rolling headlines on every section, cards that tilt, lift and press, one pointer listener for all parallax) | "every element animated with springs and weight", "parallax cards, rolling headlines" |
| p2 | Landing: cursor-reactive 3D shapes and scroll scenes (pinned How it works, parallax belief wall) | "cursor-reactive 3D objects" |
| p3 | Selection pages come alive, and the lab card's camera fly-in | "camera fly-throughs" |
| p4 | The lab as one continuous 3D space: arrival, build, predict and run choreography, a livelier studio | "the whole lab and experiment process in continuous 3D" |
| p5 | Success and ANOMALY moments: VFX and sound on the beat | "satisfying success and ANOMALY moments" |
| p6 | Shared-element transitions, the three quality tiers on every new effect, the full gauntlet on every page, handoff | "smooth shared-element page transitions", "smooth on low-end devices" |

### Decisions made
- **The reference image is now the visual target.** Session 1 scored pages against DESIGN.md's written patterns because the image was missing. From p1, G9 scores the landing against `design/reference/landing.png`, and the other pages against its patterns. The copy in the repo is the same file (775,086 bytes); the owner's original is untouched.
- **New queue, same process.** GAUNTLET.md is left as the owner wrote it; this log records the polish queue above, which maps one to one onto the owner's request.
- **Round names p1–p6.** Screenshots and gate results go to `tests/screenshots/round-p1/` … `round-p6/` and `tests/.results/*-round-p*`, so session 1's `round-1/` … `round-6/` folders stay for comparison.
- **Skills defer to the project files.** pro-design, web-design-guidelines, react-best-practices and react-view-transitions are used for process and audits. Where they disagree with CLAUDE.md, DESIGN.md or GAUNTLET.md (the cream and apricot palette, the round limit, which transition patterns to use), the project files win.
- **A second dev server** again runs on port 3200 with its own build folder (`.next-gauntlet`), so the team's server on :3000 is never touched.

### Needs owner
- Add `.env.local` with the keys in `.env.example` (unchanged from session 1).
- Session 1's open questions in HANDOFF.md still stand, except the reference image (now found).

---

## Round p1: the hero to the reference image, and one motion kit

### Plan
- Re-lay the landing hero to `design/reference/landing.png`: headline straight under the header, the stage card rising from behind the headline, a bigger Ano standing under the gap (antenna in it), the two cards overlapping the stage card's edges, a slim ribbon band, bare carousel dots.
- One motion kit for every DOM spring: one rAF loop and one pointer listener (instead of a window listener per card), real springs with a little overshoot.
- Cards tilt, lift and press on springs with a highlight that follows the cursor; icon buttons get the same magnetic pull as pill buttons.
- Section headings roll up from their masks when they scroll into view; hero cards flip in on a spring when the slide changes.
- Give framed panels a visible edge (they were cream on cream).

### What changed
- **Hero** (`Hero.tsx`, `HeroCards.tsx`, `AnoView.tsx` new `hero` framing, `Ribbon.tsx`, `LowerBand.tsx`, `CarouselControls.tsx`): the composition now follows the reference image. Headline at DESIGN.md §4's size; the stage card starts inside the headline so the words overlap its top corners; Ano fills the card; the Result card overlaps its left edge and the Belief shift card its right edge (pushed out to the frame edges at 1024). The ribbon is a slim band (56–64 px instead of 112–144 px), so pages that padded for it lost that extra space. Dots are bare at rest; hovering lights a 44 px disc the size of the hit area.
- **Motion kit** (`lib/motion-loop.ts` new, `lib/motion.ts`): `animate()`, `Spring`, `stepAll()`, one shared pointer. `useMagnetic`, `useTilt` and `useParallax` now run on springs. `useTilt` also lifts, presses and sets `--tilt-x/-y/-lift` for the `tilt-glare` highlight. Link cards lift 1 px (the shadow does the rest) so their drawn box stays within G7's 2 px of the hit area.
- **Rolling type** (`components/ui/RollingText.tsx` new; `SplitHeadline.tsx`, `SectionHeading.tsx`): `RollingLetters`, `useRollOnView` and `RollingHeading`. The server renders still text; only once mounted, and only if it's below the fold, is it tucked into its masks to wait. Section headings roll in when scrolled to, lean with scroll speed and are balance-wrapped. The final "YOUR · TURN." waits for the scroll too.
- **Cards** (`components/ui/Tilt.tsx` new; `HowItWorks.tsx`, `BeliefWall.tsx`, `LevelsStrip.tsx`, `LabCard.tsx`, `LevelCard.tsx`): every card tilts toward the cursor, lifts and presses down on a spring, with a glare that follows the pointer. CSS transform transitions that fought the springs were removed (`Button.tsx`).
- **IconButton** leans toward the cursor (inner icon only; the hit area never moves).
- **Hero cards** flip up into place on a spring (`card-in`) when the slide changes.
- **Frames and the Meet Ano panel** get a hairline and a warm shadow.
- **Hero type width**: `type-hero` is now `font-stretch: 75%` (was 68%), the wide end of DESIGN.md's 62–75 range, because the reference headline is wider. No headline overflows at 390, 1024 or 1440.
- **Audit (web-design-guidelines)**: section headings now balance-wrap; links, buttons and radios get `touch-action: manipulation` and an apricot tap highlight. Everything else in the changed files passed.
- **Bug fixed (pre-existing, found by G8):** `LabExperiment` re-ran `start()` when saved progress finished loading from IndexedDB, which cleared a prediction the student had already made. A new `seedEvidence` store action now fills in the saved evidence without restarting the attempt.

### Files touched
- New: `lib/motion-loop.ts`, `components/ui/RollingText.tsx`, `components/ui/Tilt.tsx`, `design/reference/landing.png`
- Changed: `app/globals.css`, `lib/motion.ts`, `lib/store.ts`, `components/lab/LabExperiment.tsx`, `components/landing/{Hero,HeroCards,LowerBand,DropControls,SectionHeading,HowItWorks,BeliefWall,LevelsStrip,LabCard,FinalCta}.tsx`, `components/ano/AnoView.tsx`, `components/explore/LevelCard.tsx`, `components/ui/{Button,IconButton,CarouselControls,Frame,Ribbon,SplitHeadline}.tsx`, `components/landing/MeetAno.tsx`, `app/(explore)/{start/page,start/[level]/page,labs/[lab]/[level]/page,beliefs/page}.tsx`, `app/credits/page.tsx`

### Gate results (production build, `GAUNTLET_ROUND=p1`)
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 519 passed, 1 skipped (the real-provider eval) |
| G4 Build | Pass | With `ANOMALY_DESIGN_SYSTEM=1` |
| G5 Flows | Pass (9/9) | Journey; LED and sealed bag, correct and wrong; theory; back and breadcrumbs; carousel arrows, dots and swipe; preloader; 404 |
| G6 Console | Pass | No errors, hydration warnings or failed requests |
| G7 Hit areas | Pass | All 29 pages (7 site pages, the design system and all 21 experiments): nothing off by more than 2 px, nothing under 44 px |
| G8 Accessibility | **Fail, then fixed (attempt 1)** | axe: no serious or critical issues on any page. Reduced motion passed. **The keyboard run failed**: the prediction was cleared before Run (the IndexedDB race above). After the fix, a targeted re-run of the keyboard test on a fresh build passed. That build also held the p2 work in progress, which is why the re-run caught a p2 regression in the reduced-motion test; that one is fixed and gated in p2 |
| G9 Visual | Pass | Scores below |
| G10 Performance | Pass | Apple M1 Pro over Metal. 59.9 fps median, p95 ≤ 16.8 ms, no frame over 50 ms, on landing (16 draw calls), LED (62; 65 running), sealed bag (42; 43 running), lab select (21) and design system (16). Same on the Low tier with 4× CPU throttling (work chunk 6 → 20–21 ms, so the throttle applied); one 33 ms frame during the LED run on Low |
| G11 AI and voice | Pass (mock) | In G3: teacher-quality checks, fallback, verdict guard, cache, limits, voice fallback. No keys, so 0 of 30 real calls used |
| G12 Licences | Literal fail, documented pass | Unchanged: only `@img/sharp-libvips-darwin-arm64` (LGPL-3.0, Next.js's optional image binary) |

### Rubric (DESIGN.md §12)
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Landing | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Level select, lab select, map, My beliefs, credits, 404, design system | as session 1 | as session 1 | 5 | 4 | 4–5 | 5 | 5 |

Landing: side by side with the reference image the composition now matches it (headline under the header, the stage card behind the words, Ano under the gap, cards on the card edges, a slim ribbon, bare dots), with DESIGN.md's more vibrant Sunrise. Clarity went from 4 to 5 because Ano no longer competes with the headline for the middle. Spacing stays 4: the headline sits close under the header at 1440 × 900, as in the reference. The other framed pages now have a visible frame edge.

### Screenshots
`tests/screenshots/round-p1/` (landing, levels, labs, map, beliefs, credits, 404 and design system at 1440/1024/390, plus the font comparison).

### Suggested commit
Branch `remake/hero-reference-and-motion-kit`: "Match the hero to the reference image and add one spring motion kit for cards, buttons and headlines". A second commit on `sustaining/keep-prediction-on-hydrate`: "Keep the student's prediction when saved progress finishes loading".

---

## Round p2: the landing comes alive (cursor-reactive 3D and scroll scenes)

### Plan
- Glossy shapes you can knock around (DESIGN.md §9.1; CLAUDE.md §3.6 "abstract shapes"), floating behind the hero's giant headline and the final call to action: spheres, pills, rings and rounded cubes in the brand colours. The cursor pushes them away on a spring, a fast swipe flings them, a click sends a shock out, and they always drift home. Specular highlights sweep with the mouse.
- How it works as a pinned scroll scene on desktop: the four steps fly in from depth one by one, scrubbed by the scroll through a spring, with a rolling step number and a filling rail.
- The belief wall's three columns drift at different speeds as it scrolls by.
- The lab cards' 3D objects turn as the page scrolls past them.

### What changed
- **Floating shapes** (`components/three/shapes.ts` new: layouts and physics, pure and unit-tested; `components/three/ShapesField.tsx` new: the drei View). One instanced mesh per kind (four draw calls plus a one-pixel depth-clear helper). Views share the canvas's depth buffer, so the field draws first (`index` 0.5) and clears depth in its rectangle afterwards: Ano always draws cleanly on top. The giant headline now sits above the site canvas (`relative z-15`), so shapes pass behind its letters. Shapes scale with the view's aspect, so they never loom on a phone. Phones get 4 shapes, the Low tier 60 % of them with a plain standard material. Reduced motion: they hold still.
- **How it works** (`HowItWorks.tsx`, `useScrollScene.ts` new): pinned for 280 vh on wide screens with a fine pointer. `--p` follows the scroll through a spring; CSS flies each card in over its own quarter of the progress; a soft apricot glow slides behind the current step. React state changes only when the step changes. Phones, reduced motion and no-JS get a plain list (`--p` defaults to 1, everything shown).
- **Belief wall** (`BeliefWall.tsx`, `app/globals.css`): CSS scroll-driven column drift (no JavaScript), desktop only, off with reduced motion.
- **Lab objects** (`LabObjectView.tsx`): yaw and pitch also follow the card's position on screen.
- **Unit tests** (`components/three/shapes.test.ts`): shapes drift near home, get pushed away by the cursor and float back, scatter from a click, and every layout's homes stay in view. 523 tests now.

### Files touched
- New: `components/three/shapes.ts`, `components/three/shapes.test.ts`, `components/three/ShapesField.tsx`, `components/landing/useScrollScene.ts`
- Changed: `components/landing/{Hero,FinalCta,HowItWorks,BeliefWall}.tsx`, `components/three/LabObjectView.tsx`, `app/globals.css`

### Gate results (production build, `GAUNTLET_ROUND=p2`)
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 523 passed, 1 skipped |
| G4 Build | Pass | |
| G5 Flows | Pass (9/9) | |
| G6 Console | Pass | |
| G7 Hit areas | Pass | All 29 pages |
| G8 Accessibility | **Fail, then fixed (attempt 1)** | axe flagged colour contrast on the landing: the new step meter's "/ 04" and the step numbers were `ink-300` on cream (about 2.5:1). Now `ink-500` (about 5.4:1). A targeted re-run of the landing's G7 + G8 and the reduced-motion test on a fresh build passed (axe clean, 28 targets). Keyboard and reduced motion passed in the full run |
| G9 Visual | Pass | Scores below |
| G10 Performance | Pass | Apple M1 Pro over Metal. Landing 21 draw calls (was 16: the shape field adds 5), 59.9 fps, p95 16.8 ms, no frame over 50 ms; the same on the Low tier with 4× CPU throttling. LED 62/65, sealed bag 42/43, lab select 21, design system 16, all 59.9 fps normal and throttled |
| G11 AI and voice | Pass (mock) | 0 of 30 real calls used |
| G12 Licences | Literal fail, documented pass | No new packages |

### Two bugs found while gating (fixed this round)
- **A whole-page wipe right after the landing loaded.** Loading the shapes through `next/dynamic` put a Suspense boundary inside the landing's `<ViewTransition default="sunrise-wipe">`; when the chunk resolved, React ran the wipe over the whole page. The shapes are now imported directly (three.js is already in that bundle through `AnoView`), and in p3 the page wrappers stop using `default` at all.
- **Reduced motion still played the 760 ms wipe (from session 1).** `::view-transition-new(.sunrise-wipe)` outranked the reduced-motion `(*)` rule. The reduced-motion block now names `.sunrise-wipe`, `.morph` and the nav-back variant, so it really is a 160 ms fade.

### Rubric (DESIGN.md §12)
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Landing | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Lab select | 4 | 5 | 5 | 4 | 5 | 5 | 5 |

Landing: the reference's composition with Lusion's signature move, glossy shapes behind the giant type that scatter from the cursor. Text never sits on a shape at reading size (the headline is above the canvas; cards and the lower band are above it too). After scoring, one ring that brushed the "Powered by Ano" meta line moved off the right edge. Lab select is unchanged apart from the scroll turn.

### Screenshots
`tests/screenshots/round-p2/` (landing and lab select at 1440/1024/390).

### Suggested commit
Branch `remake/landing-alive`: "Add knock-around glossy shapes behind the hero and final call to action, a pinned How it works scene and parallax belief columns". A second commit on `sustaining/view-transition-fixes`: "Stop in-page wipes on the landing and make reduced motion a real fade".

---

## Round p3: the selection pages come alive, and the lab-card dive

### Plan
- Level and lab select get glossy shapes behind their headlines (only over the band above the cards, which sit below the site canvas).
- Above-the-fold cards spring up one after another, instead of arriving still with the page wipe (the scroll-driven reveal never played for cards already in view).
- A lab card dives in: a plain click flies the camera into its 3D object for a beat, the other card falls back, then the morph into the map plays (DESIGN.md §7.3 "the card expands and the camera flies in").
- The map's path draws itself and its nodes spring in; playable nodes tilt. My beliefs cards spring in and replay on each filter change.
- Page-level `<ViewTransition>`s stop using `default` (the react-view-transitions lesson from p2's bug), so only real page changes wipe.

### What changed
- **Page wrappers** (`app/page.tsx`, `app/credits/page.tsx`, `app/not-found.tsx`): `enter`/`exit="sunrise-wipe"` with `default="none"`. The explore layout keeps `default`, because navigation inside it arrives as an update of that persistent wrapper; so My beliefs' filter animates by re-keying, not with a transition.
- **Level select** (`app/(explore)/start/page.tsx`): a new `explore` shapes layout behind the headline (right side; the left stays clear for Ano's bubble). The headline and the bubble sit above the canvas. The three cards spring up 110 ms apart.
- **Level cards** (`LevelCard.tsx`): a new `tilt-layer` utility gives depth inside the card. The numeral shifts against the tilt and the glass panel slightly with it, scaled by the lift spring so they settle back.
- **Lab select** (`app/(explore)/start/[level]/page.tsx`, `LabCard.tsx`, `LabObjectView.tsx`): the same shapes and entrance, plus `dive`. On a plain click or Enter, the card marks itself `data-diving`; its 3D object springs to 1.45× with a quick turn while the other card falls back to 40 % opacity; after 260 ms the router pushes the map, and the card morphs into the map's frame. Modifier and middle clicks and reduced motion navigate at once.
- **Map** (`ExperimentPath.tsx`, `PathNode.tsx`): a mask with `pathLength=1` draws the dotted path from the first node down over 1.6 s; the nodes spring in 90 ms apart; playable nodes tilt inside their (still) links.
- **My beliefs** (`BeliefGrid.tsx`): cards spring in 55 ms apart, again after every filter change (the list is keyed by the filter), and tilt toward the cursor.

### Files touched
`app/page.tsx`, `app/credits/page.tsx`, `app/not-found.tsx`, `app/(explore)/start/page.tsx`, `app/(explore)/start/[level]/page.tsx`, `app/globals.css`, `components/landing/LabCard.tsx`, `components/three/{LabObjectView.tsx,shapes.ts}`, `components/explore/{ExperimentPath,PathNode,BeliefGrid,LevelCard}.tsx`

### Gate results (production build, `GAUNTLET_ROUND=p3`)
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 523 passed, 1 skipped |
| G4 Build | Pass | |
| G5 Flows | Pass (9/9) | The journey's lab-card click now goes through the dive, and passes |
| G6 Console | Pass | |
| G7 Hit areas | Pass | All 29 pages; tilting map nodes keep their drawn box within 2 px of the link |
| G8 Accessibility | Pass | axe clean on all pages; keyboard and reduced motion pass |
| G9 Visual | **Pass after 1 fix** | At 390 px the level and lab select shapes band (46 % / 42 % of a tall phone frame) reached into the first card, so shapes drew over it. The band is now capped at 30 rem; re-shot on the dev server, the shapes stay above the cards |
| G10 Performance | Pass | Lab select 26 draw calls (21 + the shape field), 59.9 fps, p95 16.7 ms; the same on the Low tier with 4× throttling. Landing 21, LED 62/65, sealed bag 42/43, design system 16, all 59.9 fps (one 33 ms frame in the LED run on Low, as in p1) |
| G11 AI and voice | Pass (mock) | 0 of 30 real calls used |
| G12 Licences | Literal fail, documented pass | No new packages |

67 passed, 0 failed, 1 skipped (the font comparison: the design system didn't change).

### Rubric (DESIGN.md §12)
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Level select | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Lab select | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Experiment map | 4 | 4 | 5 | 4 | 5 | 5 | 5 |
| My beliefs | 4 | 4 | 5 | 4 | 5 | 5 | 5 |
| Landing, credits, 404 | as p2 / session 1 | | | | | | |

Lab select's pattern score rose to 5: the shapes and the frame edge make it read like the hero. My beliefs' polish rose to 5 (cards spring in and tilt). The map stays at 4 for vibrancy (most nodes are locked cream on a fresh device).

### Decisions made
- **Dive length 260 ms** before navigating, then the 680 ms morph: about 0.95 s in all, at the top of DESIGN.md §9's 600–900 ms. The dive is the "camera flies in"; the morph is the card expanding into the next page.
- **Shapes only over the headline band** on the selection pages, because their cards sit below the site canvas and a shape must never cover a card.

### Screenshots
`tests/screenshots/round-p3/` (levels, labs, map, beliefs, landing, credits and 404 at 1440/1024/390).

### Suggested commits
Branch `remake/selection-pages-alive`: "Make the selection pages spring in, dive into a lab card and draw the map path". The page-wrapper change goes with p2's `sustaining/view-transition-fixes`.

---

## Round p4: the lab as one living 3D space

### Plan
- The HUD arrives instead of appearing: the inspector springs in from the right, the dock and Ano's bubble rise from below, each on its own beat. The mission card is left alone because it arrives by morphing from the map node.
- Life in the bright studio (DESIGN.md §8.1 "dust in light beams", CLAUDE.md §3.6 "blinking status lights … never clutter"): dust motes in the lab's colours rising through the light, a lit bench edge in the lab tint, and two status lights on the plinth that breathe while you build, blink fast while it runs and settle green or red with the verdict.
- Try floating shapes far behind the bench too, as on the landing.

### What changed
- **HUD arrival** (`LabExperiment.tsx`, `app/globals.css`): new `hud-right` and `hud-up` spring keyframes. Inspector 380 ms, dock 460 ms, Ano's bubble 560 ms. Ano (measured into the gap above the bubble) rides up with it. Reduced motion: none.
- **Studio life** (`components/lab3d/scene/StudioLife.tsx` new, wired into `LabScene.tsx`):
  - Dust: one `Points` draw, 150 motes on High and 90 on Medium (`particleScale`), none on Low; a fixed even spread, no randomness at render time.
  - The bench nose: one strip.
  - Status lights: two small emissive spheres following `phase` and `verdict`.
  - All mutation goes through refs (the React Compiler lint forbids mutating state values in `useFrame`).
- **Shape meshes shared** (`components/three/shape-meshes.ts` new): the shapes' geometry and per-tier material, out of `ShapesField.tsx`.
- **Mute toggle (early p5 work, in this build):** `components/ui/SoundToggle.tsx` new, in `SiteHeader.tsx` and `ExploreBar.tsx`. CLAUDE.md §3.1 asks for a visible mute toggle and none existed. One shared state; remembered per browser with every storage access guarded; the first render matches the server; a constant name "Mute sound" with `aria-pressed`.

### Files touched
- New: `components/lab3d/scene/StudioLife.tsx`, `components/three/shape-meshes.ts`, `components/ui/SoundToggle.tsx`
- Changed: `components/lab3d/scene/LabScene.tsx`, `components/lab/LabExperiment.tsx`, `components/three/ShapesField.tsx`, `components/ui/SiteHeader.tsx`, `components/explore/ExploreBar.tsx`, `app/globals.css`, `lib/sound.ts` (the p5 sound functions were added here too, but nothing called them in this build)

### Gate results (production build, `GAUNTLET_ROUND=p4`)
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 523 passed, 1 skipped |
| G4 Build | Pass | |
| G5 Flows | Pass (9/9) | |
| G6 Console | Pass | |
| G7 Hit areas | Pass | All 29 pages; the new toggle is a 48 px icon button |
| G8 Accessibility | Pass | axe clean everywhere; keyboard and reduced motion pass |
| G9 Visual | Pass | All 21 experiments, landing and level select at 3 widths; scores below |
| G10 Performance | Pass | LED 66 draw calls (69 running), sealed bag 44 (45), up 4 for the dust, strip and lights. 59.9 fps, p95 ≤ 16.8 ms, no frame over 50 ms, normal and on the Low tier with 4× throttling. Landing 21, lab select 26, design system 16 |
| G11 AI and voice | Pass (mock) | 0 of 30 real calls used |
| G12 Licences | Literal fail, documented pass | No new packages |

115 passed, 0 failed, 1 skipped (the font comparison).

### Rubric (DESIGN.md §12)
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Light the LED, Mass in a sealed bag | 4 | 4 | 4 | 4 | 5 | 5 | 5 |
| Other experiments (19 pages) | 4 | 4 | 4 | 4 | 5 | 5 | 5 |

Polish on the 19 other experiments went from 4 to 5 (the HUD arrives on springs, the studio breathes); consistency to 5 everywhere because every lab now shares the same living studio. Type stays 4 on purpose (small headings inside labs; CLAUDE.md §2.6 clarity first). At 390 px the breadcrumb row truncates long titles with an ellipsis; that row sits on its own line, unchanged by the toggle.

### Decisions made
- **No floating shapes in the labs.** Tried and dropped: every stage frames its own camera shots, so world-placed shapes landed in the HUD's corners, huge on the closer shots (reaction speed). Dust and the lights give the life without competing with the experiment (CLAUDE.md §2.6).
- **The bench strip uses normal blending**, not additive (additive washes out on cream, DESIGN.md §8).
- **The UI's whoosh and spin-up sounds have no captions**, like the existing button click: they're feedback on the student's own action, not information. Every sound that carries meaning (verdict chime, glitch sting, spark, LED pop, level complete) keeps its caption.

### Screenshots
`tests/screenshots/round-p4/` (all 21 experiments, landing and level select at 1440/1024/390).

### Suggested commit
Branch `remake/lab-studio-life`: "Bring the lab studio to life with dust, bench lights and a HUD that springs in". The toggle goes with p5's sound commit.

---

## Round p5: success and ANOMALY moments, with sound on the beat

### Plan
- Land the sounds on the animation beats (DESIGN.md §9.1): a rising pluck as each letter of "NAILED IT." (or its variation) settles; for ANOMALY, a stutter through the 360 ms freeze and a low slam exactly when "ANOMALY." lands.
- Use the screen-space VFX layer in the lab (it was only used on the landing): a burst of light from the check as it pops; shards and a small HUD shake as the ANOMALY word slams in; a Win-coloured bloom behind the success word.
- Tactile sound on the moves: a spin-up under the Run click, a soft whoosh on every dive or morph (lab card, level card, map node).
- The visible mute toggle (CLAUDE.md §3.1); it shipped in p4's build.

### What changed
- **Sound** (`lib/sound.ts`): `letterPluck` (C-major pentatonic from C6, schedulable), `glitchStutter(slamAt)`, `whoosh`, `spinUp` and `isMuted`. All Web Audio synthesis, as before: no files, nothing plays before the first gesture.
- **The moments** (`VerdictMoment.tsx`):
  - Shared timing constants. A letter lands 430 ms after its own delay (45 ms per letter); "ANOMALY." lands at the slam keyframe's 60 % mark, 310 ms.
  - Correct: `fx.success` from the check, one pluck per non-space letter on its landing beat, and a radial verify → volt bloom.
  - ANOMALY: at 310 ms, `fx.anomaly` shards and `fx.shake` on the HUD (`data-lab-hud`).
  - Reduced motion: no bloom, no shards and no shake; the sounds and captions stay.
- **Run** (`useRun.ts`): `spinUp` under the click. The lab's ANOMALY sting is now `glitchStutter` timed to the slam (the landing teaser keeps the old sting). The captions are unchanged.
- **Whoosh** on the lab-card dive, level cards and map nodes. `PathNode.tsx` is now explicitly a client component, since it has a click handler.
- **G10 samples the Medium tier too** (`tests/e2e/perf.spec.ts`): every target is now measured on High, Medium, and Low with 4× CPU throttling (DESIGN.md §9.2 names all three).

### Files touched
`lib/sound.ts`, `components/lab/{VerdictMoment,useRun,LabExperiment}.tsx`, `components/landing/LabCard.tsx`, `components/explore/{LevelCard,PathNode}.tsx`, `app/globals.css`, `tests/e2e/perf.spec.ts`

### Gate results (production build, `GAUNTLET_ROUND=p5`)
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | |
| G2 Lint | Pass | |
| G3 Unit | Pass | 523 passed, 1 skipped |
| G4 Build | Pass | |
| G5 Flows | Pass (9/9) | The LED and sealed-bag flows play both moments (correct and wrong) |
| G6 Console | Pass | |
| G7 Hit areas | Pass | All 29 pages |
| G8 Accessibility | Pass | axe clean; keyboard and reduced motion pass |
| G9 Visual | Pass | LED and sealed bag at 3 widths, plus filmed moments on the dev server (scratchpad): the success burst, rings, confetti, assembling "SPOT ON." and bloom; the ANOMALY freeze, RGB split, slam, broken ring and shake |
| G10 Performance | Pass | High, Medium and Low/4× all at 59.9 fps, p95 ≤ 16.8 ms, no frame over 50 ms: landing 21 draw calls, LED 66 (69 running), sealed bag 44 (45), lab select 26, design system 16 |
| G11 AI and voice | Pass (mock) | 0 of 30 real calls used |
| G12 Licences | Literal fail, documented pass | No new packages |

52 passed, 0 failed, 1 skipped (the font comparison).

### Rubric (DESIGN.md §12)
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Light the LED, Mass in a sealed bag | 4 | 5 | 4 | 4 | 5 | 5 | 5 |

Vibrancy rose to 5 on the two demo labs: the moments now carry the Win and Glitch ramps across the whole screen (bloom, burst, shards) without ever sitting under body text.

### Suggested commit
Branch `remake/moments-on-the-beat`: "Land the verdict moments' sound and screen effects on the animation beats, and add a mute toggle" (with p4's `components/ui/SoundToggle.tsx`, `SiteHeader.tsx` and `ExploreBar.tsx`).

---

## Round p6: transitions, tiers and the final pass

### Plan
- Transitions: morphing cards lift slightly mid-flight. Since p3 the page wrappers only wipe on real page changes, and the dives play a whoosh.
- Tiers: confirm every new effect respects High / Medium / Low. G10 measures all three since p5. With reduced motion, the bench lights hold a steady glow.
- Check what no gate covered: the landing's "Which falls faster?" teaser in the re-laid hero.
- The full gauntlet on every page, then the handoff.

### What changed
- **Morph lift** (`app/globals.css`): `morph-soften` now also scales the image pair to 1.025 at 40 %, so a card visibly rises as it travels into the next page. It's off with reduced motion: the reduced-motion block cancels image-pair animations.
- **Steady status lights** with reduced motion (`StudioLife.tsx`).
- **Bug: the teaser's verdict headline overflowed** (from p1's wider hero type). "ANOMALY DETECTED." ran off the right edge at 1440 px, and "WHICH FALLS" wrapped. `Hero.tsx` now sizes the teaser headline at `clamp(3rem, 6.2vw, 6.6rem)` with a 24 vw gap; it fits at 1440 and 1024.
- **A new G5 flow** (`tests/e2e/flows.spec.ts`): open the teaser, guess wrong (ANOMALY DETECTED.), drop again, guess right (NAILED IT.), and check every letter of the visible headline stays inside the viewport both times. CLAUDE.md §11 lists this teaser for Demo Day, and no flow covered it.
- **Correction to this log:** rounds p1–p5 said "All 30 pages" for G7. The gauntlet has **29** pages: landing, level select, lab select, map, My beliefs, credits, 404, the design system, and the 21 experiments. The 30th result file was the reduced-motion check. Fixed above; no result changes.

### Tier check (what each new effect does per tier)
| Effect | High | Medium | Low | Reduced motion |
|---|---|---|---|---|
| Floating shapes | All, glossy clearcoat + iridescence | All, no iridescence | 60 %, standard material | Still |
| Studio dust | 150 motes | 90 | None | Still |
| Bench lights | Breathe / blink | Same | Same | Steady glow |
| DOM springs (tilt, magnetic, parallax) | On (fine pointer) | On | On | Off |
| Glass blur | On | On | Off (solid fill, session 1) | — |
| Pinned scroll scene | Wide + fine pointer | Same | Same | Plain list |

### Gate results (final run, every page, production build, `GAUNTLET_ROUND=p6`, `GAUNTLET_CHANGED=all`)
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | `npx tsc --noEmit` |
| G2 Lint | Pass | `npm run lint` |
| G3 Unit | Pass | 523 passed, 1 skipped (the real-provider eval) |
| G4 Build | Pass | With `ANOMALY_DESIGN_SYSTEM=1` |
| G5 Flows | Pass (10/10) | Journey (with the lab-card dive); LED and sealed bag, correct and wrong; theory sheet; back navigation and breadcrumbs; carousel arrows, dots and swipe; preloader; 404; **the hero teaser (new)** |
| G6 Console | Pass | No errors, hydration warnings or failed requests. The only warning is three's `THREE.Clock` deprecation, raised inside R3F |
| G7 Hit areas | Pass | All 29 pages, 7 to 56 targets each; nothing off by more than 2 px, nothing under 44 px |
| G8 Accessibility | Pass | axe: no serious or critical issues on any page. The keyboard-only LED run passes. Reduced motion: 0 animations left running on the landing, and a run completes |
| G9 Visual | Pass | All 29 pages at 1440, 1024 and 390 (177 files with full-page versions and the font comparison); scores below |
| G10 Performance | Pass | Apple M1 Pro, ANGLE Metal. 59.9 fps median, p95 ≤ 16.8 ms, no frame over 50 ms, on High, Medium and Low with 4× CPU throttling (a work chunk went 6 → 20–21 ms, so the throttle applied), idle and during a run. Draw calls: landing 21, LED 66 (69 running), sealed bag 44 (45), lab select 26, design system 16. All far under 150 |
| G11 AI and voice | Pass (mock) | Teacher-quality checks, written-hint fallback, verdict guard, cache, limits, voice fallback. No keys, so 0 of 30 real calls used in the whole session |
| G12 Licences | Literal fail, documented pass | Unchanged: only `@img/sharp-libvips-darwin-arm64` (LGPL-3.0, Next.js's optional image binary). No packages were added this session |

135 passed, 0 failed, 0 skipped.

### Rubric (DESIGN.md §12), final
| Page | Pattern | Vibrancy | Type | Spacing | Polish | Consistency | Clarity |
|---|---|---|---|---|---|---|---|
| Landing | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Level select | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Lab select | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Experiment map | 4 | 4 | 5 | 4 | 5 | 5 | 5 |
| My beliefs | 4 | 4 | 5 | 4 | 5 | 5 | 5 |
| Credits | 4 | 4 | 5 | 4 | 4 | 5 | 5 |
| 404 | 5 | 5 | 5 | 4 | 5 | 5 | 5 |
| Light the LED, Mass in a sealed bag | 4 | 5 | 4 | 4 | 5 | 5 | 5 |
| Other experiments (19 pages) | 4 | 4 | 4 | 4 | 5 | 5 | 5 |
| Design system (dev only) | 5 | 5 | 5 | 4 | 5 | 5 | 4 |

Every page scores at least 4 on every point. Compared with session 1:
- The landing's clarity rose to 5 (Ano no longer competes with the headline).
- Lab select's pattern score rose to 5.
- Polish rose to 5 on My beliefs and on all 19 other experiments.
- The two demo labs reached 5 for vibrancy.
- Every experiment reached 5 for consistency.

Spacing stays 4 across the board: the headline sits close under the header, as in the reference.

### Decisions made
- **Stopped at six rounds** (GAUNTLET.md's cap), with every gate green in the final run.
- **No new packages this session.** DESIGN.md §8.1 suggests three.quarks, Theatre.js and `@react-spring/three`. Session 1's own pooled VFX, spring cameras and the new `lib/motion-loop.ts` springs cover every effect here at 60 fps with 4× throttling, so nothing was added (G12 unchanged).
- **The design system's pattern demo** (dev-only `/design-system`) still shows session 1's hero composition. It's a component gallery, not the landing, so it was left; noted in the handoff.

### Screenshots
`tests/screenshots/round-p6/`: every page at 1440, 1024 and 390 (viewport and full page), plus `fonts-{archivo,anton,bricolage}.png`.

### Suggested commits
See HANDOFF.md "Suggested commits". The teaser fix and its test go on `sustaining/hero-teaser-fit`; the morph lift and steady lights go with p4's and p3's branches.

---

# Session 3: anti-slop pass and component libraries (28 October 2026)

The owner's brief for this session: bring ANOMALY up to the updated DESIGN.md, with section 0 (anti-slop bans) as a hard rule over everything. Use three component libraries (animmasterlib.dev, ui.aceternity.com, skiper-ui.com) as the main source of animated UI, with a Lead, Builder and Critic loop. The limits are at most 10 iterations, one sub-task each, no engine changes, no edits to tests to make them pass, and read-only git. Iterations are named i1–i10, and their screenshots go in `tests/screenshots/round-iN/`.

## Iteration 0: setup and audit (Lead)

### Starting state
| Item | State |
|---|---|
| Branch | `main` at `291702b`. Session 2's work (55 files) is still uncommitted, and this session builds on it |
| Last full gate run | Session 2 p6: 135 browser tests passed, G1–G4 and G7–G10 pass, G11 mock only, G12 documented exception |
| `.env.local` | Still missing. AI jobs run on their written fallbacks |
| DESIGN.md / GAUNTLET.md in the repo | **Out of date.** Neither has section 0 or G13. The owner's newer copies (28 Oct, 07:27) are in `~/Documents/soren-test/` |

### Docs synced
The brief cites DESIGN.md section 0 and gate G13, which exist only in the owner's newer copies. I copied `~/Documents/soren-test/DESIGN.md` and `GAUNTLET.md` over the repo copies unchanged; `git diff` shows the change. See "Decisions made", item 1.

### G13 scanner
I added `scripts/slop-scan.mjs` (`npm run slop`). It scans `app/`, `components/`, `content/` and `lib/` for every pattern GAUNTLET.md G13 lists:
- icon-pack imports;
- emoji;
- em dashes outside comments;
- banned fonts;
- `backdrop-filter`;
- radial or conic gradients;
- dot and grid patterns;
- sparkles;
- iridescence;
- gradients that mix two hue families;
- "not just" and "it's not X, it's Y" copy;
- the banned words;
- hard-coded prediction or reality values in the hero's content.

Comments are skipped. A functional hit stays only with a `slop-ok: <reason>` note, and the report lists each one with its reason. The screenshot half of G13 (bento grids, three-card rows, fake terminals, orbs, dot grids) is checked by the Critic on every page it reviews.

**Baseline: 141 hits.**

| Rule | Hits |
|---|---|
| Icon-pack imports (Lucide) | 31 files |
| Banned fonts (Geist) | 27 |
| Banned words (mostly the `unlockAudio` identifier and "Unlocks" in copy) | 27 |
| Radial gradients (the Sunrise orbs, sheens, the win bloom) | 22 |
| Multi-hue gradients (ribbon, Chem, Robo, levels, Win, Glitch, sheen) | 10 |
| Sparkles | 6 |
| Glass blur | 4 |
| Iridescence | 4 |
| Fake demo data (hero cards) | 4 |
| "Not just" or "isn't X, it's Y" copy | 3 |
| Em dashes | 2 |
| Repeating-gradient pattern | 1 |

The visual audit (session 2's p6 screenshots against the new section 0) adds these:
- the How it works scene (four step cards);
- the belief wall (a grid);
- the levels strip (three cards);
- the level select (three tall cards);
- the My beliefs grid;
- glass HUD panels.

### Component libraries: sites opened and licences read
All three sites were opened: their home pages, licence and terms pages through web access, and Skiper's component index rendered in headless Chromium.

| Library | What's free | Licence or terms (read 28 Oct 2026) | Allowed in this MIT repo? |
|---|---|---|---|
| **animmasterlib.dev** | Nothing. 300 components sold as a paid pack ($4.99 / $8), delivered through Google Drive. The site says they were "rebuilt with clean code" from popular sites | Terms of Service: "non-exclusive, non-transferable license"; may not "Resell or redistribute the library or its source files"; all code remains "the intellectual property of Animmaster Lib" | **No.** It isn't free (I can't buy anything), and the source can't be redistributed in a public MIT repo |
| **ui.aceternity.com** | About 100 free components (copy and paste) plus paid blocks and templates | "Aceternity License", which covers every item "available for purchase or download". It allows end products, but "You cannot re-distribute the Item as a stock image or its source files, regardless of modifications" | **No.** It's a custom licence, not MIT/Apache/BSD/ISC/CC0 (CLAUDE.md §2 rule 8), and committing its source to our MIT repo redistributes the source files |
| **skiper-ui.com** | About 40 free components: carousels, card stacks, animated number, text roll navigation, music toggle, mouse-follow and others | Quick start: "Free to use and modify in both personal and commercial projects. Attribution to Skiper UI is required when using the free version." The author also writes "I don't claim to be the original creator." The site's Terms of Service separately say "You must not: … Reproduce, duplicate or copy material from skiper-ui.com" | **Not confirmed.** It's a custom attribution licence that isn't on CLAUDE.md's list, the site's own terms contradict it, and the author disclaims original creation. CLAUDE.md says "if unsure of a licence, stop and ask", so this goes to the owner |

**Outcome:** none of the three libraries' code can be copied under CLAUDE.md §2 rule 8. Following the brief's own exception ("components … whose licence doesn't allow our use. Never use those … build our own"), every component this session is **an original implementation of a pattern studied on these sites**. This is the same "study, then write our own code" rule CLAUDE.md applies to GPL code. Each pattern, its source and its licence status is credited in RESOURCES.md and the README. If the owner clears Skiper's free licence, or buys a licence, the originals can replace ours (see "Needs owner").

### Shortlist: patterns to take from each library, where and why
The banned patterns weren't shortlisted: Aceternity's aurora, beams, sparkles, lamp, meteors, bento grid, grid and dot backgrounds, liquid glass, terminal and code block, colourful text and moving or glowing borders.

| Library | Pattern | Where it goes in ANOMALY | Why |
|---|---|---|---|
| Aceternity | Sticky scroll reveal | How it works: one pinned scene where the real LED experiment plays as one caption changes at a time | DESIGN §7.1 item 1 asks for one live sequence, not a card row |
| Aceternity | Card stack, draggable card | Belief deck | DESIGN §7.1 item 4 asks for one card at a time that you can flick |
| Aceternity | Container text flip | The level name and grade range changing as the dial turns | Shows one card that changes instead of three |
| Aceternity | Following pointer | Soft custom cursor that grows over controls | DESIGN §9.1 "Cursor" |
| Aceternity | Text generate effect | Ano's speech bubble lines appearing word by word | Ano feels alive; one idea at a time |
| Aceternity | Stateful button | Lab Run pill: Run → running → result | A press with a visible consequence |
| Skiper | Card swipe carousel, card stack scroll | Belief deck gestures (drag, fling, arrows) | Swipe physics for the deck |
| Skiper | Animated number | Experiment counts on the level dial; lab readouts | DESIGN §9.1 "Numbers count up and down smoothly" |
| Skiper | Text roll navigation | Header and footer nav links | Rolling type is the headline language, scaled down to UI |
| Skiper | Music toggle btn | Sound toggle (equaliser bars that settle when muted) | A clearer state than swapping icons |
| Skiper | Scroll progress 001 | How it works step meter | Shows how far the sequence has gone |
| Skiper | Mouse follow animations | Cursor trail (DESIGN §9.1 "leaves a tiny trail") | Pairs with Aceternity's following pointer |
| Animmaster | (paid, no free component to study beyond the public previews) | Nothing specific | Logged; our own builds cover its categories |

### Sub-task list (ordered by impact; one per iteration)
| # | Track | Sub-task | Library patterns |
|---|---|---|---|
| i1 | Slop removal | **Our icon set** (DESIGN §5.1): about 26 solid, notched icons in `components/icons/`; replace every Lucide import (31 files) and both Sparkles uses; uninstall `lucide-react` | None |
| i2 | Design system, slop removal | **Paper, not glass:** Schibsted Grotesk + Martian Mono; a paper background with grain in place of the Sunrise orbs; a paper card in place of the glass card; one-hue gradients (ribbon, Chem, Robo, levels, Win, Glitch); primary button hover per §5; no radial sheens; two-colour confetti; no iridescence; one bounce light per lab; `/design-system` updated | None |
| i3 | Slop removal, Landing | **Copy and real data:** em dashes, banned words (identifiers too), "isn't X, it's Y" copy; the hero cards fed by the simulator (the drop sim, the circuit solver, the sealed-bag model) instead of hard-coded values | Skiper animated number (the card values) |
| i4 | Landing | **How it works as one live sequence:** the pinned scroll scene plays the real LED experiment through Predict, Diagnose, Break, Rebuild, one caption at a time | Aceternity sticky scroll reveal; Skiper scroll progress |
| i5 | Landing | **Labs on an ink colour block, and the Belief deck** (flick through, drag or arrows) | Aceternity card stack and draggable card; Skiper card swipe carousel |
| i6 | Selection pages, Landing, Ano | **Level dial:** grade 6 to 12 on `/start` (one big card that changes) and on the landing, in place of the three-card rows; Ano reacts | Aceternity container text flip; Skiper animated number |
| i7 | Selection pages | **My beliefs** as a single grouped column; a slop pass on lab select and the map | None |
| i8 | Component integration, Transitions | **Cursor, nav and sound toggle:** soft cursor with a trail, text-roll nav links, equaliser sound toggle, Ano's line reveal | Aceternity following pointer and text generate; Skiper mouse follow, text roll nav, music toggle |
| i9 | Experiment / 3D lab | **Lab HUD:** paper panels check, stateful Run pill, rolling readouts, verdict moment in one hue | Aceternity stateful button; Skiper animated number |
| i10 | Performance, final | **Tiers check and the full gauntlet on every page** (G1–G13, screenshots at 1440, 1024 and 390, the Critic on every page), then the handoff | None |

### Loop rules for this session
- **Lead:** picks the next sub-task in the order above.
- **Builder:** implements it and runs the targeted checks.
- **Full gate run:** G1–G13 once per iteration, with screenshots of the changed pages.
- **Critic:** a fresh-context sub-agent compares the 1440 and 390 screenshots against the reference image, the rubric (8 points, including No slop), section 2B and the gate results. It returns PASS or the single largest gap. A gap gets up to 3 fix attempts in the same iteration (GAUNTLET's per-gate cap), each followed by targeted checks and a fresh Critic. If it still fails, it's logged and the loop moves on.

### Decisions made (session 3, added to as the loop runs)
1. **Docs synced from the owner's newer copies.** The brief depends on DESIGN.md section 0 and G13, which only the owner's 28 October copies contain, so I copied them in unchanged. The alternative was rebuilding the bans from the brief's short list, but the owner's own table is more complete (it adds em dashes, fonts, slop copy, fake demos and banned words). Suggested commit: `claude-align-md`.
2. **Library code is studied, not copied.** No library licence is on CLAUDE.md's allowed list (above). The brief says not to use a component whose licence doesn't allow our use, and to build our own instead, and CLAUDE.md treats unclear licences the same way. So every pattern is an original implementation, credited as "pattern studied on …". The alternative was copying Skiper's free components with attribution, but its terms contradict each other and its author disclaims authorship, so that call is the owner's.
3. **Iterations are named i1–i10,** and screenshots go in `tests/screenshots/round-iN/`, so they don't overwrite session 1 (`round-1`…`6`) or session 2 (`round-p1`…`p6`).
4. **The 10-iteration cap replaces GAUNTLET.md's 6 rounds for this session** (the brief's newer limit). The other GAUNTLET caps still apply: 3 fix attempts per gate, one full gate run per iteration, and 30 real AI calls.
5. **The rim light follows the scene's hue.** DESIGN.md §8 asks for a cool volt rim, but on apricot objects it reads as an iridescent lilac edge, and §0 bans that ("overrides anything else in this file"). Chemistry and the landing now get a warm white rim; Robotics keeps the volt rim and bounce.
6. **Hero scenarios name a guess, not a result.** Each featured slide stores the experiment, the edits and the student's guess (`run.guess`). Everything shown as Reality, its number, the verdict and the belief's title is engine output. The guess and the confidence chip are the scenario's inputs, like a student's click.
7. **Fix attempts are gated in the next iteration's full run.** One full gate run per iteration is the cap, so a Critic's fix ships in the next run's build and is re-judged by a fresh Critic on those screenshots. Targeted checks (tsc, lint, unit, scan and a dev-server look) run as soon as the fix is made.

## Iteration i1: our own icon set (Slop removal)

### Plan
- Draw the icon set DESIGN.md §5.1 asks for in `components/icons/`: solid shapes on a 24 px grid, one rounded notch, ink with an optional apricot second tone, corners softened by a hairline stroke in the same colour.
- Swap all 31 Lucide imports with a one-off codemod. Lucide-only props (`strokeWidth`, `fill`) are dropped. The two Sparkles uses become Target ("How it works") and Hint (Ano's suggested change).
- Give icon buttons the apricot second tone, and show the whole set on `/design-system`.
- Uninstall `lucide-react` and remove it from the README and RESOURCES.

### What changed
- **33 icons:**
  - arrows (left, right, up-right);
  - play, pause, rewind, step;
  - speaker on and off;
  - close (and cross), check;
  - flask, bolt, robot, map, book, hint, settings, restart, zoom, menu, lock, home, target, scan, break, blocks, molecule, ask, flag, levels, shield.

  The settings gear is generated from its teeth so it lines up on the grid. Shapes with holes skip the softening stroke so the holes keep their size.
- Every Lucide import is replaced, and `LucideIcon` became our `Icon` type. The 2 px icon-stroke overrides on icon buttons and info chips are gone, and icon buttons now set `--icon-tone` to apricot-500.
- `lucide-react` is uninstalled (`npm uninstall`), and the README credit and RESOURCES row are updated.
- Added `scripts/slop-scan.mjs` and `npm run slop` (G13).

**Files:**
- `components/icons/Svg.tsx`, `components/icons/icons.tsx`, `components/design-system/IconsDemo.tsx` (new)
- `app/design-system/page.tsx`, `app/not-found.tsx`
- 29 component files (every former Lucide importer)
- `components/ui/IconButton.tsx`, `components/ui/InfoChipCard.tsx`
- `package.json`, `package-lock.json`, `README.md`, `RESOURCES.md`
- `scripts/slop-scan.mjs` (new)

### Gates (full run, changed pages: the 10 base pages)
The 19 other experiment pages share the lab HUD with LED and sealed bag; G7 and G8 still ran on all 29 pages.

| Gate | Result |
|---|---|
| G1 types | Pass |
| G2 lint | Pass |
| G3 unit | Pass: 523 passed, 1 skipped (the real-provider eval) |
| G4 build | Pass |
| G5 flows, G6 console | Pass: 78 of 78 browser tests passed |
| G7 hit areas, G8 accessibility | Pass on all 29 pages |
| G9 visual | Screenshots in `tests/screenshots/round-i1/`. Scored by the Critic (below) |
| G10 performance | Pass: 59.9 fps on High, Medium and Low with 4× CPU throttling. Draw calls: landing 21, LED 66 (69 running), sealed bag 44 |
| G11 AI and voice | Mock only: the eval passes inside G3; 0 of 30 real calls (no keys) |
| G12 licences | Literal command fails on `@img/sharp-libvips` (LGPL, installed by Next.js; the documented exception). The documented check passes |
| G13 slop scan | **Fail, as planned:** 102 hits left, all in categories i2 and i3 own. Icon-pack hits: 0 (was 31). Sparkles: 0 (was 6) |

### Critic (fresh sub-agent, attempt 1): FAIL
Largest gap: "The set does not read as one family with ANOMALY's signature: only about 6 of 32 icons carry §5.1's rounded notch, and Close, Check, Restart and Scan are stroke-only (§5.1 says no outline-only icon sets). Scan, used for 'Reset view', also means the wrong thing." Other in-scope points:
- `/credits` still listed Lucide;
- the design-system robotics chip used Book;
- "Rewind" was used as a label for Restart;
- Target read as a radio button on the lower band;
- the Pause notch looked like a glitch;
- the Run "play" read as a chevron;
- lock and arrow glyphs were too small.

Scores: No slop was 2–3 on most pages, from bans that later iterations own (orbs, glass, three-card rows). The Critic listed those as outside scope.

### Fix attempt 1 (same iteration)
- **The notch is now one system,** a round bite of radius about 3 on the grid (about a 2.5 px cut at 20 px), cut by an SVG mask in `Svg`. It comes out of the top-right of the main shape where possible. The arrows keep their nock, the flag its swallowtail, the house its door, and the restart arrow its gap.
- **Solid redraws:**
  - Close and Check as filled shapes;
  - Restart as a solid ring band and head;
  - Scan as solid corner brackets;
  - Lock's shackle as a filled band;
  - Speaker waves as solid crescents;
  - Speaker-off as solid bars.
- **New Recenter icon** for "Reset view".
- **Glyphs fill more of the grid** (about 2.6–21.4), and the map-node lock is 20 px.
- **Credits:** the Lucide line is gone.
- **Icon choices:** Robot on the robotics chip, the "Restart" label, and Flask on the "How it works" chip.
- **Icon sheet** now shows every icon at 16 px too.

`useId` gives each mask a unique id (React's server build supports it). Checked in the browser: every masked icon shows its bite. Re-gated in the i3 full run, then re-judged by a fresh Critic.

### Critic re-check (fresh sub-agent, after fix attempt 1): FAIL
The set is now accepted as "one coherent family of solid, rounded glyphs, none outline-only". Largest gap: on `/design-system` the icon sheet's tiles (`minmax(7.5rem,1fr)`) are too narrow for the four renders, so glyphs spill across tile borders at 1440 and 1024. Other points:
- Zoom, Scan and Break had no bite;
- the Settings and Check bites vanish at 16 px;
- the Speaker's waves merge at 16 px;
- the Hint bulb reads lumpy;
- Map and Book look alike at 16 px;
- the Recenter icon read as a crosshair, or to the i3 Critic as a four-point sparkle;
- the design-system "How it works" chip still used Target.

### Fix attempt 2
- **Icon sheet:** tiles are at least 11 rem wide with more padding.
- **Bites:** Zoom, Scan and Break have one now; Check's bite is 3.6 and Settings' 3.8.
- **Speaker waves:** no softening stroke and a wider gap.
- **Hint:** a clean round bulb on a straight neck.
- **Map:** redrawn as a winding route between three stops (our experiment map), so it can't be mistaken for the book.
- **Reset view:** Recenter is replaced by a solid **Cube** icon (the 3D view).
- **Design-system chip:** Flask.

Re-gated in the i5 run.

### Critic second re-check (after fix attempt 2): FAIL
Confirmed fixed:
- tiles wide enough, with no spill;
- Zoom, Scan and Break carry bites;
- the Check and Settings bites read at 24 px;
- the bulb is clean;
- Map and Book no longer look alike.

Largest gap: the Speaker's waves still merged. The `TONE` class adds a CSS stroke, and CSS beats the `stroke="none"` attribute, so the 1.5 softening stroke closed the gap. The same cause made the Cube read as a solid hexagon. Also flagged: Map at 16 px read as a bone, and the Target and Molecule bites vanished at 16 px.

### Fix attempt 3 (the last allowed by GAUNTLET.md's cap)
- **New `TONE_SOLID` class** (second tone, `stroke-none`) for thin parts whose gaps must stay open. It's used for the speaker waves and the cube's top. The cube's side faces also skip the stroke, so its seams stay open.
- **Map** is now a route from a start dot to a pin with a hole.
- **Bites:** Target's is radius 4; Molecule's is radius 2.8 on a bigger centre atom.
- **Checked on the dev server:** the waves are two open arcs at 16 and 24 px, the cube shows three faces, and the map reads as a route with a pin.

Re-gated in the i7 run. If the next re-check still fails, the remaining gaps are logged and the loop moves on.

## Iteration i2: paper, not glass (Design system, Slop removal)

### Plan
- Swap the fonts: body and UI to **Schibsted Grotesk**, readouts to **Martian Mono** (`next/font/google`, OFL; Martian set semi-condensed for the HUD). Point the canvas readouts in the 3D lab at Martian Mono too.
- Replace the drifting radial Sunrise orbs with **Paper**: flat cream-100, a fine SVG grain and a soft top-to-bottom shift, with Chem and Robo tints toward one hue. It stays still.
- Replace glass (`backdrop-filter`, translucent white) with the **paper card**: solid white, a 1.5 px ink edge at 10 %, grain and the crisp warm shadow DESIGN.md §5 specifies, with radii 14–18 px.
- Keep every gradient within one hue family. Primary button hover per §5. Remove the radial sheens.
- Two-colour confetti, no iridescence, shapes in apricot, white and ink, one bounce-light hue per lab, and the page wipe crossing a solid apricot block.

### What changed
- **Fonts:** `app/layout.tsx` and the `@theme` font mapping. Ten 3D readout canvases now draw in "Martian Mono", semi-condensed.
- **Theme (`app/globals.css`):**
  - one-hue gradient utilities: ribbon apricot-300→500, Chem apricot-400→600, Robo volt-400→600, levels in verify, apricot and grape, Win in verify, Glitch in anomaly;
  - `bg-paper`, `bg-paper-chem` and `bg-paper-robo` with `--paper-grain`;
  - `paper-card` replaces `glass-card`;
  - `--shadow-paper`;
  - `type-label` for sentence-case labels;
  - the drift keyframes, tilt glare and low-tier glass override are removed;
  - the wipe class is renamed `colour-wipe`, with an apricot-400 group background.
- **Components:**
  - `Paper.tsx` replaces `Sunrise.tsx`, and `PaperCard.tsx` replaces `GlassCard.tsx`; both old files are deleted;
  - `Frame`, `MeetAno`, the loaders, `TheorySheet` and the design-system demos use Paper;
  - `StageCard` is solid cream with an apricot base;
  - `Button` drops the multi-hue sheen and its hover deepens to ink-700;
  - `Tilt`, `LabCard` and `LevelCard` lose the glare and radial sheens;
  - the ribbon, slider tracks, map path (`HUE` per lab) and headline Win and Glitch ramps are one hue each.
- **Effects:**
  - `CONFETTI` is verify-500 and apricot-400;
  - the success, ANOMALY, short-circuit and power-up effects each stay in one hue;
  - the cursor click is a single apricot ripple (no dots);
  - the 3D verdict rings are one hue.
- **3D:**
  - iridescence is removed from four materials;
  - the shapes palette is apricot, white and ink;
  - `studio-env` bakes an apricot or volt bounce per lab (`useStudioEnvironment(…, bounce)`), with the volt rim kept as §8 asks;
  - the lab backdrop is a one-hue vertical gradient (the canvas radial blobs are gone);
  - lab dust is in one hue.
- **Small caps** stay only on belief cards and the hero meta line (§4); everywhere else uses `type-label` or headings.
- **Translucent fills** on chips and buttons are solid.

### Gates (full run, changed pages: the 10 base pages)
| Gate | Result |
|---|---|
| G1 types | Pass |
| G2 lint | Pass |
| G3 unit | Pass: 523 passed, 1 skipped |
| G4 build | Pass |
| G5 flows, G6 console | Pass: 78 of 78 |
| G7, G8 | Pass on all 29 pages |
| G9 | `tests/screenshots/round-i2/`. Scored by the Critic |
| G10 | Pass: 59.9 fps on all tiers (4× CPU on Low). Draw calls: landing 21, LED 66 (69 running), sealed bag 44, labs 26 |
| G11 | Mock only (passes in G3); 0 of 30 real calls |
| G12 | Literal fails on libvips (documented); documented check passes |
| G13 | **Fail, as planned:** 34 hits, all copy and data that i3 owns. Fonts, glass, radial, multi-hue and iridescence hits: 0 (were 27, 4, 22, 10 and 4) |

### Critic (fresh sub-agent, attempt 1): FAIL
Largest gap: "The Robotics paper tint (`bg-paper-robo`) on the experiment map turns grey: cream-50 shifting to volt-100 under the brown-tinted grain passes through neutral grey, so the map reads as neither warm paper nor Robo." Other in-scope points:
- the volt rim light in the studio environment put a lilac, iridescent-looking edge on the apricot shapes and on the sealed bag;
- an ink pill shape smudged the hero's word gap;
- the LED lab's backdrop started at a saturated volt-300, reading as a blue sky;
- the area below the hero was flat cream with no grain.

Scores: No slop was 3–5. The pages that scored 3 did so because of the three-card rows (outside scope). Vibrancy on the map was 3.

The Critic also noted that the full-page landing captures are blank below the hero. Their sections reveal on scroll (CSS view timelines), and a full-page screenshot never scrolls, so from i4 on the Lead also hands the Critic scrolled section shots.

### Fix attempt 1 (same iteration)
- `bg-paper-robo` is now a clean cool sheet: volt-100 with a cool grain (`--paper-grain-cool`) and a shift from volt-100 lightened with white. It no longer passes through grey.
- `studio-env` bakes the rim in the scene's hue too: a warm white rim with the apricot bounce, a volt rim only in Robotics. This is a deviation from DESIGN.md §8's "cool rim light"; see "Decisions made", item 5.
- The hero's ink pill is now apricot-300.
- The Robotics lab backdrop is volt-100 fading to cream.
- The landing wrapper uses `bg-paper`, so the sections below the hero carry the grain.
- Checked on the dev server: the robotics map reads as one clean cool sheet. Re-gated in the i4 run, then re-judged by a fresh Critic.

### Critic re-check (fresh sub-agent, after fix attempt 1): FAIL
Every earlier gap is confirmed fixed:
- the robotics map reads as cool paper (sampled about 225, 231, 251);
- there is no lilac rim on apricot objects;
- the hero pill is apricot;
- the LED backdrop is cream with volt only at the top;
- grain shows in every landing section;
- there is no blur, radial or conic gradient anywhere, and confetti uses two colours.

New largest gap: the remaining **ink** 3D shapes render as a washed-out, see-through taupe-grey. One cube sits right behind "TURN." in the final call to action.

### Fix attempt 2
- The last two ink shapes are now apricot-600 (explore) and white (CTA).
- The CTA cube moved to the far top-right corner, clear of the headline.

Re-gated in the i6 run.

### Critic second re-check (after fix attempt 2): FAIL
Confirmed:
- the fonts are right, including the canvas readouts;
- the page wipe is apricot;
- glass is gone and `paper-card` is solid;
- nothing iridescent is left;
- every gradient is one hue and confetti uses two colours.

New largest gap: the lab studios washed out to grey. The Robotics bench sampled neutral grey (226, 224, 227) with a lavender-grey plinth in a warm cream room, and the Chemistry bench sampled taupe, so the white scale and bag barely separated from it. The warm key light and the clay's fixed apricot sheen cancelled the tints. Also flagged:
- the lab card's rover was lit by the apricot environment;
- there was one hard-coded hex;
- two stale comments.

### Fix attempt 3 (the last allowed)
- The clay's sheen now takes the bench's own tint.
- The studio environment's room and key follow the hue: a cool volt-100 room with a white key for Robotics, a warm cream room for Chemistry.
- The Robotics floor and backdrop are cool paper (volt-100 to white to volt-100); the Chemistry bench is cream-50.
- The lab card's rover is lit by the volt environment.
- The hard-coded hex is gone, and the stale comments are fixed.

Re-gated in the i8 run. If the next re-check fails, its gap is logged as open and the loop moves on.

### Critic third re-check (after fix attempt 3, the last allowed): FAIL
Largest gap: the Chemistry bench still sampled greige (#EAE5DF), within about 2 % lightness of the white scale and bag. In Robotics, the circuit board (cream-50) and the parts tray (cream-200) never took the lab tint and rendered neutral grey and greige, and the contact shadow was a hard-coded warm brown.

**GAUNTLET.md's cap of 3 fix attempts is reached, so this is logged as an open issue.** A small follow-up was still made and gated in the i10 final run, and the final Critic judges it with every page:
- the board is white;
- the tray is volt-100;
- the Chemistry bench is apricot-100;
- the contact shadow is apricot-700 in Chemistry and volt-600 in Robotics.

## Iteration i3: copy and real data (Slop removal, Landing)

### Plan
- Clear the remaining G13 hits:
  - banned words (the `unlockAudio` identifier in 12 files, the map's "Finish one to unlock the next" and the `unlocked` local);
  - em dashes used as empty-value placeholders;
  - three "not just" or "isn't X, it's Y" lines in content and the Ask Ano examples.
- **No fake demos:** drive the hero's floating cards from the simulator instead of hard-coded values.

### What changed
- **Copy:**
  - `unlockAudio` became `resumeAudio` everywhere;
  - the map line now reads "Finish one and the next one opens.";
  - the placeholders became "No prediction" and "Not picked yet";
  - three content and prompt lines were rewritten plainly (the oxygen hint, neutralisation theory and an Ask Ano example).
- **Real hero data (`components/landing/featured.ts`, new):** each featured slide in `content/landing.json` now names a scenario: an experiment, the allowed edits that set it up, and the guess a student makes. On the server the engine runs it once:
  - `initialBuild` → `applyEdit` → `simulateOutcome(realModel)` produce the Reality row and its number;
  - `matches` gives the verdict;
  - `diagnose` names the belief, and its misconception title becomes the belief card's title;
  - the drop teaser is judged by its own model (`realAnswer`).

  What shows today:
  - Backwards LED (with its resistor in): "Prediction Glow · Reality Stay dark · 0 mA", "LEDs work either way round".
  - Sealed bag: "Prediction Less · Reality The same · 130 g", "Gas has no mass".
  - Gravity: "Same time / Same time", Verified.

  The teaser's drop card takes its reality from the drop model too. `featured.test.ts` (new) pins these to engine output.

### Gates (full run, the 10 base pages; this run also carries i1's fix attempt 1)
| Gate | Result |
|---|---|
| G1–G4 | Pass. G3: 526 passed, 1 skipped (adds `featured.test.ts`) |
| G5, G6 | Pass: 78 of 78 |
| G7, G8 | Pass on all 29 pages |
| G9 | `tests/screenshots/round-i3/`. Judged by two fresh Critics: the i1 re-check and i3 |
| G10 | Pass: 59.9 fps on every tier |
| G11 | Mock only; 0 of 30 real calls |
| G12 | Documented check passes (libvips exception) |
| G13 | **Pass: 0 hits.** One allowed functional hit: the ANOMALY scanline flash (0.9 s VFX, not a background pattern) |

### Critic (fresh sub-agent, attempt 1): FAIL
Largest gap: the `/design-system` demo cards still hard-coded made-up values, and they contradicted the engine ("Backwards LED · Prediction: Lights up", which isn't even an option). Other in-scope points:
- slide 1's belief line "Ano spotted the air resistance bias" claimed a diagnosis that never happened;
- Meet Ano's "Ano never says you were silly, only that…" is a not-X-but-Y line;
- a hint said "Base doesn't just dilute acid", which the scanner missed;
- the design-system colour note still said 70/20/10.

The Critic confirmed slides 2 and 3 are real engine output. Outside scope, it noted that the large glossy spheres behind the headlines read as orbs, which the i1 re-check Critic flagged too.

### Fix attempt 1
- `CardsDemo` and `PatternsDemo` now render `featuredCards()` and a real belief item.
- Slide 1's belief card is truthful: "Heavy and light fall together · Same size, same height: they land at the same moment".
- Meet Ano: "When reality surprises you, Ano finds the idea behind your guess and builds the test that settles it."
- The hint now reads "Base reacts with acid…", and the colour note says 65/20/15.
- **Scanner:**
  - the slop-copy rule now also catches "doesn't, don't, isn't, aren't or wasn't just", "not only" and "never …, only";
  - the fake-demo rule now also catches hard-coded `prediction=` and `reality=` props in components.
- **Orbs:** every sphere in the 3D shape layouts is now a cube (large ones) or a capsule.

Re-gated in the i5 run.

### Critic re-check (after fix attempt 1): FAIL
Confirmed fixed:
- slides 2 and 3 and the design-system cards are engine output;
- the counts match `content/`;
- the Meet Ano line, the hint and the 65/20/15 note are fixed.

Largest gap: in the hero's "Which falls faster?" teaser, the belief card was the fixed slide 1 card. It said "Verified" while the visitor was still choosing, and still said it beside "ANOMALY DETECTED." after a wrong guess, a status that never came from their run. Also flagged: "Most people guess wrong here." in `correctLine`, a claim with no data behind it.

### Fix attempt 2
- **Teaser belief card** now follows the visitor's own drop:
  - before the balls land: "Does weight decide who lands first? · Drop them and see · Not yet tested";
  - after: the belief behind their guess ("Heavier things fall faster", "Lighter things fall faster", or "Heavy and light fall together"), with Verified or Anomaly spotted from `verdictFor(guess)`.
- **The claim** is replaced with "Air barely touches two heavy balls" in both `landing.json` and `ano-lines.json`.

Re-gated in the i7 run.

## Iteration i4: How it works as one live sequence (Landing)

### Plan
- Replace the row of four step cards with one pinned scene, as DESIGN.md §7.1 item 1 asks: the real LED experiment plays through Predict, Diagnose, Break and Rebuild, with one caption at a time.
- Compute every bench state in the engine on the server, and draw the bench as an SVG circuit on paper with physical cues:
  - the diode mark turns when the LED is flipped;
  - current dots ride the wire at a speed set by the real current;
  - the belief's ghost LED (dashed and paler) stands beside the real one.
- Desktop pins and scrolls through the steps (`useScrollScene`). Step buttons work everywhere and are the only control on phones, with reduced motion and from the keyboard.
- Patterns: Aceternity's sticky scroll reveal and Skiper's scroll progress, studied and rebuilt.

### What changed
- `components/landing/how-sequence.ts` (new) builds the four bench states from the engine:
  - **Predict:** the backwards LED with its resistor in, guess "Glow".
  - **Diagnose:** the real run (Stay dark, 0.0 mA) beside the ghost of "LEDs work either way round" (which glows).
  - **Break:** the edit `conflict()` picks, "Swap the resistor for a plain wire". Reality stays dark; the belief says it burns out.
  - **Rebuild:** "Flip the LED round", which glows at 9.5 mA, Verified.

  `how-sequence.test.ts` (new) pins these.
- `components/landing/HowBench.tsx` (new) is the SVG bench, labelled for screen readers with the same facts.
- `components/landing/HowItWorks.tsx` was rewritten:
  - pinned on desktop (320vh);
  - a rolling step number and a caption that rolls in;
  - a progress rail;
  - step buttons with `aria-pressed`;
  - the bench card with its tag, verdict chip and a Reality / Your idea line;
  - on phones the order is heading, steps, bench, caption.
- `app/page.tsx` computes the sequence once.
- The old `[data-scene]` CSS was removed and the `current` keyframes added.
- RESOURCES.md §11 and the README credits were added.

### Gates (full run, the 10 base pages; this run also carries i2's fix attempt 1)
| Gate | Result |
|---|---|
| G1–G4 | Pass. G3: 530 passed, 1 skipped (adds `how-sequence.test.ts`) |
| G5, G6 | Pass: 78 of 78 |
| G7, G8 | Pass on all 29 pages (the new step buttons and the SVG bench pass axe and the hit-area check) |
| G9 | `tests/screenshots/round-i4/`, plus scrolled landing section shots from the same build in the scratchpad (`sections-i4/`, handed to the Critic) |
| G10 | Pass: 59.9 fps on every tier; landing 21 draw calls (the bench is DOM SVG, so it adds none) |
| G11 | Mock only; 0 of 30 real calls |
| G12 | Documented check passes |
| G13 | Pass: 0 hits |

### Critic (fresh sub-agent): **PASS**
"It is one paper bench card that changes as you scroll, with one caption at a time… The engine's states show correctly… Nothing in it looks like Aceternity's coloured sticky card or a stock progress bar." The Critic captured all four steps itself at 1440×900, 1024×768 and 390.

It listed non-blocking follow-ups, all applied in the i6 build:
- **Tiny bench labels at 390:** "3 V", the reading and "Your idea" are now 26, 24 and 22 units.
- **Nothing named the LED:** a label now reads "LED, backwards" or "LED".
- **Clipping on 1366×600 screens:** on screens under 780 px tall the heading is smaller and the big step number is hidden.
- **The card jumped when a long tag wrapped on phones:** the header row reserves two lines.
- **The progress rail animated its width:** it now uses `scale-x`, transform only (§9.2).

Scores: How it works itself was 4 on every point. The landing's No slop was 2, from the belief grid and level rows that i5 and i6 replace, plus a blurred orb-like sphere that i3's fix replaced with cubes.

## Iteration i5: labs on ink, and the belief deck (Landing, Component integration)

### Plan
- **Two labs on a full-width ink-900 colour block** (DESIGN.md §7.1 item 2, §3 "Colour blocks"), with white headline type.
- **Belief deck** (§7.1 item 4) in place of the three-column belief wall: nine real belief cards stacked like paper. Drag or flick the front card off, or use the arrows and arrow keys, and it goes to the back. A rolling counter sits beside it.
- **Patterns:** Aceternity's card stack and draggable card and Skiper's card swipe carousel, studied and rebuilt. The study measured a flick under about 300 ms or a drag of about 150 px.

### What changed
- `components/landing/useDeckDrag.ts` (new) handles drag and fling on the shared spring loop:
  - a throw is a 140 px drag, or a flick of at least 30 px in under 300 ms;
  - the card flies off on a spring, hides, and the stack fades it in at the back;
  - values go straight to the element's own `translate` and `rotate`;
  - reduced motion skips the throw.
- `components/landing/BeliefDeck.tsx` (new):
  - up to three cards visible behind the front one, at growing depth and alternate tilt;
  - only the front card is interactive (`inert` on the rest);
  - a group label that reads "card N of 9", arrow keys, Previous and Next buttons, and a rolling counter;
  - status from saved progress after hydration.
- `BeliefShiftCard` gained `size="lg"`.
- `BeliefSection` is now a two-column layout (heading left, deck right), and the old `BeliefWall` and its column-drift CSS were removed.
- `LabsSection` sits on an ink-900 block, and `SectionHeading` gained a `light` tone.
- The section is renamed "The belief deck".
- **Checked in the browser:**
  - a drag throws, and Next, Previous and the arrow keys all move the deck;
  - there are no console errors.

### Gates (full run, the 10 base pages; also carries i1's fix attempt 2 and i3's fix attempt 1)
| Gate | Result |
|---|---|
| G1–G4 | Pass |
| G5, G6 | Pass: 78 of 78 |
| G7, G8 | Pass on all 29 pages |
| G9 | `tests/screenshots/round-i5/` and `sections-i5/` (scrolled landing sections) |
| G10 | Pass: 59.9 fps, 0 jank on every tier. Landing 20 draw calls, LED 66 (69 running), sealed bag 44 |
| G11 | Mock only; 0 of 30 real calls |
| G12 | Documented check passes |
| G13 | Pass: 0 hits |

### Critic (fresh sub-agent): FAIL
The Critic agreed that the labs block meets the spec (a full-width ink block, gradient cards, 3D flask and rover, real counts) and that the deck "does read as a stack, not a row, and it looks native to ANOMALY: paper cards, our own arrow icons, a Martian Mono counter, nothing left over from Aceternity".

Largest gap: at 390 the deck's back cards fanned 16, 32 and 48 px to the right and off the screen, so the landing was 415 px wide and scrolled sideways. Also flagged:
- at 1440 the fan ran into the counter;
- a back card's arrow button poked out as a half disc.

### Fix attempt 1
- The fan now alternates sides (±7 px per step, 2.2° per step), so it stays inside the deck's own box.
- On phones the deck is 2.5 rem narrower than its column, and the section clips sideways overflow.
- Back cards render without their arrow button; only the front card has one.
- **New check `tests/e2e/overflow.spec.ts`:** every changed page's `scrollWidth` must equal the viewport width at 390 and 1024, after scrolling through it. It's a new, stricter check, not an edit to an existing test.
- Running that check on the dev server found the LED lab 8 px too wide at 1024 (from session 1 or 2, after scrolling). The explore shell now clips sideways overflow (`overflow-x: clip`, which keeps sticky and fixed parts working).
- Checked on the dev server: landing, `/start`, `/beliefs`, `/design-system`, lab select, map and both labs are exactly 390 and 1024 wide.

Re-gated in the i7 run.

## Iteration i6: the grade dial (Selection pages, Landing, Ano)

### Plan
- Replace both rows of three level cards (`/start` and the landing) with DESIGN.md §7.2's **grade dial**, a half circle from 6 to 12, and **one big level card** that changes as it turns:
  - its colour family;
  - a rolling grade range and title;
  - the real experiment count and "more coming" count;
  - the description;
  - real experiment titles;
  - a Start button.
- On `/start`, Ano peeks over the card and reacts to each level with a nod and a new face.
- Patterns: Aceternity's container text flip and Skiper's animated number, studied and rebuilt.
- The flows test's needs stay met with no test edits: a visible link to `/start/medium` (the default grade is 9) and a visible "Easy" link (the "go straight to" row).

### What changed
- `components/explore/GradeDial.tsx` (new):
  - an SVG half-circle slider (`role="slider"` with a value text);
  - drag on the arc or click anywhere on it, and the arrow, Home and End keys;
  - the knob on the shared spring loop, snapping to the nearest grade on release;
  - the level bands on paper, filled in the current level's one hue;
  - a rolling grade in the middle.

  Coordinates are rounded to two decimals, because Node's and the browser's trigonometry differed in the last digit and caused a hydration mismatch, found and fixed on the dev server.
- `components/explore/LevelPicker.tsx` (new) is the dial plus the one card. The card carries the `level-<id>` morph into the lab select page.
- `components/explore/LevelSelect.tsx` (new) adds Ano's reactions, and `components/explore/level-picks.ts` (new) builds the real level data.
- `components/landing/LevelDialSection.tsx` (new) replaces `LevelsStrip`. `LevelCard.tsx` and `LevelsStrip.tsx` are deleted.
- `/start` is rewritten around the dial ("Turn the dial to your grade…").
- **Checked in the browser:**
  - the keys move it from 9 to 6;
  - a drag moves it to 11;
  - the card changes live;
  - the `/start/medium` and "Easy" links are visible;
  - there are no console errors.

### Gates (full run, the 10 base pages; also carries i2's fix attempt 2 and the i4 follow-ups)
| Gate | Result |
|---|---|
| G1–G4 | Pass |
| G5, G6 | Pass |
| **G7** | **Fail on landing and levels:** the three "go straight to" text links had a 44 px hit box around smaller visible text (13.3 px off) |
| G8 | Pass (axe clean on every page) |
| G9 | `tests/screenshots/round-i6/`, `sections-i6/` |
| G10 | Pass: 59.9 fps on every tier |
| G11 | Mock only; 0 of 30 real calls |
| G12 | Documented check passes |
| G13 | Pass: 0 hits |

Browser tests: 76 of 78 passed. The two failures are the G7 checks above.

**G7 fix attempt 1:** the links are now visible paper pills whose whole box is the hit area (`h-11`, white, warm shadow). Verified in the i7 run.

### Critic re-check (after fix attempt 1): FAIL
Confirmed: the Button pills with a fixed hit area, no end ticks, "Grade 9", and the landing line.

Largest gap: Tailwind v4 has no `pointer-events-[stroke]` utility, so the class produced no CSS. The Critic checked live: the hit band inherited `pointer-events: none`, a tap on the arc did nothing, and only the knob responded, at 40.7 px on phones (under 44). Also flagged:
- the "go straight to" row left "Advanced" orphaned at 390;
- the unfilled track was only 1.1:1 against the paper;
- the Start button sat below the fold at 1440×900.

### Fix attempt 2
- **Hit band:** `pointerEvents="stroke"` as an SVG attribute, which beats the inherited value. The band is 36 units, close to the 30-unit track.
- **Grade numbers** are tappable.
- **Knob:** radius 28 (46 px at 390, 69 px at 1440).
- **Track:** cream-300.
- **Pill row:** centred, with its label on its own line on phones.
- **/start:** tighter spacing.
- **Checked on the dev server at 1440 and 390:**
  - an arc tap at grade 7 moves the dial to 7;
  - a tap in the hollow does nothing;
  - tapping "11" moves it to 11;
  - the knob is 46 px at 390.

Gated in the i10 final run.

Same pass, from the i8 Critic: the level card's colour block no longer carries the dark "9–10" numerals (DESIGN.md §3: no text on mid-tone saturated colour). The block is pure colour, and the range is on the white panel's chip.

## Iteration i7: My beliefs as one grouped column (Selection pages)

### Plan
- Replace `/beliefs`'s three-column grid of 31 identical cards with DESIGN.md §7.6's single column, grouped by status.
- Each status group gets a heading, a count and a short note (broken, challenged, not yet tested).
- Each row shows the lab tile with its icon, lab and level, the belief title and the belief in the student's words, its status, and the arrow to the experiment.
- Fix the 390 clipping of the level filter with shorter labels ("Both", "All").
- Fix the design-system colour ramps overflowing at 390.

### What changed
- `components/explore/BeliefList.tsx` (new) replaces `BeliefGrid.tsx` (deleted). Rows spring in again after each filter change, and status comes from saved progress after hydration.
- `components/design-system/Swatches.tsx` wraps the ramps into a four-column grid on phones.
- This build also carries:
  - i1's fix attempt 3;
  - i3's fix attempt 2;
  - i5's fix attempt 1, with the new overflow check;
  - i6's G7 fix.

### Gates (full run, the 10 base pages; also carries i1's fix attempt 3, i3's fix attempt 2, i5's fix attempt 1 and i6's G7 fix)
| Gate | Result |
|---|---|
| G1–G4 | Pass |
| G5, G6 | Pass |
| G7, G8 | **Pass on all 29 pages**, including landing and levels, so i6's G7 fix is verified |
| Overflow (new) | Pass: all 10 changed pages are exactly 390 and 1024 px wide after scrolling through |
| G9 | `tests/screenshots/round-i7/`, `sections-i7/` |
| G10 | Pass: 59.9 fps on every tier |
| G11 | Mock only; 0 of 30 real calls |
| G12 | Documented check passes |
| G13 | Pass: 0 hits |

Browser tests: 98 of 98 passed (78 plus 20 new overflow checks).

### Iteration i6, Critic (fresh sub-agent): FAIL
"No component looks like an Aceternity or Skiper demo." The Critic also confirmed that the single card "does change colour family, rolling range, count, titles and Start button as the dial turns".

Largest gap: the dial took pointer input across its whole 440×250 box and blocked touch scrolling on its wrapper. Pressing the readout or below the centre line jumped the grade, and on phones a thumb swiping over the dial changed the grade instead of scrolling. Also flagged:
- the "go straight to" pills copied the secondary button by hand (no border, press or sound), and moved their own hit area on hover;
- the sample chips barely showed;
- the flat end ticks read as stray dashes;
- "Grade 09" had a leading zero;
- the landing section had no supporting line.

### Iteration i6, fix attempt 1
- **Dial input:** the SVG is `pointer-events: none`. Only an invisible 60-unit stroke along the arc and the knob take the pointer and block touch scrolling.
- **Pills:** now `<Button variant="secondary">`.
- **Sample chips:** cream-200 with ink text.
- **Ticks:** none at grades 6 and 12.
- **Readout:** "Grade 9".
- **Landing:** the level section has a line under its heading.
- **Checked on the dev server:**
  - clicks on the readout and in the hollow leave the dial at 9;
  - a drag along the arc moves it to 11;
  - the pills are links;
  - no console errors.

Re-gated in the i8 run.

### Critic (fresh sub-agent): FAIL
Met: the single column, the group headings with counts and notes, the row contents, and the overflow fix at 390 and 1024. The gates pass, at 98 of 98.

Largest gap: the rows were a one-off component, not §5's Belief shift card that §7.6 asks for. They had no small-caps eyebrow and no status dot, and repeated "Not yet tested" under a heading that already said it. They were also in filename order, so labs and levels were mixed, and the status colour showed only on a 10 px heading dot. Also flagged: at 390, "Advanced" overflowed its equal-width segment in the level filter.

### Fix attempt 1
- **Rows** are now `BeliefShiftCard`s: lab and level small caps, the title, the belief, the status dot and label, the lab accent bar and the arrow.
- **Status colour:** each card is tinted by status (verify-100, apricot-100 or white).
- **Order:** each group is sorted by lab, then level, then title.
- **`SegmentedToggle`:** segments are now sized to their content (`auto-cols-max`, slightly narrower padding on phones), so "Advanced" fits.

Re-gated in the i9 run.

## Iteration i8: cursor, nav, sound toggle and Ano's lines (Component integration)

### Plan
These are the remaining shortlisted patterns, each rebuilt in our own code from the study notes:
- **Skiper text roll navigation:** header nav labels roll up on hover and keyboard focus, staggered from the middle letter outward.
- **Skiper music toggle:** the sound toggle becomes four equaliser bars that keep a beat while sound is on and settle into dots when it's muted (CSS transforms only).
- **Aceternity text generate effect, without its blur:** Ano's speech bubble lines appear word by word (a 5 px rise, 40 ms apart).
- **Aceternity following pointer and Skiper mouse follow:** both are covered by the soft cursor from session 1 (it grows over controls and leaves a tiny trail). i2 made its click a single apricot ripple; no new code is needed.

### What changed
- `components/ui/RollLabel.tsx` (new), used by the header nav. The accessible name is unchanged, through an `sr-only` copy.
- `components/ui/WordReveal.tsx` (new), used by `SpeechBubble`. The words stay real text.
- `components/ui/SoundToggle.tsx`: equaliser bars, with still bars under reduced motion.
- `app/globals.css`: `word-in` and `eq` keyframes.
- RESOURCES.md §11 lists every pattern and where it lives.
- **Checked in the browser:**
  - the nav links' accessible names are unchanged;
  - mute settles the bars into four dots;
  - no console errors.

### Gates (full run, the 10 base pages; also carries i6's fix attempt 1 and i2's fix attempt 3)
| Gate | Result |
|---|---|
| G1–G4 | Pass |
| G5, G6 | Pass |
| G7 | Pass on all 29 pages |
| **G8** | **Fail on chemistry-neutralisation:** axe sampled a speech-bubble word mid-fade (the new word reveal faded opacity), which is a real contrast failure during the animation |
| Overflow | Pass at 390 and 1024 |
| G9 | `tests/screenshots/round-i8/`, `sections-i8/` |
| G10 | Pass: 59.9 fps on every tier (landing 20 draw calls) |
| G11 | Mock only; 0 of 30 real calls |
| G12 | Documented check passes |
| G13 | Pass: 0 hits |

Browser tests: 97 of 98 passed. The one failure is the G8 check above.

**G8 fix attempt 1:** each word now rises out of its own mask with no opacity change, so the text keeps full contrast on every frame. Verified in the i9 run.

## Iteration i9: the lab's Run, running and result flow (Experiment / 3D lab)

### Plan
- **Stateful Run** (Aceternity's stateful button, studied and rebuilt). After Run, the dock shows a black "Running the simulator" pill whose ring fills with the real run's progress: the playback clock is written to the ring each frame, never through React state. When the run ends, the result card pops in with its check or cross, completing idle, running, result.
- **Camera:** bring the lab camera about 12 % closer for the build and predict shots, so the apparatus, not the bench, fills the space the HUD leaves (all stages share `benchShots`).
- **Lab tint:** i2's studio tint fix (fix attempt 3) is part of this build, so the lab reads as cool paper in Robotics and warm cream in Chemistry.

### What changed
- `components/lab/RunStatus.tsx` (new), used in `LabExperiment`'s running dock in place of the plain "Running the simulator…" line.
- `components/lab3d/shots.ts`: `dist = 0.72 + size * 1.5` (was `0.8 + size * 1.7`).
- Checked on the dev server (LED, guess "Stay dark"): Run, then the running pill with its ring filling, then the result card, Verified. No console errors.
- This build also carries i7's fix attempt 1 and i8's G8 fix.

### i8 Critic (fresh sub-agent): **PASS**
The pass was conditional on a clean G8 re-run, which the i9 run then confirmed. The Critic confirmed:
- RollLabel reads its name once and rolls with transform only;
- the equaliser's ink and apricot bars look native, and hold still under reduced motion;
- WordReveal replays per line;
- "No score below 4 comes from this sub-task."

It also noted two things, both fixed in the i10 build:
- muting snapped the bars to full height before they shrank, because the keyframes animated `transform` while the muted state set `scale`. The keyframes now animate `scale` too.
- WordReveal had no single screen-reader copy. It now has an `sr-only` line, with the animated words `aria-hidden`.

### Gates (full run, the 10 base pages; also carries i7's fix attempt 1 and i8's G8 fix)
| Gate | Result |
|---|---|
| G1–G4 | Pass |
| G5, G6 | Pass |
| G7 | Pass on all 29 pages |
| G8 | **Pass on all 29 pages**, chemistry-neutralisation included, so the word-reveal fix is verified |
| Overflow | Pass at 390 and 1024 |
| G9 | `tests/screenshots/round-i9/` |
| G10 | Pass: 59.9 fps on every tier |
| G11 | Mock only; 0 of 30 real calls |
| G12 | Documented check passes |
| G13 | Pass: 0 hits |

Browser tests: 98 of 98 passed.

## Iteration i10: the final pass (Performance, every page)

### Plan
1. Ship the open fixes:
   - i6's fix attempt 2 (dial input);
   - the i2 lab-tint follow-up;
   - the i8 polish (equaliser and screen-reader line);
   - the colour-block text fix.
2. Run the **full gauntlet on every page** (`GAUNTLET_CHANGED=all`). That covers G1–G13, screenshots of all 29 pages at 1440, 1024 and 390, the overflow check on all 29 pages at 390 and 1024, G7 and G8 on all 29, and G10 on High, Medium and Low with 4× CPU throttling.
3. Have fresh Critics score **every page** on the 8-point rubric: one for the 10 base pages, one for the 19 other experiment pages.
4. Write the handoff.

### What changed (this build)
- **i6 fix attempt 2:** the dial's input (an SVG `pointerEvents` attribute, tappable numbers, a 46 px knob at 390, a visible track, a centred pill row), and no text on the level card's colour block.
- **The i2 follow-up:** a white circuit board, a volt-100 tray, an apricot-100 Chemistry bench, and contact shadows in each lab's hue.
- **i8 polish:**
  - the equaliser shrinks from where it is (`scale` keyframes);
  - WordReveal has one `sr-only` line, with the animated words `aria-hidden`.

### Gates (full run, every page: `GAUNTLET_CHANGED=all`)
| Gate | Result |
|---|---|
| G1–G4 | Pass. G3: 530 passed, 1 skipped (the real-provider eval) |
| G5 Flows, G6 Console | Pass |
| G7, G8 | Pass on all 29 pages |
| Overflow | Pass: all 29 pages at 390 and 1024 |
| G9 | `tests/screenshots/round-i10/` (all 29 pages × 3 widths, full and viewport), `round-i10/landing-sections/` |
| G10 | Pass: 59.9 fps, p95 ≤ 16.8 ms, 0 jank on High, Medium and Low with 4× CPU throttling, idle and running. Draw calls: landing 20, LED 66 (69 running), sealed bag 44, labs 25, design system 16 |
| G11 | Mock only; **0 of 30 real calls** used (no `.env.local`) |
| G12 | Literal fails on libvips (documented); documented check passes |
| G13 | **Pass: 0 hits** (141 at the start of the session) |

**193 of 193 browser tests passed**, 0 failed, 0 skipped.

### Final Critics (fresh sub-agents, every page): FAIL (8 of 29 pages below 4 on some point)
Every gate passes, and no page scores under 4 on No slop. The pages below 4:
- **Landing at 390, spacing 3:** the hero result card touches "Learn why…", and the deck clips its text.
- **LED at 1024, clarity 3:** the Inspector covers the LED and the mission card clips the battery.
- **Credits, vibrancy 3:** almost no colour.
- **Design system at 390, pattern 3:** the hero preview drops Ano.
- **Indicator at 390, spacing 2, polish 3, clarity 3:** the Liquid toggle overflows its card.
- **Reaction speed at 390, clarity 3:** Ano covers the hot beaker.
- **Equilibrium, clarity 3:** the NO₂ tubes render near-cream.
- **Parallel at 390, clarity 3:** the circuit is a thin strip.

The largest shared gap is lab framing: the stage cameras don't keep the apparatus clear of the HUD cards at 1024 and of Ano on phones. **The 10-iteration cap is reached, so these are logged as open issues** in HANDOFF.md §7, with the fix each Critic described.

After the final run, one comment-only change was made. The Critic found "seamless" in a code comment, and three other comments used "unlock" or "unlocked". They were reworded, and the slop scan now checks comments for banned words too (DESIGN.md §0 bans them "in the product, its copy and its code"). Re-checked: `tsc` and lint pass and the scan reports 0 hits. Comments don't change the build, so the final gate results stand.

### Session 3 totals
- **Iterations:** 10 of 10.
- **Fix attempts:**
  - i1: 3 (the cap);
  - i2: 3 (the cap; one gap left open);
  - i3: 2;
  - i5: 1;
  - i6: 2;
  - i7: 1;
  - G7 (i6): 1;
  - G8 (i8): 1.
- **Real AI calls:** 0 of 30.
- **Critics:** 21 fresh-context sub-agents. Plus one study agent, which read the libraries' demos without copying code.
- **Commits:** none (read-only git throughout).

---

# Lab rebuild (session 4): premium labs in their own colour worlds

Brief: rebuild both 3D labs to DESIGN.md §8 (lab colour worlds) and §8.2 (model quality standard), with no new features and no engine changes. The six tasks run in order. After each task:
- close-ups of every changed model on the dev-only kit gallery (`/design-system/kit`);
- both labs at 1440 and 390 on the production build;
- FPS on all three tiers.

Before shots are in `tests/screenshots/labs-before/`.

## Decisions (made here, not asked)
- **DESIGN.md synced** to the owner's latest copy (adds §8 lab colour worlds and §8.2). The lab palettes become tokens: `LAB` in `lib/tokens.ts` and `--color-chem-*` / `--color-robo-*` in `@theme`.
- **Kit gallery** at `/design-system/kit`, dev only like `/design-system`. It shows each model on its own lab wall under its lab's light, with fixed three-quarter cameras so before and after shots line up. §8.2 says models are judged at close range, and this is where.
- **LED lens in Robotics gold (#D4A537)**, as amber glass. Its glow and halo are gold too, and burnt is still a dark lens. Robotics has no red, so a red LED would break the palette.
- **Resistor colour bands keep the real colour code.** The bands are data (they read 100 Ω or 220 Ω), not decoration, so they are exempt from the palette, like a verdict colour.
- **Copper and steel** are material colours (bare wire ends, contacts, the scale's pan), not palette colours.
- **Battery leads:** gold for +, graphite for −. **Student-added jumpers** are gold. **Current particles** are teal, as the palette says for current and sensors.
- **The bag's zip:** a sage ridge and a sand-gold ridge. Its film is a new `film` material, milkier and softer than glass, so the bag reads as plastic, not a glass cloche.
- **Models at lab scale:** the LED head is 1.4× a real 5 mm LED, and the AA cells are drawn at about 1.3×. True proportions vanished at bench distance; the shapes stay true.
- **Ano keeps his apricot identity** in both labs. He is the product's face, not lab furniture (DESIGN.md §6).

## Task 1: the demo models
**What changed:**
- **Beaker:** a Griffin profile lathed with real wall thickness, a rounded rim and a pulled spout (`kit/detail.ts` `shellGeometry`, `addSpout`), with printed 0–250 mL graduations and a liquid with a rounded heel.
- **Scale:** a bevelled body with rubber feet, a brushed-steel pan on a pedestal, and a black bezel with a gold LCD and printed ON and TARE buttons.
- **Zip bag:**
  - a film pillow with soft sides, crinkled when slack (a morph target smooths it as gas fills it);
  - a translucent welded seam;
  - a two-ridge zip that is shut or gaping.
- **Battery:**
  - two AA cells in an open black holder;
  - lathed sleeves printed "1.5 V AA" with a gold + band;
  - steel ends and a helix spring.
- **Resistor:** a dog-bone lathe with printed colour bands.
- **LED:**
  - a lathed lens with a flange, a flat on the cathode side, and the anvil and post inside;
  - legs of different lengths;
  - a gold halo when lit.
- **Wires:** satin graphite tubes with copper ends, and teal current.

**Fixes found at close range:**
- The bag z-fought with the pan, so its underside now sits 4 mm up.
- The seam read as a picture frame; it is now narrower and half see-through.
- The battery label was huge and upside down.
- The leads were too fat.

**Fixes found at bench distance:**
- The battery and LED read too small; they are now scaled as above.
- The bag read as a cloche; it now has soft sides, film and a slimmer zip.

**Bug fixed:** the bag's morph influences were set up on the first frame, but contact shadows render the scene before that and crashed. They are now set up on mount.

## Task 2: Ano
**What changed:**
- **Visor:** now real geometry, a rounded panel just proud of the head whose lip rolls back into the shell. It replaces the sphere band that was cut out with a 256 px alpha mask, which gave stair-stepped corners and a hard edge. The face canvas still lights it from inside, with the same UVs.
- **Visor reflections:** raised from 0.3 to 0.85, so it reads as dark glass with clear highlights.
- **Belt:** now a band that follows the egg's own curve, with a superellipse cross-section sunk into the shell. It replaces a torus pushed into the body, which left an uneven seam.
- **Smoother silhouettes:** more segments on the head (64×40) and body (64 × 40).
- **Visor environment:** at 0.85 the studio's strip lights reflected as a grey bar between the eyes. The visor now reflects its own small studio (`visorEnvironment`: a dark room and one softbox above), so it shows one clean highlight across the top.

## Tasks 3 and 4: the lab colour worlds
**Shared by both labs:**
- **Set:** split into `scene/set/`:
  - `Room`: a screen-space backdrop gradient and a floor disc that fades into it, so floor and wall read as one curved sweep;
  - `Bench`: a worktop and a band under its edge, on a cabinet with four bevelled doors, bar handles and a recessed kick;
  - the lab's set pieces;
  - `look.ts`: each lab's colours in one table;
  - `bench-size.ts`: shared dimensions.
- **Light:** each lab has its own environment rig (`studio-env.ts` `RIGS`). Both get a clean white key and a strong white rim behind; the bounces use the lab's own accents.
- **Ambient life:** dust, the lit strip and the status lights take the lab's colours. While running, the status lights blink in the lab's gold; verdict green and red stay semantic.
- **Confetti:** verify green plus the lab's gold (two colours, §8).
- **Ghosts in each lab's teal:** dashed labels and graph lines. Robotics' bright teal is only 2.8:1 on a cream card, so ghost text uses a deeper shade of it (6:1).
- **Ano has no floor shadow in the lab.** He floats in front of the bench with no floor under him, and the warm blob read as a glow.
- **The logo gets a white card in experiments.** It sat directly on the teal or graphite wall, and §8 says text never does.

**Decided:** the camera sees only a thin band of wall above the bench (fov 32 at 35–48° elevation), so the set pieces stand on the bench where they are seen, not high on the wall. The stage cameras stay as they are: re-framing 21 stages around the HUD is out of scope, and a calm beige bench under a teal wall is §8's "calm, natural".

**Chemistry:**
- Teal walls deepening to the floor colour.
- A satin beige worktop on sage casework with sand-gold handles.
- A beige fume-hood frame with sage linings and a warm light strip under its header.
- A sage reagent shelf along the back with lathed glassware at both ends (the middle stays clear behind the apparatus).
- Fizz bubbles, escaping gas and CO₂ molecules in white and sage.
- Vinegar in sage.
- The mass graph's real line in ink.

**Robotics:**
- Graphite walls lifted behind the bench.
- A matte white worktop with a black band, on black casework with gold handles.
- A graphite pegboard on white posts, with:
  - a steel tool rail holding gold-handled screwdrivers and pliers;
  - wire spools in teal, gold and white.
- The circuit board is a white face on a black carrier, so it reads on the white bench.
- The parts tray is matte black.
- Slot outlines:
  - gold where the held part fits, and when selected;
  - a faint graphite dash otherwise.
- The bulb's filament and glow, sparks and the robot's trail in gold.

**Bugs found and fixed:**
- `mergeGeometries` failed on mixed indexed and unindexed parts, so `mergeParts` unindexes first.
- The board's carrier had a corner radius over half its height, so it folded through the white face as dark blocks and stripes. The old board had the same fault, hidden by the cream.
- The tools hung above the top of the circuit shots, so the rail and dowel moved lower.

## Task 5: the remaining models (three parallel builders)
The Task 1 helpers set the style, and three builders worked in parallel, each owning a disjoint set of files with no shared-file edits.

**Shared upgrades (all three):**
- `shellGeometry` glass;
- bevelled boxes (corner radius under half the smallest side; the board's fold taught us);
- tube cables;
- printed canvas labels;
- `mergeParts` per material;
- each lab's own palette, with ghosts in teal.

The flask and test tube were done first (by the Lead). Both are now `shellGeometry` shells with a `VesselLiquid` that follows the inner wall exactly: the lathe is rewritten in place only when the level moves.

**Chemistry heat and gas** (melting, gas heat, gas laws, reaction speed):
- **Thermometer:** a lathed rod and bulb, a printed enamel scale and a sand-gold column. Gold was picked over red, because red means ANOMALY.
- **Hot plate:** a bevelled body, a ceramic top whose rings glow sand gold, a knurled knob and an LCD.
- **Syringe:** a barrel with printed graduations, a ribbed seal and a cross-vaned rod.
- **Pressure gauge:** a bezel, a printed dial, a tapered needle and a teal ghost needle.
- **Gas-law rig:** sage saddles.
- **Gas, water and particle tints:** sand, sage and white.

Draw calls before → after:

| Experiment | Before | After |
|---|---|---|
| Melting | 55 | 61 |
| Gas heat | 54 | 65 |
| Gas laws | 65 | 61 |
| Reaction speed | 72 | 84 |

**Chemistry liquids and reactions** (burning, catalyst, dissolving, indicator, neutralisation, equilibrium):
- **Burette:** a glass tube on a glass stopcock with a turning key and printed graduations.
- **Retort stand:** shared, at 3 draw calls.
- **Dropper bottle:** with a printed label.
- **Test-tube rack.**
- **Dropper:** a rubber teat.
- **pH meter:** a bezel and buttons, with a probe on a cable.
- **Water bath:** a glass shell.
- **Sealed NO₂ tube:** one lathe. Fixed the open issue "NO₂ near-cream": it now reads brown, and deeper brown when hot.
- **Jar:** a screw thread and a lathed lid.
- **Gas syringe.**
- **9 V battery:** a printed wrap.

Data colours kept: red-cabbage and universal-indicator colours, NO₂ brown, and glowing steel wool.

Draw calls before → after:

| Experiment | Before | After |
|---|---|---|
| Burning | 61 | 67 |
| Catalyst | 67 | 58 |
| Dissolving | 64 | 63 |
| Equilibrium | 74 | 70 |
| Indicator | 60 | 61 |
| Neutralisation | 68 | 75 |

**Robotics:**
- **Bulb:** a pear-shaped glass envelope, a gold screw base and a coil filament.
- **Switch:** a knife switch.
- **Motor and buzzer:** a motor can and a buzzer puck.
- **Battery pack:** black, with printed cells.
- **Multimeter:** a printed dial, ports with the probes plugged in, and a bezelled LCD.
- **Oscilloscope:** a teal trace, a gold average line and printed labels.
- **Motor driver:** a black board.
- **Gears:** true involute teeth with a bevel and a hub.
- **Wheels:** treaded tyres on white rims.
- **Robot chassis.**
- **Arena:** a graphite mat with white tape.

The orange packs, gear and multimeter and the violet lane lines are gone. Draw calls are 59–100 per experiment (LED 82).

**Fixed in a shared file:** the beaker's "250 mL" overlapped its 250 mark. Graduations now stop at 200, with the capacity printed above them, as on a real Griffin beaker.

---

# Level select redesign, and real 3D across the site
The owner's brief:
- the level select page looked like a template card (an empty gradient band, a meta pill, a tag-pill cloud, "Start →");
- then sweep every page for the same patterns.

Mid-way, the owner also asked to fix how the 3D looks ("it looks so bad"). On the site pages that meant the floating glossy pills, cubes and rings, and the toy flask and rover on the lab cards.

## Decisions
- **Floating specimens, not blobs.** The knock-around shapes (landing hero, final call to action, level and lab select) are now real lab specimens modelled to §8.2 (`components/three/specimens.ts`):
  - glassware with apricot liquid: a conical flask, a Griffin beaker with a spout, a test tube;
  - an LED with legs of different lengths, an AA cell, a banded resistor, a spur gear with lightening holes, and a ball-and-stick water molecule.

  The physics and layouts are unchanged; only the kinds changed. A field is one instanced mesh per part (glass, liquid, solid), about 11 draw calls. DESIGN.md asks for "saturated 3D objects", and CLAUDE.md §3.6's "abstract, not clip-art" was about cheap literal models, which §8.2 now rules out anyway.
- **The level knob is an instrument:**
  - a paper faceplate with screws;
  - a 270° scale with grade ticks and half-ticks, and the three level zones outside it;
  - a knurled black knob with an apricot needle on a spring (240, 16, so it overshoots a little);
  - a dry detent click at every grade (`detentClick`);
  - an LCD in the bottom gap.

  It replaces the half-circle grade dial (`GradeDial.tsx` removed).
- **Periodic-table tile.** The grade range takes the atomic number's place, the experiment count the mass's, with the symbols Ea, Md and Ad. It's a solid colour block in the level's colour (verify, apricot, grape) with a printed inner edge, and it flips in on each change with a clack (`tileClack`). Small tiles replace the "Or go straight to" pills.
- **The shelf.** The level's experiments stand on a shelf as their own kit models (`shelf-models.tsx`), fitted to equal slots by measuring their meshes (`FitModel`). It's a slow turntable; hovering or focusing a slot lifts the model and shows the name on a paper tag. Phones get two shelves.
- **Beliefs line.** The count of distinct misconceptions across the level's experiments, and one teaser: "10 beliefs to break. One of them: 'Current gets used up.'" The symbol, teaser and Ano's line live in `content/levels.json`.
- **Ano reacts.** Easy is a hop and a happy face, Medium a nod and curious, Advanced a spin and surprised, and his speech bubble changes to that level's line.
- **Start** is plain text, with no arrow.

## The pattern sweep
- **Lab cards** (lab select, and the landing's labs section):
  - each is its lab's colour world: teal deepening to the floor colour, or graphite lifting off the deep shade;
  - a short bench of real kit apparatus under the lab's own light: a flask, beaker and thermometer, or the robot, a gold gear and an LED;
  - "Open the map" is underlined text, with no arrow.

  `lab-objects.ts` (toy flask and rover) is removed. The utilities are `bg-chem-world` and `bg-robo-world`; `bg-lab-*` never compiled, apparently clashing with CSS `lab()`.
- **Experiment map nodes:**
  - the number circle and chips are replaced by a window onto the experiment's own apparatus in its lab's world (locked ones behind frosted paper with a lock);
  - an instrument-style status line: a light, then "Up next · 3 min" in mono;
  - the path is drawn in the lab's colours, and the map papers are tinted toward each lab's bench.
- **My beliefs:** the 31 identical cards with coloured top bands and corner arrows are now a belief register. Lab notebook pages are ruled per status group, and each row carries:
  - the level's element tile;
  - the lab's mark;
  - the belief;
  - a rubber stamp (Broken, Challenged, Not tested);
  - "Test it" (the whole row is the link).
- **Belief shift card:** the lab's top band is replaced by the lab's mark beside the eyebrow (used by the landing deck).
- **Meet Ano:** the expression pills are now his visor faces (`FaceIcon`).
- **Arrows:** removed from the final call to action, the hero's Start, Next experiment and the next-level button. The carousel and deck arrows stay: they are real previous and next controls. The belief card's corner arrow stays, as DESIGN.md P5 specifies it.

# Landing in the lab palettes, real experiments on the stage, more particles
The owner's brief:
- the landing was all cream, peach and orange;
- each hero slide should use its lab's palette, with the real experiment on the stage card;
- orange only on Ano;
- Ano's face fixed;
- the stray dot and the peach highlight removed.

The owner also asked for more detail in the existing models (not more models), a few more particles on the landing, and better graphics.

## What changed
- **One stage per slide** (`components/landing/HeroStage.tsx`, `stage/benches.tsx`): a single 3D view on the stage card, with Ano standing behind the slide's real experiment, lit by that lab's rig. The readouts are the values from the same engine run as the cards (`featured.ts` now returns `stage`):
  - **LED:** battery, 220 Ω resistor and the backwards LED, dark, in series, with a loop wire and a multimeter reading 0.0 mA.
  - **Sealed bag:** the bag on the scale reading 130.0 g, with CO₂ molecules bouncing inside in sand gold.
  - **Drop:** the steel and glass balls falling together from the drop model, bouncing with their own restitution, with "both land · 0.85 s".
- **Palettes per slide, cross-fading:**
  - **Stage card:** three tone layers cross-fade (`bg-stage-led|bag|gravity`):
    - LED: graphite #141518 → #1E2024;
    - bag: teal → floor teal;
    - drop: beige.
  - **Floating specimens:** they take the slide's two colours, lerped per instance over about 0.5 s.
  - **Ribbon:** its three colours are registered `@property` values, so they transition.
  - **Page:** a faint tint over the paper.
  - **Chips:** the confidence chip goes gold (LED), sand (bag) or teal (drop), and the How it works tile goes teal or graphite.
- **Orange only on Ano:**
  - the specimens' apricot is gone (accent parts take the palette);
  - How it works' LED circuit is graphite, teal and gold (Robotics);
  - the final call to action's specimens are sand and teal.
- **Ano's face:** the hero always uses his happy face and looks at the camera, so the eyes are even and the smile centred. The surprised and curious faces were the "three circles", and cursor-tracking pushed the features off centre.
- **Particles, each with a physical cause (§0 bans sparkles):**
  - a soft beam from the stage lamp with dust drifting through it (added light on the dark stages, laid on normally on the beige one);
  - dust puffs where each ball lands;
  - the trapped CO₂.
- **More detail, no more models:**
  - the specimen LED now has a see-through tinted lens with its anvil, reflector cup, post and bond wire inside;
  - the AA cell has crimped steel rims;
  - the beaker has printed tick marks;
  - accents are split out so the specimens read in each palette.
- **Lab colours elsewhere on the landing:** the map path, the paper tints and the lab cards were already done in the sweep.
- **Stray dot and peach highlight:** the dot couldn't be reproduced in a capture. It was most likely a small dark specimen near Ano's head, and the floating layout and colours have changed. The peach behind "Explore 21 experiments" was the ribbon's apricot crest and an apricot specimen; both now take the slide palette.

## Also fixed (from the e2e run before this brief)
- The small level tiles are links again ("Or go straight to"), named by their visible text plus the level name. This fixes axe label-content-name-mismatch and the first-load flow's "Easy" link.
- The shelf's end tags stay inside the shelf: the landing was 417 px wide at 390.

## Checks on the production build
- tsc, lint and the slop scan (0 hits) are clean; vitest passes 530.
- After screenshots have no page errors.
- **Draw calls:**

  | Page | High | Medium | Low |
  |---|---|---|---|
  | Landing | 65 | 45 | 41 |
  | Lab select (`/start/medium`) | 48 | 53 | 48 |

  LED lab 81–84, bag 63–64. All are under 150.
- **FPS: not measured validly.** The perf run read a flat 30 fps on every page, including the unchanged dev-only design-system page at 16 draw calls, because the Mac was on battery at 5% with Low Power Mode on, which caps Chrome's frame rate. Re-run `GAUNTLET_ROUND=final-s4 GAUNTLET_SKIP_BUILD=1 GAUNTLET_CHANGED=all npx playwright test tests/e2e/perf.spec.ts` on mains power. Earlier runs this session, before the landing work, were 59.9 fps on all tiers.
- **The e2e suite was not re-run after the fixes above,** for the same reason (battery). The previous run was 95 of 99, and the 4 failures are the ones fixed above.

# Black and gold, then earthy sage (owner's request)
The owner asked for "black golden for a few scroll downs, then earthy sage vibes", applied to the pages I judged best. DESIGN.md pins the cream Bright Lab palette, but this was a direct request, so DESIGN.md is untouched and its other rules hold: one hue per gradient, light paper cards, no orbs. Both moods come from the lab palettes: night is Robotics' graphite and gold, sage is Chemistry's sage, sand gold and teal.

## Where each mood goes
- **The landing:**
  - the hero keeps its per-slide palettes;
  - then a **black and gold** block (`bg-paper-night`, graphite with no grain, inset like the hero's frame) for How it works, the two labs and Meet Ano;
  - the rest of the page is **sage paper** (`bg-paper-sage`): the belief deck, the level dial, the final call to action (its frame on sage) and the footer.
- **On the night block:**
  - **How it works:** light type, gold step number, gold active step and a gold progress rail.
  - **Lab cards:** a gold hairline, so Robotics' graphite card keeps its edge.
  - **Meet Ano:** stays a light paper card.
- **Sage pages:** level select, lab select, My beliefs and Credits. Credits' "almost no colour" open issue is fixed by this. The lab maps keep their lab tints, and the labs keep their worlds.
- **Level colours, everywhere:** Easy sage, Medium sand gold, Advanced teal (white text). That covers the element tiles, mini tiles, the register's tiles and the knob's zones. The knob's needle is gold and its LCD sand gold. The beliefs line's icon is teal.
- **Ribbons follow the paper:** sage to teal on sage, and gold on night.
- **Copy:** the level section's line now says knob, tile and shelf.

## Found and fixed
- **Stale styles in the dev server.** After several restarts it served stale CSS for new `@utility` classes, even though Tailwind's scanner and compiler both produced them. Turbopack's persistent cache in `.next-gauntlet` was to blame, and clearing it fixed it. This also explains the earlier `bg-lab-*` mystery: the rename to `bg-*-world` wasn't needed after all.
- **Meet Ano's heading** went white on its cream card when the whole night block set light text. Light text is now set per section.
- **`content/landing.json`** was re-serialised in its original compact style after an edit.

## Checks (production build, on AC power, Low Power Mode off)
- tsc, lint and the slop scan (0) pass; vitest passes 530.
- **e2e:** flows, overflow and quality pass **99 of 99**.
- **FPS: 59.9 on all three tiers, zero jank, on every page.**

  | Page | Draw calls |
  |---|---|
  | Landing | 69 / 45 / 41 |
  | LED lab | 82–85 |
  | Bag lab | 63–65 |
  | Lab select | 48–53 |
  | Design system | 16 |

- **Screenshots:** `tests/screenshots/moods-after/`:
  - full pages at 1440 and 390;
  - landing sections in view;
  - every hero slide.

  The "before" for this change is `tests/screenshots/levels-after/` and `landing-after/`.

---

# Session 5: make it feel alive (component libraries, better 3D, interaction, scroll story)
Brief: better models, more interaction, more motion and real scroll animations, using Animmaster, Aceternity and Skiper as the main source. Work page by page:
- landing;
- level and lab select;
- labs;
- the rest.

After each page: screenshots at 1440 and 390, a scroll video, and a fresh-context Critic. Ten iterations at most. Before set: `tests/screenshots/alive-before/` (9 pages at 1440 and 390, plus scroll videos).

## Licences, read again today (28 October 2026), and the decision
- **Aceternity** (ui.aceternity.com/licence): its own licence. "You cannot re-distribute the Item as a stock image or its source files, regardless of modifications."
- **Skiper** (/docs/terms-of-service): "You must not: … Reproduce, duplicate or copy material from skiper-ui.com … Redistribute content". No open licence is stated for the "Free Component" items.
- **Animmaster** (/terms.html): paid packs only. "non-exclusive, non-transferable license"; you may not "Resell or redistribute the library or its source files".

**Decision.**
- **No code from any of them.** CLAUDE.md §2 rule 8 allows only MIT, Apache-2.0, BSD, ISC or CC0 code, and this is a public MIT repo, so pasting their source would redistribute it.
- **The three libraries are the main design source.** Each pattern below was studied on its demo (structure, trigger, timing, physics) and rebuilt from scratch in our own code, with our tokens, fonts, icons, reduced motion and quality tiers, and credited in RESOURCES.md §11 and the README.
- **The brief's "only free components we're allowed to use" holds:** none are allowed as code, so all are used as studied patterns.

**GSAP** 3.15.0 is installed (RESOURCES.md already approved it under GSAP's free "Standard no-charge" licence: use the package, don't copy its source) for ScrollTrigger, driven by Lenis on one ticker.

## Shortlist: pattern → where in ANOMALY → why

**Aceternity**

| Pattern | Where | Why |
|---|---|---|
| Container Scroll Animation | Hero → How it works: the camera dollies into the stage as you scroll out of the hero | "The camera moves into the stage" |
| Sticky Scroll Reveal | How it works: one pinned scene where the 3D LED experiment plays Predict → Run → Reveal → Rebuild with the scroll | The brief's scroll story |
| 3D Card Effect | Lab cards, the element tile, the level knob's faceplate | Hover tilt with depth layers |
| Magnetic Button | Primary calls to action (Start experimenting, Start, Try it) | Buttons that lean toward the cursor |
| Card Stack | The belief deck (already ours) | Kept |
| Timeline (beam that draws as you scroll) | The gold circuit trace down the black-and-gold stretch | A graph that draws itself, in a science form |
| Animated Tooltip | The labels that pop when you click a 3D object | Name and live values |
| Following Pointer | The soft cursor (already ours) | Kept |

**Skiper** (patterns from its "Free Component" items)

| Pattern | Where | Why |
|---|---|---|
| Text Scroll animation (skiper31) | Every section headline on the landing reveals word by word, scrubbed by scroll | The brief: headlines word by word |
| Animated number (skiper37) | Counts that count up as they appear: experiments, beliefs, the step counter, the tile's numbers | The brief: numbers count up |
| Card stack with gsap and rotate (skiper16, skiper17) | The labs section, pinned: the two lab cards rise and turn into place with the scroll while their 3D cameras orbit | "The labs section reveals both labs with a camera move" |
| Oliver parallax (skiper30) | Cards, 3D views and specimens move at different speeds through the scroll | Parallax |
| Svg follow scroll (skiper19) | The gold circuit trace with a current pulse, drawing down the black-and-gold stretch | A drawn line that follows the scroll |
| Scroll progress (skiper89) | How it works' gold progress rail (already ours) | Kept |
| Scroll with fade effect (skiper87) | Long lists (the belief register) ease in as they scroll | Calm list entrances |
| Custom tooltip (skiper101) | Tooltip shape for the 3D labels | Shared with Animated Tooltip |
| Text roll navigation, Music toggle, Mouse follow (skiper58, skiper25, skiper61) | Header nav, sound toggle, cursor (already ours) | Kept |

**Animmaster** (paid, so only its public category previews were studied)

| Category | Where | Why |
|---|---|---|
| Scroll Animation / 3D Animation | The scroll-scrubbed camera moves into the hero stage and across the labs | Scroll-scrubbed camera moves |
| Physics Effect | The floating specimens: spring push from the cursor, flings, click shock (already ours, tuned) | Kept |
| Page Transition | A curtain wipe between pages in the destination's mood (night, sage or lab colour) instead of the plain colour wipe | Page transitions |
| Hover Effect / Mouse Effect | 3D object hover lift and tilt, Ano reacting to the cursor | Hover and cursor reactions |

**Banned under §0 and not used:** Aurora, background beams, sparkles, Lamp, grid or dot backgrounds, bento grid, glare and glass cards, Evervault, colourful text, Apple AI gradient, progressive blur, gooey effect, canvas crowd, and fake terminals.

## Iterations (session 5)

### i1: the landing, first pass
- **Built:**
  - one scroll engine (`lib/scroll.ts`: GSAP ScrollTrigger driven by Lenis on one ticker);
  - word-by-word headlines (`ScrollWords`) and count-ups (`ScrollCount`);
  - the hero's scrubbed exit, with the camera dollying into the stage and Ano drifting aside;
  - the pinned labs scene, with cards rising in and their cameras orbiting in;
  - the gold circuit trace with a pulse down the night stretch (`NightTrace`);
  - How it works rebuilt as one live 3D bench (`HowBench3D`, the real LED experiment's four states from the engine);
  - `Inspectable` on every bench object: hover lift and tilt, a click label with live values, drag to turn.
- **Decided:**
  - **Pinning:** CSS sticky instead of ScrollTrigger `pin`. The pin spacer broke the layout with Lenis, the flex frame and late 3D.
  - **Hero:** no pin. A sticky hero made a stacking context that put its cards under the site canvas.
- **Critic:** FAIL. The word-by-word headlines lost the spaces between words.

### i2: landing fixes
- **Fixed:** the lost spaces. Each word is now an inline block, with the space outside it.
- **Critic:** FAIL. The scenes read like a slide deck. They suggested sparks on Break.
- **Declined (rule 1, the simulator is the judge):** sparks on Break. The simulator says the LED stays dark, so Break shows the belief's ghost puffing out in teal instead.
- **Changed:**
  - beats per step: a glitch flash on Diagnose, the ghost puff on Break, a gold bloom on Rebuild;
  - a camera shot per step;
  - the How it works title folds away after the first step.

### i3: landing fixes
- **Critic:** FAIL. The biggest problem was a hard clip edge on the How it works view and the bench floating in a void. Also flagged:
  - the battery sleeve says "1.5 V" while the run says 3 V;
  - an orphan reality line;
  - a gap above Meet Ano;
  - pale shelf props.
- **Changed:**
  - moved the reality line;
  - tightened Meet Ano's padding;
  - gave the bench a floor pool.

### i4: level and lab select, first pass
- **Built:**
  - the knob, tile and shelf with `Inspectable` models;
  - count-ups;
  - a designed empty state for the belief list and `app/error.tsx`.
- **Critic:** FAIL. Ano's bubble isn't attached to Ano and the page is a flat stack. Also flagged:
  - the knob and Start fall below the fold;
  - no Ano on lab select;
  - faint shelf glass and cut end models;
  - lumpy floating shapes at the edges;
  - the lab card caption crowds the bench;
  - "Open the map" should be a pill.

### i5: fixes for i3 and i4
- **Ano in the headline** (`HeadlineWithAno`): Ano stands in the gap of "PICK · YOUR LEVEL." and "CHOOSE · YOUR LAB." His bubble hangs from him with its tail pointing up at him (measured from where the gap lands). On phones he stands beside the bubble. He waves on arrival and reacts to each level (hop, nod or spin).
- **Picker in three columns** (knob → tile → beliefs and Start): everything, mini tiles included, fits in the first screen at 1440 × 900. The landing's level section gets the same layout.
- **Shelf:**
  - a deep teal cabinet back, so clear glass reads;
  - slots inset 4 % from each end, and models fitted to 72 % of a slot, so no end model is cut.
- **Specimens on explore pages:** cut from 7 to 3 (flask, molecule, cell), all on the right. None at the edges, by the logo or under Ano.
- **Lab cards:**
  - "Open the map" is an ink pill that lifts on hover;
  - the bench camera backs off on narrow cards, so the whole bench fits on phones.
- **ScrollCount** starts as soon as any of it shows, so a 0 never stands at the screen's edge.
- **Battery:** the holder's front wall prints the pack's total ("3 V"). Two 1.5 V cells in series are the simulator's 3 V, so the cells keep their real label.
- **How it works:**
  - **Tried and dropped:** a full-bleed view shifted with `setViewOffset`. The close-up shots made the bench huge, so it covered the caption column.
  - **Now:** the view stays in the right column, bare on the dark. Each step's shot is an orbit, and its distance is worked out from the view's shape, so the whole bench is always in frame (no seam). The floor pool fades out inside the view.
- **Critics on i5:**
  - **Selection pages:** FAIL. Knob, tile and Start didn't read as one row: their tops were misaligned, the row started off the page edge and Start floated. Also flagged: specimens cut at 390, the How it works ghost label landing on the meter, the shelf at 390, and "7" printed three times on the level card.
  - **Labs:** FAIL. On phones and tablets the 3D scene was out of view while the experiment ran and when the verdict landed (Run sat two screens below the stage). Also flagged:
    - the ghost and reality labels stacked on the LED and were cut by the Inspector;
    - Ano parked over the build;
    - a coral splat on a dark LED;
    - the scale's LCD ("128.88." with a stray-dot "g");
    - drifting specks on the teal wall;
    - "Your idea: Less" sitting on the bag.

### i6: fixes for both i5 Critics
- **Level select, one instrument:**
  - columns of 19 rem (knob), 21.5 rem (tile) and the rest (readout);
  - the knob column (knob, "Or go straight to", mini tiles) is as tall as the tile, so Start lands on the tile's bottom edge;
  - the row starts on the headline's left edge;
  - the beliefs readout has a big count, "beliefs to break" and the teaser.
- **Level card:** the line under the title says what's still to come ("2 more on the way") instead of repeating the count.
- **Specimens:**
  - none on phones on the explore pages (`COMPACT_COUNT`), where the stacked headline leaves no room beside it;
  - the molecule and cell take the teal so they read on sage.
- **Shelf:** the cabinet back is lower on narrow shelves; models sit a little back from the plank's front lip.
- **How it works:**
  - the multimeter moves to the far end from the LED, so the LED's "Your idea" label never lands on it;
  - the teal ghost halo ignores depth, so it no longer shows a hard edge where it met the bench top.
- **Labs, phones and tablets:**
  - below `lg` the HUD becomes one column ordered dock → Ano → mission → inspector, so Run is one short scroll under the 50 svh stage;
  - pressing Run scrolls the stage back into view, so the run and its verdict play on screen;
  - Ano's home on narrow views moves to the stage's top-right corner, clear of the readouts each stage puts low and in front.
- **Labs, one label per part:**
  - a selected part's inspect label carries the student's idea (the lamp ghost's words, or the prediction), and the floating "Your idea" label steps aside (`labView.idea`);
  - the label sits higher and is always drawn over its part;
  - the selected slot shows a gold ring instead of a filled gold plane, which read as a glow.
- **Labs, the reveal shot** leans toward the part that shows the result, so it and its label sit in the clear middle.
- **Ano's flight in the lab:** he now flies to just beside the part on its outer side, clamped inside the clear middle (the HUD covers the edges), and takes the inner side if the outer one has no room. He no longer parks over the build.
- **ANOMALY sparks:** they spray low from the floor ring. On the LED's head they read as a burnout the simulator didn't show.
- **Scale:**
  - the LCD is drawn at twice the resolution with anisotropic filtering, and the "g" is big enough to read;
  - the ghost label floats in front of the balance, under its display (the stage's "ghost" anchor shares the spot through `scaleGhostAt`).
- **Dust removed** from the lab rooms. With no beam to sit in it read as twinkle (§0).
- **Inspector:** no more "LED · LED"; the slot name shows only when it adds something.
- **Critics on i6:**
  - **Pages:** FAIL. The /start readout column stopped at 24 rem, with a void above Start. Also flagged: pale specimens, Ano's edge fringe, a hard-edged ghost and a flat gold glow disc in How it works, mixed quotes, faint mini tiles, the "YOURLEVEL" word gap, the flask by "LAB.", and metadata crammed into the Robotics button.
  - **Labs:** FAIL. The merged label sat on the LED dome and hid the ghost, so ghost beside reality never showed; the legs and the battery's + end weren't in view.

### i7: fixes for both i6 Critics, and the rest of the pages
- **/start readout:**
  - the column runs to the row's right edge and fills its height: the count, three of the level's beliefs (numbered, typographic quotes), and its split between the labs (`level-picks` now carries `teasers` and `labs`);
  - mini tiles show the level's name, at full opacity with a hairline ring;
  - headlines with Ano get a little word spacing.
- **Specimens on explore pages:** teal (flask liquid, molecule, cell band) and bigger; the flask moved up and right, off "LAB.".
- **Lab cards:** the coming-soon count joins the card's label ("3 experiments · 2 coming soon"), so both buttons read "Open the map".
- **How it works and every glow:**
  - the gold bloom disc on Rebuild is gone (a glowing circle, §0);
  - the glow texture falls off softly with no rim;
  - the real LED's halo is smaller and drawn over the board, so it never shows a hard edge.
- **Labs: the ghost beside reality.**
  - The lamp's ghost stands beside the real lamp on screen (to its left, worked out from the camera each frame, whatever way the slot faces), glowing the way the student expected. Before, it was tucked behind the lamp and hidden.
  - When no listed misconception matches, the lamp's ghost is a picture of the prediction itself ("Glow" glows, "Burn out" burns out, "Yes" to "will it light?" glows). It is never a simulation: the verdict and readings stay the simulator's. The engine is unchanged.
  - The inspect label is anchored by its bottom edge, so it always sits above the part on screen.
  - Ano flies to just below the part and off to its outer side, the corner the label and the ghost leave free.
- **Labs, the reveal shot:** an upright lamp is seen from 20° to the side, so its two legs read apart. The shot aims a little behind the middle, so the battery drops clear of the mission card.
- **Bag:** the "Your idea" labels are smaller than the balance's reading.
- **The rest of the pages:**
  - **Experiment maps:** in their lab's colour world. Chemistry is teal (new `bg-paper-teal` and a sand-gold ribbon) and Robotics is the night mood, so the lab card grows into the same colour. The headline is white, the logo sits on a card, the path dashes are in the lab's light colours, and the next experiment is marked in the lab's gold instead of apricot.
  - **404:** sage, like the error page.
  - **Off apricot:** the shelf plank is bench beige with a sand-gold lip, and the "Challenged" stamp and dot are teal.
- **Critics on i7:**
  - **Pages:** FAIL. On the maps and the 404, Ano's bubble pointed at the headline while Ano stood elsewhere (behind node 01, or not beside it). Also flagged: lab select's buttons below the fold, pale specimens, Ano off-centre on /beliefs, straight apostrophes from content, orange in the sound toggle, and Ano's fringe.
  - **Labs:** FAIL. The hint ("which leg faces the battery's plus side?") couldn't be answered from the scene: the battery was small with no + mark, the LED's legs overlapped, and Ano covered the LED on phones.

### i8: fixes for both i7 Critics
- **Every page headline with Ano uses `HeadlineWithAno`:** level select, lab select, the maps, My beliefs and the 404.
  - Ano stands in the gap and the bubble hangs from him.
  - The map's peeking Ano is gone, so there is one Ano per page.
  - The 404 keeps his shrug (`useShrug`, shared with the error page).
- **Specimens are off level and lab select.** Ano now carries those headlines, and three rounds of Critics read the pale specimens as debris; the hero and the final call to action keep theirs.
- **Lab select:** the cards' 3D views are shorter on wide screens, so both "Open the map" pills sit in the first screen at 900 px.
- **Apostrophes:** content text gets typographic ones (`lib/typography.ts`: the level readout and the belief rows), and the 404's copy has them too.
- **Belief rows:** titles wrap on phones instead of truncating.
- **Sound toggle:** its accent bar is gold, not orange (orange stays Ano's).
- **Ano's dotted dark rim** was his mirror-sharp clearcoat catching the studio's dark floor at grazing angles. A softer, blurrier coat (0.55, roughness 0.32) keeps the gloss without the rim (checked at 2×).
- **Labs:**
  - the battery has a printed + (gold) and − on the board by its ends;
  - an upright lamp's reveal turns 28° to the side and leans only a little toward it, so the battery and the LED are framed together;
  - a stage can name Ano's spot (`"ano"` anchor): the circuit puts him above the lamp's label against the back wall, where beside the lamp the ghost and the board left no room;
  - on narrow views he stays in his corner;
  - his bubble keeps to his reaction (the first hint is the result card's Nudge, so it no longer repeats);
  - in-scene labels are drawn 1.5× on phones;
  - the bag's escaping gas is faint wisps instead of glow dots, and its bubbles are sage and teal, so they show on the tray.
- **Critic on i8** (one Critic, every changed page): FAIL on the LED lab only. The hint still wasn't answerable at a glance: the battery's + sat under the mission card, one leg was buried at the wire corner, and on phones Ano's corner overlapped the LED. The pages scored 4 or more on almost every point; the 3s were spacing on /beliefs and the 404, and polish on the maps.

### i9: the LED lab, one focused round
- **The LED stands taller** on longer legs (the anode's lift 0.17, the cathode's 0.06), so the long and short legs read apart from the bench camera. Its label rides higher, nudged toward the middle of the board.
- **The reveal frames the whole board** a little wider (×1.1, leaning only a fifth of the way toward the lamp), so the battery and its printed + sit clear of the mission card.
- **On phones**, Ano waits top left over the wall, clear of the lamp at the board's right end.
- **The dock's bubble drops its tail while Ano is away** pointing something out (LabAno sets `data-away` on the dock), so it never points at empty space.
- **Captions** (toasts) sit at the top on phones, where the lab's dock fills the bottom.
- **Lab chips:** the "Medium conf." chip, the "Live" label and the result card's "dashed teal ghost" copy use the lab's teal, not the off-palette blue.

### i10: final checks and the final Critic
- **Final build:**
  - `tsc`, lint, the slop scan (0 hits) and vitest (530) pass;
  - e2e 193 of 193 on the build before round 9, then flows, overflow and performance (74 of 74) on the final build, and flows again after the battery fix (10 of 10);
  - 59.9 fps with zero jank in all three tiers;
  - draw calls peak at 111 (the landing on High).
- **After set:** `tests/screenshots/alive-after/` holds 9 pages at 1440 and 390 and their 1440 scroll videos, plus the ANOMALY states of both demo labs.
- **Final Critic** (production build): FAIL.
  - **The biggest problem was a real bug, found here and fixed.** `Battery3D` drew its + (the gold lead, and this session's printed +) on terminal b, while the simulator's + is terminal a (`engine/circuits/parts.ts`). So the board showed the LED's long leg facing + while the verdict said "backwards". The battery now puts its +, gold lead and the front cell's banded end on terminal a, mirrored when `flipped` (it ignored that prop before), and `PartModel` passes `flipped`. Checked in the result shot: the gold lead now runs along the top wire, and the long leg goes to the − end. The engine is unchanged.
  - **Its other points are listed as open in HANDOFF.md.** The iteration cap is reached.

### Session 5 totals
- **Iterations:** 10 of 10.
- **Critic verdicts:** all FAIL (the bar is "no point below 4 anywhere"). Each round fixed the previous round's biggest problem, and the pages ended at 4–5 on most points. What's left is clarity and spacing in the two demo labs at 390, the bag model, and a few page details.
- **Decisions made here:**
  - CSS sticky pinning;
  - no pinned hero;
  - specimens off the explore pages;
  - one `HeadlineWithAno` for every page with Ano;
  - the lamp ghost drawn from the prediction when no misconception matches (a picture, never a verdict);
  - Ano's softer clearcoat;
  - dust removed from the labs;
  - the maps in their lab's colour world;
  - toasts at the top on phones.

# Session 6: easy for kids, smoother (28 October 2026)
Brief: fix the experiment page, the landing hero, How it works and the cursor; rewrite every word for the student's level (grades 6–8, 9–10, 11–12) so a 12-year-old understands it; make the site smoother. Rules: no engine changes; follow DESIGN.md; no mutating git. Before set: `tests/screenshots/kids-before/` (the pages, every hero slide, and every experiment as it opens and after a run, at 1440 and 390).

## Decisions
- **Content rewrite in four parallel passes**, one shared rules file (level, ≤15 words a sentence, one idea each, everyday comparisons, Ano as a friendly older student):
  - chemistry experiments and their theory;
  - robotics experiments and their theory;
  - all 31 beliefs and hint ladders;
  - Ano's lines, the landing, levels, labs and coming-soon copy.

  Ids, numbers and structure are unchanged.
- **Option renames only where the words were unclear:** the "scale will read" experiments (sealed bag, dissolving, burning) now offer "Gets heavier / Stays the same / Gets lighter". The `answer` mappings, tests and e2e specs were updated to match (strings only).
- **The hero headlines stay as DESIGN.md §7.1 pins them** (PREDICT · TEST IT., GUESS · BREAK IT., THINK · PROVE IT.); a pass had changed them. The lower band's "Interactive intuition lab, powered by Ano" became "A science lab where you guess first", as the owner asked, over DESIGN.md's text.
- **UI wording:**
  - "Inspector" → "What's happening" ("Live" → "Right now"; its row labels in plain words);
  - hint rungs Nudge / Principle / Fix → Hint / Why it happened / How to fix it;
  - "High/Medium/Low conf." → "You were sure / You were fairly sure / You were guessing";
  - Ano's diagnosis is worded apart from that chip: "Maybe you used this idea:" or "This looks like the idea you used:";
  - Prediction / Reality → You guessed / What really happened;
  - "Belief shift" → "What you just learned"; "Anomaly spotted" → "Surprise!"; "Verified" → "True!" (on cards) or "Right!";
  - "My beliefs" → "My ideas" (the route stays `/beliefs`); "beliefs to break" → "tricky ideas to test"; belief stamps Broken / Challenged → Busted / Testing;
  - "Run · predict first" → "Run (guess first)".
  - The big ANOMALY word stays (the brand moment), with a plain line under it: "Surprise! That's not what you guessed."
- **Ano's bubble never repeats the panel:** the "stuck" state says one short line of his own; the hints are only in the result panel.
- **The melting graph fits its data:** the heat chart's y-axis is fitted to both curves (padded by a tenth, tidy 1/2/5 ticks), so the gap between the guess and what really happened is plain. `Graph3D` already did this.
- **The bottom panel never covers the apparatus:**
  - on wide screens the lab camera zooms the picture out about its top edge (pinned under the top bar), just enough that the space above the dock holds what each shot frames (up to 1.4×, eased);
  - a short dock changes nothing;
  - a first version that slid the picture up pushed top labels (the jar's "Open to the room") under the bar, so it was dropped;
  - Ano's home allows for the zoom;
  - he flies only to a spot a stage names (`"ano"` anchor: the circuits), so he never lands on a beaker.
- **The hero:**
  - each slide's experiment is larger and Ano is small, floating to its right;
  - the camera looks down a little, so the tops of things read;
  - the gravity slide's stage is a strong gold;
  - where the headline crosses a dark card (graphite or teal) its letters turn white: a white copy, clipped to the card, follows it through resizes and the scroll scene (`HeroHeadline`).
- **The sealed bag reads as a bag:** a low milky pillow (flat on top, rounding to the welded seams, never a dome), crinkles that stay, a coloured zip along the front where it shows, and a white write-on panel printed on top. Gas escapes from the front zip when it's open.
- **How it works:**
  - the word reveal plays once, to the end, when the heading comes into view (a scrubbed reveal could stop part-way and leave words low and clipped);
  - the fold has room under the heavy type;
  - the battery sleeve says "AA" only, and the pack says "3 V" (the simulator's one value).
- **Cursor:** a clear arrow pointer (ink with a white edge, about 23 px, tip on the pointer) instead of a 4 px dot. The ring over clickable things stays. Ink instead of apricot (orange is Ano's).
- **Smoother:** scroll handlers no longer read layout on every scroll event: the pinned How it works uses cached offsets and `scrollY`, and the hero headline's clip follows on the GSAP ticker only while the hero is on screen. Measured below.

## Smoother: measured, found, fixed
Probes on production builds (Apple M1 Pro, 1440 × 900): frame times from `requestAnimationFrame` while the wheel scrolls each page, and around each interaction.

| Moment | Before | After |
|---|---|---|
| Scrolling My ideas | 53 fps, ~10 % of frames at 33 ms | 60 fps, no slow frames |
| Scrolling the landing | 59.6 fps, about 4 frames over 20 ms | 59.5 fps, about 3 (single frames as a new 3D section first appears) |
| Hero slide change (mouse) | worst frame 166–183 ms | 16.8 ms, no dropped frames |
| Turning the level knob to a new level | worst frame 217 ms | 33 ms (one frame) |
| Level select → lab select | worst frame 83 ms | 67 ms (one frame, during the page wipe) |
| Running an experiment (LED) | smooth | smooth |

Causes found and fixed:
- **Hover effects while scrolling.** Rows and cards sliding under a still mouse each started a hover fade, which repainted mid-scroll. Bisected on My ideas: smooth with the mouse off the list, or with the row transitions off. `ScrollHoverGuard` (mounted once) sets `html[data-scrolling]` while a scroll moves, and `pointer-events` are off until 150 ms after it stops.
- **The audio context made inside the first click.** Starting the audio device took ~100 ms on the first gesture: that was the slide-change and knob hitch. `warmAudio()` makes it, suspended, in idle time after load; the gesture only resumes it.
- **Re-rendering the hero in the click.** Slide changes are now a React transition (`startTransition`).
- **The knob's level.** The level-dependent render is deferred (`useDeferredValue`), so the knob itself always answers at once.
- **3D models built or compiled on demand.**
  - all three hero experiments stay built, and only the slide's one shows (compiled together up front);
  - every level's shelf stays built (compiled in the background with `compileAsync`);
  - the lab cards compile their benches in the background and spring them in when ready.
- **Layout reads on scroll.** The pinned How it works uses cached offsets and `scrollY`, and the hero headline's clip follows on the GSAP ticker only while the hero is on screen.

## Read as a 12-year-old (a fresh reviewer, every page and content file)
- **Content:** 20 more strings simplified in 14 files.
  - Idioms such as "flat out" and "in line with" replaced.
  - "Bonds" and "joules" explained.
  - "Indicator colours" → "Cabbage juice colours".
  - A flask the copy called a beaker.
  - The hero's belief titles reworded so they state the right idea.
- **UI fixes from the review:**
  - **Hero belief card:** after a wrong guess it says "The idea you just busted" with "Not true!" (it had shown a busted idea under "What you just learned").
  - **Labels and copy:**
    - "Your call" → "Your guess";
    - "You predicted…, the simulator showed…" → "You guessed…, the lab showed…";
    - the third hint rung → "Try this";
    - zoom captions say "tiny bits" instead of "molecules";
    - "real time" → "in a real lab";
    - "Brownness before/after";
    - "Switches per second";
    - the knob's "GR" → "Grade".
  - **Easy circuits:** they show only "Flow (current)" and brightness (voltage and power wait for Medium).
  - **e2e:** `flows.spec.ts` updated for "Change something and try again".
- **Left on purpose:**
  - **Gas laws options:** "Rise/Fall in proportion" (Advanced) can't be explained without giving the answer away.
  - **Titles:** "Mass in a sealed bag", "Melting and particles" and "Activation energy and catalysts" are CLAUDE.md's names, so they stay; their intros and theory explain the words.
- **Full list:** every content string changed this session, old → new, is in `tests/screenshots/kids-after/wording-changes.md` (generated from the previous build's source maps against today's files).

---

# Session 8: ANOMALY becomes a cancer science lab (28 October 2026)

Brief: CodeTheCure reframe (the new CLAUDE.md, with DESIGN.md and GAUNTLET.md from the owner's newer copies), then two follow-up briefs from the owner during the session: a 3D visual upgrade, then a site-wide text polish pass.

## Decisions made
- **Newer DESIGN.md and GAUNTLET.md:** the repo copies are older (no cancer content, 13 gates). The owner's newer copies in `~/Documents/soren-test/` (saved with the new CLAUDE.md) were followed. Copying them over the repo files was blocked (DESIGN.md must not be edited), so the repo files are unchanged.
- **CLAUDE.old.md** didn't exist; the previous CLAUDE.md was read from git (`HEAD:CLAUDE.md`, read-only) and merged into §12.
- **Two misconception ids per experiment where the spec lists two fingerprints:** the engine diagnoses with one wrong model per id, so "nothing happens" and "only at the very end" (chemo), "same every month" and "fast at first" (tumour), "almost none" and "about half" (UV), "like a cold" and "only after a long touch" (contact) each have their own wrong model under the spec's root belief.
- **Cells out of control as two experiments:** the spec's two questions became "Cells out of control" (Cell, Easy, 1) and "Can you catch cancer?" (Cell, Easy, 2), since the engine asks one question per experiment.
- **UV figure:** Cancer Research UK's "over 90% of UV rays can still pass through cloud" is used (the WHO fact sheet gives no figure; WHO's 2002 "up to 80%" guide was not mixed in). The model lets over 90% through ordinary cloud.
- **Hair regrowth wording:** "often" (NCI) and "most ... reversible" (ACS); never "always".
- **Hidden labs:** chemistry and robotics keep code and routes; `lib/labs.ts` lists visible labs; `EXPERIMENTS` is cancer-only, `ALL_EXPERIMENTS` keeps routes working.
- **Ask Ano safety:** a personal-health question is answered by a written warm redirect before any limit or model call (it doesn't use a question). Science questions about cells ("Will the hair cells be okay?") are not redirected.
- **UI sources:** Aceternity, Skiper and AnimMaster forbid redistribution; React Bits is MIT + Commons Clause. Nothing was copied; existing in-house rebuilds were kept (shortlist below).
- **3D models:** the best free fits (Sketchfab CC BY "CT Scanner" by Ng Jun Wei, "Microscope" by VeeRuby Technologies) need a Sketchfab account to download; Poly Haven's CC0 microscope is a worn vintage model; NIH 3D's microscope is AI-made with invented brand text; no free unbranded linac or UV meter exists. So every model is built in code (`components/lab3d/kit/apparatus.tsx`). The cloud puff texture is generated in the repo (no outside asset).
- **Live mode and teacher view** don't exist in this codebase (CLAUDE.md §6 lists them as built). Not built this session: experiments came first per §11.

## Needs owner
- Copy the newer DESIGN.md and GAUNTLET.md from `~/Documents/soren-test/` into the repo (blocked for me).
- Sketchfab CC BY models (CT scanner, microscope) if you want them instead of the code-built ones: they need an account to download; credit lines are ready in RESOURCES.md §13.
- Keys for the live site (Groq, ElevenLabs, Upstash) and the Vercel deploy; nothing ran against real providers.
- Live mode and teacher view: build, or drop from CLAUDE.md §6.

## UI shortlist (RESOURCES.md §12, licences read 28 October 2026)
Study-and-rebuild only: React Bits Split Text (hero words), Stack (belief deck), Tilted Card (lab cards), Carousel, Target Cursor, Count Up, Magnet; Aceternity Sticky Scroll Reveal (How it works); Skiper Rolling text and Stairs (transitions). Used directly: GSAP ScrollTrigger (pinned How it works), Lenis.

## Rounds
- **Round 0 (reframe):** cancer framing, four labs, hidden old labs, learning note, citations (41 confirmed quotes from the four trusted sources), zod checks (a missing citation id fails the build), root beliefs, `/science`, `/demo`.
- **Round 1 (chemo and hair loss, Treatment, Medium, hero slide 1).**
- **Round 2 (how tumours grow, Detection, Easy, hero slide 2).**
- **Round 3 (cells out of control and can you catch cancer, Cell, Easy, hero slide 3).**
- **Round 4 (UV on a cloudy day, Prevention, Easy).**
- Rounds 5 and 6 (radiotherapy beams, born with it) not started; they show as "coming soon".
- **Visual upgrade:** living cells (membrane, nucleus, wobble, rim light, split), microscope eyepieces, code-built microscope, scanner, UV meter and treatment machine, sun and clouds, curved backdrops with real benches and baked shadows.
- **Polish pass:** `tests/e2e/polish.spec.ts` (clipped text, overlaps, idle shaking, CLS) on 10 pages at 4 widths; all fixed (see HANDOFF.md).
- **Ship checks:** flow tests looked for the old "anomaly detected" words; they now check the real status line ("not what you guessed"), and the demo path passes. The 3D graph card's title ran into a six-digit count; the title now shrinks to fit and counts get thousands separators. Theory view shows the "Try it at home" card where the experiment has one.
- **Licences:** GSAP's standard licence (approved in CLAUDE.md §7) is now listed in `npm run licences:documented`, which passes.
