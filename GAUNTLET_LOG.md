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
