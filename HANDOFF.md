# HANDOFF.md

The unattended gauntlet (GAUNTLET.md) ran from setup through round 6 on 16 October 2026. The full round-by-round record, with every decision and its reasoning, is in `GAUNTLET_LOG.md`.

## Summary
1. **All six rounds are done:**
   - the Bright Lab design system;
   - 3D Ano;
   - the landing page;
   - the selection pages;
   - an experiment page that is fully 3D for all 21 experiments (none left in 2D);
   - page transitions, loading, 404 and a final cleanup.
2. **The final full run, on every page, passes every gate**, with two exceptions. G12's literal command fails on one LGPL binary that Next.js installs, and it passes with the documented exception. G11 ran on the mock provider only, because there are no API keys.
3. **Performance:** 60 fps on every measured page, also on the Low tier with the CPU throttled 4×, at 16–65 draw calls.
4. **Nothing is committed.** No git command that changes anything was run. Ten suggested commits, grouped by branch, are below.
5. **Needs you:**
   - API keys;
   - approval of the AI provider mapping;
   - confirmation of the libvips licence exception;
   - the missing reference image;
   - a few design calls (the questions at the end).

## What's done, per queue item
| # | Queue item | Done |
|---|---|---|
| 0 | Setup | DESIGN.md and GAUNTLET.md copied into the repo and referenced from CLAUDE.md. Playwright gates on the production build, with axe, hit areas, screenshots and frame sampling with CPU throttling. The licence gate. GAUNTLET_LOG.md. The 11 failing chemistry theory tests fixed with checked OpenStax sources. Ask Ano rebuilt as one job with one provider, with startup key validation, server-side limits, the voice route and a 20-question eval with a mock |
| 1 | Design foundation | DESIGN.md §3 ramps, gradients and warm shadows, and the §4 fonts (Archivo condensed, Geist, Geist Mono) in the Tailwind theme. Every §5 component in `components/ui/` (cva variants, hit area equals visible area). The P1–P7 patterns. The light soft cursor and VFX. A dev-only `/design-system` page with the font comparison |
| 2 | Ano 3D | One persistent site canvas with drei Views. High/Medium/Low quality tiers (detect-gpu plus PerformanceMonitor). Ano built in code: glossy shell, canvas face with 5 expressions; moves wave, nod, hop, spin, boop and shrug; blinking, breathing, cursor-following, visor reflections |
| 3 | Landing | The hero carousel with the giant split headline and Ano in the gap. The "Which falls faster?" drop experiment playing in place. How it works, Labs, Meet Ano, the belief wall, the levels strip, the final call to action, the footer and credits |
| 4 | Selection pages | Level select (Ano peeking over Medium), lab select (3D flask and rover cards), the experiment map (a path of nodes with status and Ano by the next one, plus a level-complete celebration), My beliefs (a filterable belief grid). One top bar with Level · Lab · Experiment breadcrumbs |
| 5 | Experiment page in 3D | One continuous 3D studio lab per experiment, with a camera that guides arrive → build → predict → run → reveal and lets you orbit, zoom and reset. A shared apparatus kit. Light the LED and Mass in a sealed bag polished first, then the other 13 stages. Ghost of the prediction vs reality; ANOMALY freeze and glitch; success shockwave and confetti; zoom to particles or current; a live 3D graph; click-to-inspect labels; Ano flying to the part that matters. A light glass HUD |
| 6 | Transitions, VFX and final pass | Shared-element morphs (level card → lab select, lab card → map, map node → mission card), a Sunrise wipe everywhere else, reverse on back, a quick fade with reduced motion. A preloader and route loading screen (a CSS Ano assembling with a real percentage). The 404, "LOST · IN SPACE.". Render only when needed. Legacy tokens, fonts and 2D stages removed. Scroll-speed skew and count-up readouts. The full gauntlet on every page |

## Final gates (round 6, every page, production build)
| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | `npx tsc --noEmit` |
| G2 Lint | Pass | `npm run lint` |
| G3 Unit | Pass | 519 passed, 1 skipped (the real-provider eval) |
| G4 Build | Pass | `npm run build` |
| G5 Flows | Pass (9/9) | Journey landing → level → lab → map → experiment; LED and sealed bag, correct and wrong; theory sheet; back navigation and breadcrumbs; carousel arrows, dots and swipe; preloader; 404 |
| G6 Console | Pass | No errors, hydration warnings or failed requests. The only warning is three.js's own `THREE.Clock` deprecation, raised inside R3F |
| G7 Hit areas | Pass | All 29 pages (8 site pages, all 21 experiments): within 2 px, none under 44 px |
| G8 Accessibility | Pass | axe has no serious or critical issues on any page; the keyboard-only run and reduced motion pass |
| G9 Visual | Pass | Every page at 1440, 1024 and 390; every page scores at least 4 on every rubric point (below) |
| G10 Performance | Pass | Apple M1 Pro over Metal: 59.9 fps median, p95 ≤ 16.8 ms, no frame over 50 ms on every target, idle and during a run, normal and on the Low tier with 4× CPU throttling (checked to really apply) |
| G11 AI and voice | Pass (mock) | 30 passed: teacher-quality checks, written-hint fallback, verdict guard, cache, limits, voice fallback. Real providers: not run (no keys; 0 of 30 calls used) |
| G12 Licences | Literal fail; documented pass | `@img/sharp-libvips-darwin-arm64` is LGPL-3.0 (Next.js's optional image binary, server-side only). `@react-three/rapier` has no licence field, but its repo is MIT. `npm run licences:documented` passes |

## Rubric per page (DESIGN.md §12, scored 1–5)
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
| Design system (dev only) | 5 | 5 | 5 | 4 | 5 | 5 | 4 |

The scores were judged against DESIGN.md's written patterns, because the reference image is missing.

## Screenshots
Screenshots are git-ignored, so they're local only.
- **Final, every page:** `tests/screenshots/round-6/<page>-<1440|1024|390>.png`, plus `-full.png` full-page versions.
- **Font comparison:**
  - `tests/screenshots/round-1/fonts-archivo.png`, `fonts-anton.png`, `fonts-bricolage.png`
  - the same three again in `tests/screenshots/round-6/`
- **Earlier rounds, changed pages only:**
  - `tests/screenshots/round-1/`: design system
  - `round-2/`: design system with Ano
  - `round-3/`: landing and credits
  - `round-4/`: selection pages
  - `round-5/`: all experiment pages
- **Gate data:** `tests/.results/quality-round-6/*.json` (per-page hit areas and axe) and `tests/.results/perf-round-6.json` (frame times and draw calls).

## Decisions made (the main ones; reasons in GAUNTLET_LOG.md)
**Look and layout**
- DESIGN.md is followed from its text; the reference image isn't in the repo.
- Fonts: Archivo (condensed, with its width axis) for display, Geist for body, Geist Mono for readouts. Anton and Bricolage Grotesque were shown for comparison on `/design-system`.
- The prediction cards stay DOM glass cards over the 3D lab, for keyboard and screen-reader access. The prediction appears in 3D as a ghost label.
- The giant verdict words are a DOM overlay whose letters assemble out of depth; the 3D moment is the shockwave, confetti and Ano.
- The robot arena mat is dark for contrast (question 5).

**3D and performance**
- One site canvas with drei Views; no post-processing in labs (bloom washes out on cream); faked glass everywhere (one real transmission object at most, CLAUDE.md §9).
- Our own pooled, instanced VFX and spring cameras instead of three.quarks and Theatre.js: fewer dependencies, and 60 fps with 4× CPU throttling.
- Particle views exaggerate small changes so they're visible; the readouts always show the true values.
- The canvas renders only while a 3D view is on screen and the tab is visible.

**Navigation and loading**
- Page morphs use React `<ViewTransition>` with full prefetch on the cards that morph. Back plays the wipe from the top.
- The preloader is CSS (it must show before the 3D canvas exists) and finishes within 3.2 s.

**AI and keys**
- AI: one job per provider (mapping below). A missing key turns its job off and falls back to written hints or browser speech. `ANOMALY_REQUIRE_KEYS=1` makes missing keys fatal, as CLAUDE.md §7.5 asks (question 4).

**Process**
- The 13 remaining stages were built by four parallel helpers in separate files on the shared kit, then reviewed and integrated.
- Housekeeping: one `git mv -n` dry run early on changed nothing. A one-off formatter run on a few files was set back to the repo's long-line style.

## Suggested commits, by branch, in order
Each branch holds the final version of its files. Because some files were edited in several rounds, an intermediate branch on its own isn't guaranteed to build. Merge all ten in this order, then run `npm run build && npm run test && npm run test:e2e`. `RESOURCES.md` has your own uncommitted change from before this session; it was left alone and isn't in these commits.

**1. `claude-align-md`** — "Point the project guide to DESIGN.md and GAUNTLET.md"

- `CLAUDE.md` (changed)
- `DESIGN.md` (new)
- `GAUNTLET.md` (new)

**2. `sustaining/gauntlet-setup`** — "Add the gauntlet: Playwright gates, page list, logs and handoff"

- `tests/e2e/` (new, 6 files)
- `.gitignore` (changed)
- `GAUNTLET_LOG.md` (new)
- `HANDOFF.md` (new)
- `eslint.config.mjs` (changed)
- `next.config.ts` (changed)
- `package-lock.json` (changed)
- `package.json` (changed)
- `playwright.config.ts` (new)
- `tsconfig.json` (changed)

**3. `sustaining/chemistry-theory-sources`** — "Cite OpenStax sections on every chemistry theory page"

- `content/theory/` (changed, 11 files)

**4. `suggestion/ai-one-job-per-provider`** — "Give each AI job one provider, with startup key checks, server-side limits and the voice route"

- `lib/ai/` (new, 6 files)
- `lib/ask-ano/` (deleted, 2 files)
- `.env.example` (changed)
- `app/api/ano-voice/route.ts` (new)
- `app/api/ask-ano/route.ts` (changed)
- `instrumentation.ts` (new)
- `lib/env.ts` (new)
- `tests/ask-ano.eval.ts` (new)
- `tests/stubs/server-only.ts` (new)
- `vitest.config.mts` (changed)

**5. `remake/bright-lab-foundation`** — "Add the Bright Lab design system: tokens, fonts, UI components, page transitions CSS, VFX restyle and the design-system page"

- `components/design-system/` (new, 8 files)
- `app/design-system/page.tsx` (new)
- `app/globals.css` (changed)
- `app/layout.tsx` (changed)
- `components/fx/FxLayer.tsx` (changed)
- `components/fx/cursor.ts` (changed)
- `components/ui/BeliefShiftCard.tsx` (new)
- `components/ui/BreadcrumbBar.tsx` (new)
- `components/ui/Button.tsx` (new)
- `components/ui/CarouselControls.tsx` (new)
- `components/ui/Chip.tsx` (new)
- `components/ui/CountUp.tsx` (new)
- `components/ui/Frame.tsx` (new)
- `components/ui/GlassCard.tsx` (new)
- `components/ui/IconButton.tsx` (new)
- `components/ui/InfoChipCard.tsx` (new)
- `components/ui/Logo.tsx` (new)
- `components/ui/PredictionChoices.tsx` (new)
- `components/ui/ResultCard.tsx` (new)
- `components/ui/Ribbon.tsx` (new)
- `components/ui/ShaderWarmup.tsx` (deleted)
- `components/ui/SiteFooter.tsx` (new)
- `components/ui/SiteHeader.tsx` (new)
- `components/ui/Slider.tsx` (new)
- `components/ui/SmoothScroll.tsx` (new)
- `components/ui/SpeechBubble.tsx` (new)
- `components/ui/SplitHeadline.tsx` (new)
- `components/ui/StageCard.tsx` (new)
- `components/ui/Sunrise.tsx` (new)
- `components/ui/TheorySheet.tsx` (new)
- `components/ui/Toast.tsx` (new)
- `components/ui/Toggle.tsx` (new)
- `lib/cn.ts` (changed)
- `lib/fx/draw.ts` (changed)
- `lib/fx/moments.ts` (changed)
- `lib/fx/streams.ts` (changed)
- `lib/motion.ts` (new)
- `lib/tokens.ts` (changed)
- `lib/voice.ts` (new)

**6. `remake/ano-3d`** — "Add the site canvas, quality tiers, render-when-needed and 3D Ano"

- `components/ano/Ano.tsx` (new)
- `components/ano/Ano3D.tsx` (deleted)
- `components/ano/AnoView.tsx` (new)
- `components/ano/body.ts` (new)
- `components/ano/face.ts` (new)
- `components/ano/parts.ts` (new)
- `components/ano/rig.ts` (new)
- `components/ano/spring.ts` (new)
- `components/ano/types.ts` (new)
- `components/three/LabObjectView.tsx` (new)
- `components/three/SiteCanvas.tsx` (new)
- `components/three/SiteCanvasMount.tsx` (new)
- `components/three/boot.ts` (new)
- `components/three/frameloop.ts` (new)
- `components/three/lab-objects.ts` (new)
- `components/three/pointer.ts` (new)
- `components/three/studio-env.ts` (new)
- `lib/quality.ts` (changed)
- `scripts/gpu-benchmarks.mjs` (new)

**7. `remake/landing-bright`** — "Rebuild the landing page: hero carousel, in-place drop experiment and the sections below"

- `app/credits/page.tsx` (new)
- `app/page.tsx` (changed)
- `components/landing/BeliefSection.tsx` (new)
- `components/landing/BeliefWall.tsx` (new)
- `components/landing/CameraRail.tsx` (deleted)
- `components/landing/CursorBody.tsx` (deleted)
- `components/landing/DropControls.tsx` (new)
- `components/landing/DropScene.tsx` (new)
- `components/landing/DropView.tsx` (new)
- `components/landing/Dust.tsx` (deleted)
- `components/landing/Effects.tsx` (deleted)
- `components/landing/FinalCta.tsx` (new)
- `components/landing/FloatingObjects.tsx` (deleted)
- `components/landing/GoldBurst.tsx` (deleted)
- `components/landing/Hero.tsx` (new)
- `components/landing/HeroCards.tsx` (new)
- `components/landing/HeroExperiment.tsx` (deleted)
- `components/landing/HowItWorks.tsx` (new)
- `components/landing/KineticTitle.tsx` (deleted)
- `components/landing/LabCard.tsx` (new)
- `components/landing/LabsSection.tsx` (new)
- `components/landing/Landing.tsx` (deleted)
- `components/landing/LevelsStrip.tsx` (new)
- `components/landing/LowerBand.tsx` (new)
- `components/landing/MagneticButton.tsx` (deleted)
- `components/landing/MeetAno.tsx` (new)
- `components/landing/Overlay.tsx` (deleted)
- `components/landing/Preloader.tsx` (deleted)
- `components/landing/Scene.tsx` (deleted)
- `components/landing/SectionHeading.tsx` (new)
- `components/landing/StudioLighting.tsx` (deleted)
- `components/landing/drop-sim.test.ts` (new)
- `components/landing/drop-sim.ts` (new)
- `components/landing/drop-store.ts` (new)
- `components/landing/fonts/OFL-host-grotesk.txt` (deleted)
- `components/landing/fonts/host-grotesk-600.typeface.json` (deleted)
- `components/landing/geometries.ts` (deleted)
- `components/landing/glyphs.ts` (deleted)
- `components/landing/groups.ts` (deleted)
- `components/landing/landing-store.ts` (deleted)
- `components/landing/layout.ts` (deleted)
- `components/landing/live.ts` (deleted)
- `components/landing/materials.ts` (deleted)
- `components/landing/object-layout.test.ts` (deleted)
- `components/landing/object-layout.ts` (deleted)
- `components/landing/random.ts` (deleted)
- `components/landing/science-objects.tsx` (deleted)
- `components/landing/title-material.ts` (deleted)
- `components/landing/useCarousel.ts` (new)
- `components/landing/useDropRun.ts` (new)
- `content/landing.json` (changed)
- `lib/random.ts` (new)

**8. `remake/selection-pages`** — "Rebuild level select, lab select, the experiment map and My beliefs, with page morphs"

- `components/map/` (deleted, 1 file)
- `app/(explore)/beliefs/page.tsx` (changed)
- `app/(explore)/labs/[lab]/[level]/page.tsx` (changed)
- `app/(explore)/layout.tsx` (changed)
- `app/(explore)/start/[level]/page.tsx` (changed)
- `app/(explore)/start/page.tsx` (changed)
- `components/explore/AnoLine.tsx` (deleted)
- `components/explore/BeliefGrid.tsx` (new)
- `components/explore/Breadcrumbs.tsx` (deleted)
- `components/explore/ExperimentMap.tsx` (deleted)
- `components/explore/ExperimentPath.tsx` (new)
- `components/explore/ExploreBar.tsx` (new)
- `components/explore/LabChoice.tsx` (deleted)
- `components/explore/LabChoiceScene.tsx` (deleted)
- `components/explore/LevelCard.tsx` (new)
- `components/explore/NavDirection.tsx` (new)
- `components/explore/PathNode.tsx` (new)
- `lib/beliefs.ts` (new)

**9. `remake/lab-3d`** — "Rebuild every experiment as one continuous 3D lab with a shared apparatus kit"

- `components/labroom/` (deleted, 25 files)
- `components/chemistry/` (deleted, 11 files)
- `components/robotics/` (deleted, 6 files)
- `components/lab3d/` (new, 93 files)
- `components/lab/AnoDock.tsx` (new)
- `components/lab/AnoOrb.tsx` (deleted)
- `components/lab/AnoPanel.tsx` (deleted)
- `components/lab/BuildControls.tsx` (new)
- `components/lab/Controls.tsx` (deleted)
- `components/lab/Inspector.tsx` (changed)
- `components/lab/KineticHeadline.tsx` (deleted)
- `components/lab/LabExperiment.tsx` (changed)
- `components/lab/LabMoments.tsx` (deleted)
- `components/lab/LevelMiniMap.tsx` (deleted)
- `components/lab/LevelProgress.tsx` (new)
- `components/lab/MissionBar.tsx` (deleted)
- `components/lab/MissionCard.tsx` (new)
- `components/lab/PartsTray.tsx` (deleted)
- `components/lab/PredictDock.tsx` (new)
- `components/lab/PredictionPanel.tsx` (deleted)
- `components/lab/ResultDock.tsx` (new)
- `components/lab/ResultPanel.tsx` (deleted)
- `components/lab/RoomWindow.tsx` (deleted)
- `components/lab/StageView.tsx` (deleted)
- `components/lab/TheoryView.tsx` (deleted)
- `components/lab/TimeScrubber.tsx` (changed)
- `components/lab/VerdictCard.tsx` (deleted)
- `components/lab/VerdictMoment.tsx` (new)
- `components/lab/WindowTicker.tsx` (deleted)
- `components/lab/stages.tsx` (deleted)
- `components/lab/useAskAno.ts` (new)
- `components/lab/useRun.ts` (changed)
- `lib/store.ts` (changed)

**10. `remake/loading-and-404`** — "Add the loading screens and the lost-in-space 404"

- `components/loading/` (new, 4 files)
- `components/lost/` (new, 1 file)
- `app/loading.tsx` (new)
- `app/not-found.tsx` (new)

## Open issues and "needs manual check"
- **Real AI providers are untested.** Ask Ano, the voice route and the real-mode eval have only run against mocks and fallbacks. With keys in place:
  1. Run `ASK_ANO_EVAL=real npx vitest run tests/ask-ano.eval.ts` (about 20 calls) and record the pass rate.
  2. Try Ask Ano and Listen by hand.
- **Low-end hardware.** Performance was measured on an M1 Pro, with the Low tier and a 4× CPU throttle. Check on a real Chromebook or older laptop, and on a tablet: touch orbit uses two fingers.
- **Browsers.** View transitions need Chromium 125+ or recent Safari or Firefox; elsewhere pages simply cut, which is fine. Safari and Firefox weren't tested.
- **First frame of a lab.** The lab's 3D bench appears about 1.1–1.5 s after you navigate into an experiment, while its shaders compile; the HUD is there at once. Warming the shaders on the map page would hide this.
- **Morphs need the page prefetched** (it is, by default, for the cards that morph). On a slow network the move falls back to the Sunrise wipe.
- **1024 px labs.** A few apparatus edges touch the mission card (reaction speed, catalyst). Orbiting fixes it; the camera could pull back a little more on those two.
- **The robot arena's dark mat** goes against DESIGN.md's cream-first rule. It's easy to lighten in `components/lab3d/kit/robot/Arena3D.tsx` (`matTexture()`).
- **The design-system page** only renders in dev, or with `ANOMALY_DESIGN_SYSTEM=1`. Build with that flag set to run its gates.
- **Upstream warnings:**
  - `THREE.Clock` deprecation, from R3F.
  - Next.js says it "ignored package-lock.json in /Users/paritoshbhattarai", a stray lockfile in the home folder. Harmless; delete that file or set `outputFileTracingRoot` to silence it.
- **CLAUDE.md is partly out of date** with what was built. DESIGN.md now overrides its look sections, and it still lists `@xyflow/react` (removed), JetBrains Mono (Geist Mono is used), and the dark lab rooms and hybrid 2D plan (now all 3D). A `claude-align-md` update would help the team (question 7).

## Keys needed (`.env.local`, never committed; template in `.env.example`)
| Variable | For | Needed? |
|---|---|---|
| `GROQ_API_KEY` | Ask Ano answers | Yes, for live Ask Ano (written hints otherwise) |
| `ELEVENLABS_API_KEY` | Ano's voice for Ask Ano answers | Yes, for the server voice (browser speech otherwise) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limits (5 per session, 20 per IP per hour, 300 per day) and the answer cache | Yes, in production (in-memory limits otherwise) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Eval grading only (`tests/ask-ano.eval.ts`) | Only to grade the real eval |
| `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY` | Proposed jobs below | Not yet; nothing calls them |
| `ANOMALY_REQUIRE_KEYS=1` | Makes missing keys stop the server (CLAUDE.md §7.5) | Recommended in production |

Startup only ever logs the *names* of missing keys, never values.

## Provider mapping (proposed; please approve or change)
One provider per job, one job per provider, no fallback chains (CLAUDE.md §7.5):

| Job | Provider | Module / route | Status |
|---|---|---|---|
| Ask Ano answers | Groq | `lib/ai/askAno.ts`, `app/api/ask-ano` | Built; falls back to the next written hint |
| Ano's voice (Ask Ano answers) | ElevenLabs | `lib/ai/voice.ts`, `app/api/ano-voice` | Built; falls back to the browser's `speechSynthesis` |
| Eval grading | Gemini | `tests/ask-ano.eval.ts` only | Real-mode eval built with heuristic grading; Gemini grader not wired |
| Question screening (on-topic check) | Mistral | — | Proposed |
| Answer fact-check against the simulator | Cerebras | — | Proposed |
| Typed hypothesis → misconception match | OpenRouter | — | Proposed (new feature) |

## Questions for the owner
1. **Provider mapping:** approve the table above, or say which provider should do which job (the last three are proposals only).
2. **Licence:** is the `@img/sharp-libvips` LGPL-3.0 exception acceptable? It's Next.js's optional server-side image binary, dynamically linked and never sent to the browser.
3. **Reference image:** `design/reference/landing.png` was never found. If you add it, should the pages be re-scored against it?
4. **Missing keys:** fall back quietly (current default), or stop the server (`ANOMALY_REQUIRE_KEYS=1`, CLAUDE.md §7.5's wording)? I suggest stopping in production and falling back in development.
5. **Robot arena:** keep the dark cutting-mat floor for contrast, or lighten it to match the cream-first rule?
6. **Fonts:** CLAUDE.md asks the team to pick the display font from three researched options. Archivo is in use; Anton and Bricolage Grotesque are in the comparison screenshots. Keep Archivo?
7. **CLAUDE.md:** shall the next session bring CLAUDE.md in line with what was built (DESIGN.md look, all-3D labs, the dependency list)?
8. **Vercel:** remember the project's Node.js setting must be 24.x (CLAUDE.md §4). Nothing here depends on it, but the build was only run locally, on Node 20.19.
