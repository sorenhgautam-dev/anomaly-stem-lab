# HANDOFF.md

## Session 6: easy for kids, and smoother (28 October 2026)
The brief:
- fix the experiment page, the landing hero, How it works and the cursor;
- rewrite every word for the student's level so a 12-year-old understands it;
- make the site smoother.

Nothing is committed, and the engine is unchanged; the only `engine/` edits are string expectations in `engine/chemistry/content.test.ts`. Every decision is in `GAUNTLET_LOG.md` under "Session 6".

### What changed
- **Experiment page:**
  - the melting chart's y-axis fits the run's data, so the gap between your guess and what happened is easy to see;
  - Ano's bubble never repeats the panel;
  - the ghost copy names the real colour (teal);
  - "You were sure" (the student) is worded apart from Ano's diagnosis ("Maybe you used this idea:");
  - on wide screens the camera fits the picture above the dock as it grows, so the result panel never covers the hot plate or beaker, and Ano never lands on the apparatus.
- **Landing hero:**
  - where the headline crosses a dark card its letters turn white;
  - the sealed bag is modelled as a real zip bag (a low milky pillow, crinkles, a front zip, a write-on panel);
  - "Gets lighter" replaces "Less";
  - the gravity slide's stage is a strong gold;
  - each experiment is larger, with Ano small and to the side.
- **How it works:** the heading's reveal always ends fully visible, and the battery shows one voltage ("3 V"; the cells say "AA").
- **Cursor:** a clear arrow pointer, not a dot.
- **Language:**
  - 372 strings in 101 content files, rewritten per level (Easy, Medium, Advanced: ≤15 words a sentence, everyday comparisons, Ano as a friendly older student), then a final "read it as a 12-year-old" pass;
  - the UI labels in plain words.

  Every content change is listed old → new in `tests/screenshots/kids-after/wording-changes.md`.
- **Smoother:**
  - hover effects pause while scrolling;
  - the audio context is warmed in idle time;
  - slide changes and the knob's level render as transitions;
  - 3D models are built and compiled ahead;
  - no layout reads on scroll.

  The numbers are in Checks.

### UI wording changes
| Before | After |
|---|---|
| Inspector / Live | What's happening / Right now |
| Nudge / Principle / Fix | Hint / Why it happened / How to fix it |
| High conf. / Medium conf. / Low conf. | You were sure / You were fairly sure / You were guessing |
| Ano is fairly sure you might be using this idea / Ano thinks… | This looks like the idea you used / Maybe you used this idea |
| Prediction / Reality | You guessed / What really happened |
| Belief shift | What you just learned |
| Anomaly spotted / Verified / Not yet tested | Surprise! / True! (Right!) / Not tested yet |
| Interactive intuition lab, powered by Ano | A science lab where you guess first |
| My beliefs / beliefs to break | My ideas / tricky ideas to test |
| Broken / Challenged (belief stamps) | Busted / Testing (groups: Busted / Still testing) |
| Run · predict first / Your prediction | Run (guess first) / Your guess |
| Change something and run again | Change something and try again |
| ANOMALY (alone) | ANOMALY + "Surprise! That's not what you guessed." |
| Inspector rows: Turns on above, Safe current, Pointing + to −, Power rating, Rated for, Voltage across | Needs at least, Safe up to, Pointing the right way, Can handle, Made for, Voltage |

### Checks (production build)
- **Static checks:** `npm run build`, `npm run test` (530 passed, 1 skipped), `npm run lint` and the slop scan (0 hits) pass on the committed code.
- **Smoothness** (production build, M1 Pro, frame times while scrolling and around each action):

  | Moment | Before | After |
  |---|---|---|
  | Scrolling My ideas | 53 fps, ~10 % of frames at 33 ms | 60 fps, no slow frames |
  | Hero slide change | worst 166–183 ms | 16.8 ms |
  | Turning the level knob | worst 217 ms | 33 ms |
  | Level select → lab select | 83 ms | 67 ms (one frame in the page wipe) |
  | Scrolling the landing, running an experiment | smooth | smooth |
- **e2e:** the full Playwright suite wasn't re-run on the final build before these commits (the after screenshots were still being taken on the production servers). The last full run passed 193 of 193 in session 5. This session's specs only changed strings (the new option and button words). Run `GAUNTLET_ROUND=final-s6 npx playwright test` after `npm run build` to confirm.

### Before and after (local, git-ignored)
- **Before:** `tests/screenshots/kids-before/`:
  - the 9 pages at 1440 and 390;
  - `slides/` (each hero slide);
  - `experiments/` (every experiment as it opens and after a run, at 1440 and 390).
- **After:** `tests/screenshots/kids-after/`, with the same structure, plus `wording-changes.md`.

### Suggested commits for session 6, by branch type
Make the session 2–5 commits first; several files are shared.
1. **`opinion/kids-language-content`**: "Rewrite all content for each level in plain words a 12-year-old understands"
   - All of `content/`
   - String expectations: `engine/chemistry/content.test.ts`, `components/landing/featured.test.ts`, `tests/e2e/flows.spec.ts`, `tests/e2e/perf.spec.ts`, `tests/e2e/quality.spec.ts`, `components/design-system/ControlsDemo.tsx`
2. **`opinion/kids-language-ui`**: "Plain-word UI labels: What's happening, You guessed, Hint, You were sure, Surprise!, My ideas"
   - `components/lab/Inspector.tsx`, `ResultDock.tsx`, `PredictDock.tsx`, `VerdictMoment.tsx`, `AnoDock.tsx`, `readings.ts`
   - `components/ui/Chip.tsx`, `ResultCard.tsx`, `BeliefShiftCard.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`
   - `components/explore/BeliefList.tsx`, `BeliefRow.tsx`, `ExploreBar.tsx`
   - `components/landing/BeliefDeck.tsx`, `featured.ts`, `HowItWorks.tsx`
   - `lib/beliefs.ts`, `lib/ai/hints.ts`
   - `app/(explore)/beliefs/page.tsx`, `app/(explore)/labs/[lab]/[level]/page.tsx`
3. **`opinion/experiment-page-fixes`**: "Melting chart fits its data; the lab picture fits above the dock; Ano never lands on apparatus"
   - `components/lab3d/kit/chem/heat/chart.ts`, `components/lab3d/scene/CameraDirector.tsx`, `components/lab3d/scene/LabAno.tsx`, `components/lab3d/lab-state.ts`, `components/lab/LabExperiment.tsx`
4. **`opinion/landing-hero-fixes`**: "Hero: white letters over dark cards, a real zip bag, a gold gravity stage, bigger experiments with a smaller Ano"
   - New: `components/landing/HeroHeadline.tsx`
   - Changed: `components/landing/Hero.tsx`, `HeroStage.tsx`, `useHeroScene.ts`, `components/ui/StageCard.tsx`, `components/lab3d/kit/chem/bag.tsx`, `components/lab3d/kit/materials.ts`, `components/lab3d/stages/FizzStage3D.tsx`, `app/globals.css`
5. **`adjustment/how-it-works-heading-and-battery`**: "How it works heading always ends fully visible; one voltage on the battery"
   - `components/ui/ScrollWords.tsx`, `components/landing/HowItWorks.tsx` (if not in 2), `components/lab3d/kit/circuit/parts3d.tsx`
6. **`adjustment/clear-cursor`**: "A clear arrow cursor instead of a dot"
   - `components/fx/cursor.ts`
7. **`sustaining/smoother-scroll-and-input`**: "Smoother: pause hover while scrolling, warm audio in idle, transitions for slides and levels, build 3D ahead"
   - New: `components/ui/ScrollHoverGuard.tsx`
   - Changed: `app/layout.tsx`, `app/globals.css` (if not in 4), `lib/sound.ts`, `components/fx/FxLayer.tsx`, `components/landing/useCarousel.ts`, `components/landing/useScrollScene.ts`, `components/explore/LevelPicker.tsx`, `components/explore/LevelShelf.tsx`, `components/three/LabObjectView.tsx`
   - `components/landing/HeroStage.tsx` and `HeroHeadline.tsx` also carry smoothness changes; they go in 4.
8. **`sustaining/gauntlet-session-6`**: "Log session 6"
   - `GAUNTLET_LOG.md`, `HANDOFF.md`

`components/ui/SmoothScroll.tsx` has a newer timestamp, but its content is unchanged this session. `lib/content-manifest.ts` is regenerated by the build.

### Open from session 6
- **Left on purpose:**
  - **Gas laws options:** "Rise/Fall in proportion" (Advanced) can't be put more simply without giving the answer away.
  - **Titles:** "Mass in a sealed bag", "Melting and particles" and "Activation energy and catalysts" are CLAUDE.md's names, so they stay; their intros and theory explain the words.
- **Smoothness:** one ~67 ms frame remains when a new page mounts during the page wipe. Background shader compiles fixed the rest.
- **Not committed:**
  - `design/reference/`, which isn't mine;
  - `.next-kids/`, a local comparison build that can be deleted.

---

## Session 5: make it feel alive (28 October 2026)
The brief asked for:
- better models;
- more interaction;
- real motion and scroll scenes;
- patterns from Animmaster, Aceternity and Skiper as the main source, restyled completely;
- the pages done one by one, each with screenshots, a scroll video and a fresh Critic;
- ten iterations at most.

All ten iterations are logged in `GAUNTLET_LOG.md` under "Session 5", with every Critic verdict, fix and decision. Nothing is committed (read-only git throughout), and the engine is unchanged.

### What changed
1. **The landing: a scroll story.**
   - **One scroll engine:** GSAP ScrollTrigger driven by Lenis on one ticker (`lib/scroll.ts`).
   - **The hero:** scrolling out dollies the camera into the stage while the cards part and Ano drifts aside.
   - **How it works:** one pinned 3D bench where the real Light the LED experiment plays Predict, Diagnose, Break and Rebuild with the scroll. The camera takes a shot per step, always framing the whole bench.
   - **The two lab cards:** they rise into place while their cameras orbit in.
   - **The black-and-gold stretch:** a gold circuit trace draws down it with a pulse of current.
   - **Headlines and numbers:** headlines rise word by word; numbers count up.
2. **Every 3D object answers the hand** (`components/three/Inspectable.tsx`): on the landing bench, the hero and the level shelf, hover lifts and tilts it, a click opens a label with its name and live values, and a drag turns it.
3. **Ano in every page headline** (`HeadlineWithAno`): level select, lab select, the maps, My beliefs and the 404.
   - He stands in the gap, waves on arrival and reacts to each level.
   - His bubble hangs from him with its tail pointing up at him.
   - His dotted dark rim is fixed: it came from a mirror-sharp clearcoat.
4. **Level select as one instrument:** knob, then the element tile, then a readout (beliefs to break, three of them, the per-lab split) and Start, all in the first screen. The shelf has a teal cabinet back so its glass reads.
5. **The maps in their lab's colour world:** Chemistry teal and Robotics graphite with gold, so the lab card grows into the same colour. The next experiment is marked in gold.
6. **The labs:**
   - **Phones:** the dock comes right under the stage, and Run brings the stage back into view.
   - **Ghost beside reality:** the student's idea stands as a glowing ghost lamp beside the real one, with one label above both.
   - **Ano:** points the result out without covering it, and his bubble drops its tail while he's away.
   - **Battery:** printed + and −.
   - **The rest:**
     - a crisp balance LCD;
     - no twinkle dust;
     - ANOMALY sparks from the floor, not the dark LED;
     - captions at the top on phones.
7. **Designed states:** an error page (`app/error.tsx`, sage, a shrugging Ano, "Try again"), an empty belief filter, and the 404 in sage with Ano shrugging.

### Components from each library (all rebuilt as our own code)
The three licences were read on 28 October 2026, and none allows its code in this MIT repo, so no code was copied (details in `RESOURCES.md` §11).
- **Aceternity UI** (its own licence: no redistributing the source):
  - Container Scroll Animation: the hero's camera dolly;
  - Sticky Scroll Reveal: the pinned How it works;
  - Timeline: the gold trace;
  - 3D Card Effect: the element tile and the lab cards;
  - Animated Tooltip: the 3D object labels.
- **Skiper UI** (custom terms; free items need attribution, and the Terms of Service forbid copying):
  - Text Scroll (skiper31): `ScrollWords`;
  - Animated number (skiper37): `ScrollCount`;
  - Card stack with gsap (skiper16 and skiper17): `LabsScene`;
  - Svg follow scroll (skiper19): `NightTrace`;
  - Custom tooltip (skiper101): the 3D labels;
  - Scroll progress: How it works' rail.
- **Animmaster** (paid packs, no redistributing; public previews studied only):
  - Scroll and 3D Animation: the hero and the labs camera moves;
  - Hover and Mouse Effect: `Inspectable` and Ano following the cursor;
  - Physics Effect: the specimens;
  - Page Transition: the colour wipe with overshoot.

### Checks (production build)
- **Static checks:** `tsc`, lint and the G13 slop scan pass (0 hits; the one allowed item is the ANOMALY scanline flash). Vitest: 530 pass, 1 skipped.
- **e2e:**
  - **193 of 193 pass** on the build before round 9;
  - flows, overflow and performance (74 of 74) re-run and pass on the final build.
- **FPS: 59.9 with zero jank in all three tiers** on every measured page: the landing, Light the LED (also during a run), Mass in a sealed bag (also during a run), lab select and the design system. The Low tier ran with the CPU throttled 4×. The final build ran on AC power with Low Power Mode off, on an Apple M1 Pro (Metal). Data: `tests/.results/perf-round-final-s5b.json`.
- **Draw calls** (all under the 150 budget):

  | Page | High | Medium | Low |
  |---|---|---|---|
  | Landing | 111 | 46 | 42 |
  | Light the LED | 84 (88 running) | 84 | 84 |
  | Mass in a sealed bag | 63 (64 running) | 63 | 63 |
  | Lab select | 68 | 68 | 68 |

### Before and after (local, git-ignored)
- **Before:** `tests/screenshots/alive-before/`: 9 pages at 1440 and 390, plus 1440 scroll videos.
- **After:** `tests/screenshots/alive-after/`: the same 9 pages and videos, plus each demo lab's ANOMALY path (`led-anomaly-*`, `bag-anomaly-*`: build, running and result at 1440).

### Suggested commits for session 5
Sessions 2–5 are all uncommitted and share files; make the session 2–4 commits above first. The session 5 commits, by branch:
1. **`remake/scroll-story`**: "Landing scroll story: one GSAP and Lenis loop, the hero camera dolly, word-by-word headlines, count-ups, the gold circuit trace, the labs card scene"
   - New: `lib/scroll.ts`, `components/ui/ScrollWords.tsx`, `components/ui/ScrollCount.tsx`, `components/landing/useHeroScene.ts`, `components/landing/LabsScene.tsx`, `components/landing/NightTrace.tsx`
   - Changed: `package.json`, `package-lock.json` (gsap 3.15.0), `components/ui/SmoothScroll.tsx`, `components/landing/Hero.tsx`, `HeroCards.tsx`, `HeroStage.tsx`, `SectionHeading.tsx`, `LabsSection.tsx`, `LevelDialSection.tsx`, `LowerBand.tsx`, `MeetAno.tsx`, `components/ui/StageCard.tsx`, `components/three/LabObjectView.tsx`, `app/page.tsx`, `app/globals.css`
2. **`remake/how-it-works-bench`**: "How it works: one pinned 3D bench playing the real LED experiment step by step"
   - New: `components/landing/HowBench3D.tsx`
   - Changed: `components/landing/HowItWorks.tsx`, `components/landing/stage/benches.tsx`, `components/lab3d/kit/materials.ts`
3. **`ideas/inspectable-3d`**: "Every 3D object reacts: hover lift and tilt, click label with live values, drag to turn"
   - New: `components/three/Inspectable.tsx`
4. **`remake/ano-in-headlines`**: "Ano stands in every page headline with his bubble attached; softer clearcoat"
   - New: `components/explore/HeadlineWithAno.tsx`, `components/lost/LostHeadline.tsx`, `lib/typography.ts`
   - Changed: `components/explore/LevelSelect.tsx`, `app/(explore)/start/page.tsx`, `app/(explore)/start/[level]/page.tsx`, `app/(explore)/beliefs/page.tsx`, `app/not-found.tsx`, `components/lost/ShruggingAno.tsx`, `components/ano/parts.ts`, `components/ui/SpeechBubble.tsx`, `components/three/shapes.ts`, `components/three/ShapesField.tsx`
5. **`opinion/level-select-instrument-row`**: "Level select as one instrument row with a beliefs readout; teal shelf cabinet; named mini tiles"
   - Changed: `components/explore/LevelPicker.tsx`, `ElementTile.tsx`, `LevelShelf.tsx`, `level-picks.ts`, `BeliefRow.tsx`, `BeliefList.tsx`, `components/landing/LabCard.tsx`, `components/ui/Chip.tsx`, `components/ui/SoundToggle.tsx`
6. **`opinion/maps-in-lab-worlds`**: "Experiment maps in each lab's colour world, gold for the next experiment"
   - Changed: `app/(explore)/labs/[lab]/[level]/page.tsx`, `components/explore/ExperimentPath.tsx`, `PathNode.tsx`, `ExploreBar.tsx`, `components/ui/Paper.tsx`, `components/ui/Frame.tsx` (and `app/globals.css` if commit 1 hasn't taken it)
7. **`opinion/labs-ghost-beside-reality`**: "Labs: ghost beside reality, one label per part, Ano clear of the result, phone run flow, battery + on the simulator's terminal"
   - Changed:
     - `components/lab/LabExperiment.tsx`, `AnoDock.tsx`, `Inspector.tsx`, `ResultDock.tsx`;
     - `components/lab3d/`: `lab-state.ts`, `shots.ts`;
     - `components/lab3d/scene/`: `LabAno.tsx`, `PredictionGhost.tsx`, `VerdictBurst.tsx`, `StudioLife.tsx`, `set/look.ts`;
     - `components/lab3d/kit/`: `TextBoard.ts`, `chem/Scale3D.tsx`;
     - `components/lab3d/kit/circuit/`: `InspectLabel.tsx`, `PartModel.tsx`, `Slot3D.tsx`, `lamps3d.tsx`, `parts3d.tsx`;
     - `components/lab3d/stages/`: `CircuitStage3D.tsx`, `FizzStage3D.tsx`;
     - `components/ui/Toast.tsx`.
8. **`sustaining/error-page`**: "Designed error page"
   - New: `app/error.tsx`
9. **`sustaining/gauntlet-session-5`**: "Log session 5 and credit the studied patterns"
   - Changed: `GAUNTLET_LOG.md`, `HANDOFF.md`, `RESOURCES.md`

`components/ui/CountUp.tsx` shows a newer timestamp but is identical to HEAD (it was restored), so there is nothing to commit. `lib/content-manifest.ts` is regenerated by the build.

### Open from session 5
- **The final Critic still failed on these** (the iteration cap was reached), worst first:
  - **Light the LED at a glance:** the printed + is small (about 10 px at 1440), the LED's short leg hides behind its dome from the reveal angle, and at 390 the LED's label covers the "Resistor" tag.
  - **Mass in a sealed bag, result at 1440:** the result card covers the balance's display, and Ano parks over the bag's right half. The bag stage has no `"ano"` anchor yet (the circuit stage shows how).
  - **The bag model** inflates into a rigid dome that reads as glass, not a zip bag (§8.2).
  - **Both demo labs at 390:** an empty band under the bench, apparatus small, and in-scene readouts about 5 px even at 1.5×. Mirroring the key readings into the dock on phones would fix it.
  - **Two wordings for one idea:** "Your idea: Less" while running, "Your idea: 127.38 g" at the result.
  - **Page details:**
    - the /beliefs headline lines up with neither the logo nor the list;
    - the 404's lower 40 % is empty, and Ano stands neutral between shrugs;
    - the landing's specimens crowd "TEST IT.";
    - the knob's readout plate hides the 6 and 12 ticks.
- **Skiper UI's licence** still contradicts its terms: patterns only, no code (RESOURCES.md §11). Decide whether to credit it further or drop it.
- **Manual checks on a real screen:**
  - dragging 3D objects on touch;
  - the scroll story on a trackpad and with reduced motion;
  - Ano waving on arrival;
  - the How it works camera at 1024.
- **Still open from session 4:** a dedicated lighting pass for the labs.

---

## Session 4: the lab rebuild, real 3D, and the level select page (28 October 2026)
Three briefs ran in this session. Nothing is committed (read-only git throughout). The record of every step and decision is in `GAUNTLET_LOG.md` under "Lab rebuild" and "Level select redesign".

1. **The labs, rebuilt to DESIGN.md §8 and §8.2** (Tasks 1–6):
   - **Each lab in its own colour world:**
     - Chemistry: teal room, beige bench on sage casework, a fume-hood frame and a reagent shelf.
     - Robotics: graphite room, white bench with black trim, a pegboard and tool rail.
   - **Each lab's own light:** a strong rim and a clean key.
   - **Effects, confetti and ghosts:** in each lab's palette, with ghosts in its teal.
   - **The kit:** every model is rebuilt to the model standard: lathed glass with real wall thickness, bevelled parts, tube wires and cables, and printed labels and dials. The demo models came first; three parallel builders did the rest.
   - **Ano:** a real visor panel with a rolled edge and its own reflections, and a belt that follows his body.
   - **A dev-only close-up gallery** at `/design-system/kit`.
2. **Real 3D across the site:**
   - **Floating specimens:** the glossy pills, cubes and rings behind the headlines are now real lab specimens (flasks, beakers, test tubes, LEDs, cells, resistors, gears, molecules).
   - **Lab cards:** each shows its lab's colour world with a bench of real apparatus.
3. **The level select page** (the owner's brief), with:
   - an instrument knob with detents and an LCD;
   - a periodic-table tile (Ea, Md, Ad) that flips with a clack;
   - the level's experiments on a 3D shelf, named on hover;
   - "N beliefs to break" with a teaser;
   - a plain Start;
   - Ano reacting to each level.
4. **The template-pattern sweep:**
   - **My beliefs** is now a lab-notebook register: element tiles, lab marks and status stamps, with no card bands or arrows.
   - **Map nodes** show each experiment's apparatus in a window onto its lab.
   - **Meet Ano** picks expressions with his visor faces.
   - **Call-to-action arrows** are removed.
5. **The landing in the lab palettes:**
   - each hero slide's stage holds the real experiment in 3D, with values from the same engine run as its cards: the backwards LED at 0 mA, the sealed bag at 130 g, the drop landing together at 0.85 s;
   - the stage, specimens, ribbon and page tint cross-fade per slide;
   - orange is left only on Ano, and his face is centred;
   - particles each have a physical cause: dust in the stage light, CO₂ in the bag, dust puffs where the balls land.
6. **Black and gold, then earthy sage** (the owner's request):
   - **The landing:** after the hero, a graphite block with gold accents (How it works, the two labs, Meet Ano), then sage paper for the rest.
   - **Sage pages:** level select, lab select, My beliefs and Credits.
   - **Level colours** are now earthy everywhere: sage, sand gold, teal.

### Checks (production build)
- **Static checks:** `tsc`, lint and the G13 slop scan (0 hits) pass; vitest passes 530.
- **e2e** (flows, overflow, quality): **99 of 99 pass** on the final build.
- **Draw calls:**

  | Page | High | Medium | Low |
  |---|---|---|---|
  | Landing | 65 | 45 | 41 |
  | Lab select | 48 | 53 | 48 |

  LED lab 81–84, sealed bag 63–64; the other labs are 58–100. All are under 150.
- **FPS:** 59.9 on all three tiers with zero jank on every page, from the final run on AC power (`tests/.results/perf-round-final-s4.json`). An earlier run read a flat 30 everywhere because macOS Low Power Mode was on; ignore that one.

### Screenshots (local, git-ignored)
- **Labs:**
  - before: `tests/screenshots/labs-before/`;
  - during: `labs-after-t1/`, `labs-after-t4/`;
  - after: `labs-after/`, with kit close-ups `kit-*.png` and both labs at 1440 and 390.
- **Level select, lab select, map, beliefs:**
  - before: `tests/screenshots/levels-before/`;
  - after: `levels-after/`, including `start-shelf-*.png`.
- **Landing slides:** before `tests/screenshots/landing-before/`, after `landing-after/`. Each holds `slide-1-gravity`, `slide-2-led` and `slide-3-bag` at 1440 and 390.
- **Black and gold, then sage:** `tests/screenshots/moods-after/`:
  - full pages at 1440 and 390;
  - each landing section in view;
  - each slide.

### Suggested commits for session 4
Sessions 2–4 are all uncommitted and share many files. **Make commits 1–10 below first.** They will already carry this session's edits in any file they list (for example `app/globals.css`, `lib/tokens.ts`, `components/lab3d/scene/Studio.tsx`, `components/explore/LevelPicker.tsx`, `components/landing/Hero.tsx`), so each of them describes its area's final state. Then make these, with the files that are left. Two files from commits 5 and 6 no longer exist:
- `components/explore/GradeDial.tsx`: drop it from commit 6.
- `components/three/lab-objects.ts`: commit it as deleted in commit 5.

11. **`remake/lab-colour-worlds`**: "Labs in their own colour worlds: teal and graphite rooms, benches, fume hood, reagent shelf, pegboard, per-lab light, effects and ghosts"
    - New: `components/lab3d/scene/lab-light.ts`, `components/lab3d/scene/set/` (`Room.tsx`, `Bench.tsx`, `ChemistrySet.tsx`, `RoboticsSet.tsx`, `look.ts`, `bench-size.ts`)
    - Changed: `components/lab3d/scene/LabAno.tsx`, `components/lab3d/kit/circuit/Slot3D.tsx`, `components/lab3d/kit/circuit/Wire3D.tsx`
12. **`remake/lab-kit-models`**: "Every lab model to the model standard: lathed glass, bevelled parts, tube wires, printed labels, each lab's palette"
    - New: `components/lab3d/kit/detail.ts`, `components/lab3d/kit/chem/heat/Thermometer3D.tsx`, `heat/HotPlate3D.tsx`, `heat/tones.ts`, `components/lab3d/kit/chem/gas/stand.ts`, `components/lab3d/kit/chem/liquid/stand.tsx`, `liquid/Bottle.tsx`, `components/lab3d/kit/chem/react/rack.tsx`
    - Changed:
      - `kit/chem/`: `glass.tsx`, `bag.tsx`, the rest of `heat/`, `gas/`, `liquid/` and `react/`;
      - `kit/circuit/`: `parts3d.tsx`, `lamps3d.tsx`, `motors3d.tsx`;
      - `kit/robot/`: everything not already in commit 7;
      - stages: everything in `components/lab3d/stages/` not already in commit 7.
13. **`remake/ano-visor`**: "Ano: a real visor panel with its own reflections, a belt that follows his body, no floor shadow where he floats"
    - New: `components/ano/FaceIcon.tsx` (his faces as icons, used by commit 18)
    - Changed: `components/ano/parts.ts`, `components/ano/body.ts`, `components/ano/rig.ts`, `components/ano/Ano.tsx`
14. **`sustaining/kit-gallery`**: "Dev-only close-up gallery of every lab model"
    - New: `app/design-system/kit/page.tsx`, `components/design-system/KitGallery.tsx`
15. **`remake/real-3d-specimens`**: "Floating lab specimens instead of glossy blobs; lab cards as each lab's world with real apparatus"
    - New: `components/three/specimens.ts`, `components/three/FitModel.tsx`
16. **`remake/level-select-instrument`**: "Level select: an instrument knob, a periodic-table tile that flips, the level's experiments on a 3D shelf, beliefs to break, Ano reacting"
    - New: `components/explore/LevelKnob.tsx`, `ElementTile.tsx`, `LevelShelf.tsx`, `shelf-models.tsx`
    - Changed: `content/levels.json`
17. **`opinion/lab-map-and-belief-register`**: "Experiment map nodes show their apparatus; My beliefs as a lab notebook register"
    - New: `components/explore/ApparatusWindow.tsx`, `components/explore/BeliefRow.tsx`
18. **`remake/landing-lab-palettes`**: "Landing hero: each slide in its lab's palette with the real experiment on the stage, cross-fading stage, specimens, ribbon and tint, dust in the stage light"
    - New: `components/landing/HeroStage.tsx`, `components/landing/stage/benches.tsx`, `components/landing/stage/particles.tsx`
19. **`adjustment/black-gold-and-sage`**: "Black and gold, then earthy sage: night and sage paper moods, earthy level colours, mood-matched ribbons"
    - Already in earlier commits: `app/globals.css`, `components/ui/Paper.tsx`, `components/ui/Frame.tsx`, `app/page.tsx`, `content/landing.json`, `components/landing/HowItWorks.tsx`, `components/landing/LabsSection.tsx`, `components/landing/FinalCta.tsx`, the explore pages and `app/credits/page.tsx`. Make it its own commit only if those land first.
20. **`sustaining/gauntlet-session-4`**: "Log session 4"
    - Already in commit 10: `GAUNTLET_LOG.md`, `HANDOFF.md`. If commit 10 is already made, commit them here.

If splitting by area is too fiddly with the shared files, commit sessions 2–4 as one `remake/` branch per area instead.

### Open from session 4
- **Task 6, the lighting tune, had no separate pass.** Each lab's rig has a strong white rim and a clean key (set in Tasks 3–4), and the labs were judged at 1440 and 390. A dedicated pass with the final models is still worth doing.
- **The stray black dot near Ano's head** couldn't be reproduced in a capture. Check it on a real screen; the hero's specimens and colours have changed since.
- **HUD controls in the labs** (sliders, toggles, the Run button) still use the site's apricot and volt. They belong to the experiment UI in the queued "bold and alive pages" brief.
- **Still open from session 3:**
  - **Lab framing:** at 1024 the side cards cover apparatus; on phones Ano covers the apparatus.
  - **Phone layout:** Run plays off-screen on phones; the 3D labels are small; the breadcrumb truncates.
  - **The design system at 390** drops Ano.

  Fixed this session: the NO₂ tubes (now brown), the landing at 390 spacing (the hero is rebuilt) and Credits' colour (now sage).
- **The dev server can serve stale CSS** for new Tailwind `@utility` classes (Turbopack's persistent cache). If a new class doesn't show in dev, stop it and delete its build folder (`.next-gauntlet` for the gauntlet server).
- **Not done yet:** the queued "bold and alive pages" brief, beyond what the sweep and the landing work covered.

---

Session 3 of the unattended gauntlet, 28 October 2026. The brief was to bring ANOMALY up to the updated DESIGN.md (the §0 anti-slop bans first), using Aceternity UI, Skiper UI and Animmaster as the main source of animated UI, in a Lead, Builder and Critic loop capped at 10 iterations. Session 2 (the Lusion-level motion pass, the same day) is **also still uncommitted** and shares files with this session. Its summary is kept at the end. The full record of every iteration, Critic verdict, fix and decision is in `GAUNTLET_LOG.md` under "Session 3".

## 1. Summary
1. **All 10 iterations ran (i1–i10)**, each ending in a full gate run on a production build. The final run covered all 29 pages: **193 of 193 browser tests passed, and G1–G13 pass** (G12 passes its documented libvips exception). The final rubric falls short: **21 of 29 pages score at least 4 on every point.** The other 8 dip on lab framing at 1024 and 390, credits' colour, and two phone layouts (§4, §7).
2. **The §0 bans are out of the code:** the G13 slop scan went from 141 hits to 0. That means our own icon set, paper instead of glass, Schibsted Grotesk and Martian Mono, one hue per gradient, no orbs, sparkles or iridescence, plain copy, and hero cards filled by the real simulator.
3. **The layout bans are replaced:**
   - How it works is one live LED sequence;
   - the labs sit on an ink block;
   - there's a belief deck;
   - a grade dial with one changing card is on `/start` and the landing;
   - My beliefs is one grouped column.
4. **No library code could be used.** None of the three licences is MIT, Apache, BSD, ISC or CC0, and Animmaster is paid only. Instead, 11 patterns were studied on their sites and rebuilt in our own code, each credited (RESOURCES.md §11, README). The licences need your call (§7).
5. **Nothing is committed.** No git command that changes anything was run. Ten suggested commits are in §6. 0 of the 30 real AI calls were used (there's still no `.env.local`).

## 2. Sub-tasks, done and not done
Every sub-task was built and gated. "Critic" is the fresh-context sub-agent's verdict. The cap is 3 fix attempts per sub-task. A fix made after a FAIL ships in the next iteration's build and is judged there, or by the final Critics.

| # | Sub-task | Built | Critic outcome |
|---|---|---|---|
| i1 | Our own icon set (34 icons, Lucide removed) | Yes | FAIL ×3; fix attempt 3 (the last) gated in i7. The remaining small-size nits were judged by the final Critics |
| i2 | Paper, not glass (fonts, paper, one-hue colour, no orbs, iridescence or sheens, lab light per hue) | Yes | FAIL ×3; cap reached. **Open:** the lab bench and board tint. A small follow-up is in the final build |
| i3 | Copy and real data (no em dashes or slop copy; hero cards from the engine) | Yes | FAIL ×2; fix attempt 2 (the teaser's belief card follows the visitor's drop) gated in i7 |
| i4 | How it works as one live LED sequence | Yes | **PASS** |
| i5 | Labs on an ink block, and the belief deck | Yes | FAIL ×1 (the fan overflowed at 390); fixed and gated in i7, with a new overflow check that passes on all 29 pages |
| i6 | The grade dial on `/start` and the landing | Yes | FAIL ×2; fix attempt 2 (the arc and numbers take input, a 46 px knob) gated in i10 |
| i7 | My beliefs as one grouped column | Yes | FAIL ×1; fixed (Belief shift cards, tinted and sorted) and gated in i9 |
| i8 | Nav text roll, equaliser sound toggle, Ano's line reveal | Yes | **PASS** |
| i9 | The lab's Run, running and result flow; a closer lab camera | Yes | Judged inside the final Critic's lab pages (static shots can't show the running state; checked by hand) |
| i10 | Final pass: every page, every gate, final Critics | Yes | See §4 |

**Not done:**
- **Library code:** licences (§7).
- **The open i2 gap:** see "Open issues".
- **From the Critics, outside any sub-task's scope:**
  - 3D views below the fold render blank in full-page captures (render-on-demand; needs a phone check);
  - the landing's result card nearly touches "Learn why…" at 390;
  - speech-bubble tails point at headlines rather than Ano;
  - the 404's Ano floats above the gap rather than in it.

## 3. Components from each library
None of these libraries' code is in the repo (see "Licences" in §7). These are original implementations of patterns studied on their sites. Each is restyled with our tokens, fonts and icons, respects reduced motion, and runs on every quality tier.

| Library and licence (read 28 Oct 2026) | Pattern studied | Our component | Where |
|---|---|---|---|
| **Aceternity UI.** Custom "Aceternity License": end products are allowed, but "You cannot re-distribute the Item … its source files, regardless of modifications" | Sticky scroll reveal | `components/landing/HowItWorks.tsx`, `HowBench.tsx` | Landing, How it works |
| | Card stack, draggable card | `components/landing/BeliefDeck.tsx`, `useDeckDrag.ts` | Landing, belief deck |
| | Container text flip | `components/explore/LevelPicker.tsx` (with `RollingText`) | `/start` and the landing level card |
| | Text generate effect (rebuilt without blur or fade) | `components/ui/WordReveal.tsx` | Every speech bubble |
| | Stateful button | `components/lab/RunStatus.tsx` | Lab dock: Run, then running, then result |
| | Following pointer | `components/fx/cursor.ts` (from session 1) | The soft cursor |
| **Skiper UI.** Free tier: "Free to use and modify … Attribution to Skiper UI is required"; the author says "I don't claim to be the original creator"; the site's Terms of Service forbid copying site material | Scroll progress 001 | The How it works progress rail | Landing |
| | Card swipe carousel | `useDeckDrag.ts` (300 ms flick, 140 px drag) | Belief deck |
| | Animated number | `GradeDial.tsx`, `LevelPicker.tsx` (rolling counts) | Dial and level card |
| | Text roll navigation | `components/ui/RollLabel.tsx` | Header nav |
| | Music toggle btn | `components/ui/SoundToggle.tsx` | Sound toggle (equaliser bars) |
| | Mouse follow animations | `components/fx/cursor.ts` | The soft cursor's trail |
| **Animmaster Lib.** Paid only ($3–$8). Terms: may not "redistribute the library or its source files"; described as "rebuilt with clean code" from popular sites | Public previews only (page transitions, sliders, text effects) | None | Nothing usable; logged |

Banned patterns weren't used: Aceternity's aurora, beams, sparkles, bento grid, grid and dot backgrounds, liquid glass, terminal, and colourful text.

## 4. Final gates and rubric scores
**Final run: iteration i10, every page, production build.**

| Gate | Result | Notes |
|---|---|---|
| G1 Types | Pass | `npx tsc --noEmit` |
| G2 Lint | Pass | `npm run lint` |
| G3 Unit | Pass | 530 passed, 1 skipped (the real-provider eval). New tests: `featured.test.ts` and `how-sequence.test.ts` (hero and How it works are engine output) |
| G4 Build | Pass | `ANOMALY_DESIGN_SYSTEM=1 npm run build` |
| G5 Flows | Pass | The journey; LED and sealed bag, correct and wrong; theory; back navigation and breadcrumbs; carousel; preloader; 404; the hero teaser |
| G6 Console | Pass | No errors, hydration warnings or failed requests |
| G7 Hit areas | Pass | All 29 pages: visible box equals the hit box within 2 px, nothing under 44 px |
| G8 Accessibility | Pass | axe has no serious or critical issues on any page; keyboard and reduced motion pass |
| Overflow (new) | Pass | All 29 pages are exactly 390 and 1024 px wide after scrolling through (`tests/e2e/overflow.spec.ts`) |
| G9 Visual | See the rubric below | All 29 pages at 1440, 1024 and 390, plus scrolled landing sections |
| G10 Performance | Pass | Apple M1 Pro, Metal. 59.9 fps, p95 ≤ 16.8 ms and 0 jank on High, Medium and Low with 4× CPU throttling, idle and running. Draw calls: landing 20, LED 66 (69 running), sealed bag 44, lab select 25, design system 16 |
| G11 AI and voice | Pass (mock) | No keys; 0 of 30 real calls |
| G12 Licences | Literal fail, documented pass | Only `@img/sharp-libvips` (LGPL, Next.js's image binary), as before. `lucide-react` removed; no packages added |
| G13 Slop scan | Pass | `npm run slop`: 0 hits (141 at the start). One functional exception: the ANOMALY scanline flash |

193 browser tests passed, 0 failed, 0 skipped.

**Rubric, from the final fresh-context Critics** (DESIGN.md §12, 8 points; every page should score at least 4):

Scores are Pattern, Vibrancy, Type, Spacing, Polish, Consistency, Clarity and No slop. Where a score differs by width it's shown as 1440·390 (or 1440·1024·390); **bold** marks a point under 4.

| Page | P | V | T | S | Po | C | Cl | NS | Passes? |
|---|---|---|---|---|---|---|---|---|---|
| Landing | 5·4 | 5·4 | 5 | 5·**3** | 5·4 | 5 | 5·4 | 5 | No: at 390 the hero result card touches "Learn why…", and the deck clips its title |
| Level select | 5·4 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | Yes |
| Lab select | 4 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | Yes |
| Experiment map | 4 | 4 | 5 | 4 | 4 | 5 | 5 | 5 | Yes |
| Light the LED | 4 | 4 | 4 | 4 | 4 | 5 | 4·**3**·4 | 5 | No: at 1024 the Inspector covers the LED and the mission card clips the battery |
| Mass in a sealed bag | 4 | 5 | 4 | 4 | 4 | 5 | 5 | 5 | Yes |
| My beliefs | 5·4 | 4 | 5 | 4 | 4 | 5 | 4 | 5 | Yes |
| Credits | 4 | **3** | 5 | 4 | 4 | 4 | 5 | 5 | No: almost no colour on screen |
| 404 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 5 | Yes |
| Design system (dev only) | 5·**3** | 5·4 | 5 | 4 | 4 | 5·4 | 5 | 5 | No: at 390 the hero drops Ano, leaving an empty band |
| Burning, Catalyst, Dissolving, Gas and heat, Gas laws, Melting, Neutralisation | 4 | 4 | 4 | 4 | 4 | 5 | 4 | 5 | Yes (but at 1024 the cards cover parts of catalyst and neutralisation) |
| Light a bulb, Series, Switches, The shortcut wire, Ohm's law, Gears | 4 | 4 | 4 | 4 | 4 | 5 | 4 | 5 | Yes |
| PWM | 4 | 5 | 4 | 4 | 4 | 5 | 4 | 5 | Yes |
| Steering | 4 | 4 | 4 | 4 | 4 | 5 | 4 | 4 | Yes |
| Indicator colours | 4·4 | 4 | 4 | 4·**2** | 4·**3** | 5·4 | 4·**3** | 5 | No: at 390 the Liquid toggle runs past the dock and the screen edge |
| Reaction speed | 4 | 4 | 4 | 4 | 4 | 5 | 4·**3** | 5 | No: at 390 Ano covers the hot beaker |
| Equilibrium | 4 | 4 | 4 | 4 | 4 | 5 | **3** | 5 | No: the NO₂ tubes render near-cream, so the brown can't be seen |
| Two bulbs side by side (parallel) | 4 | 4 | 4 | 4 | 4 | 5 | 4·**3** | 5 | No: at 390 the circuit is a thin strip with 4 px labels |

**21 of the 29 pages score at least 4 on every point; 8 don't.** No page scores under 4 on No slop. Each gap's fix is in §7 under "Rubric gaps". The 10-iteration cap was reached before they could be made.

## 5. Screenshots
Screenshots are git-ignored, so they're local only.
- **After (final):**
  - `tests/screenshots/round-i10/<page>-<1440|1024|390>.png`, plus `-full.png` versions, for all 29 pages;
  - `tests/screenshots/round-i10/landing-sections/` holds scrolled landing sections (full-page captures show scroll-revealed sections blank);
  - `fonts-*.png` is the font comparison.
- **Before:** `tests/screenshots/round-p6/` is the end of session 2 and the start of this session.
- **Per iteration:** `tests/screenshots/round-i1/` … `round-i9/` (the 10 base pages).
- **Gate data:** `tests/.results/perf-round-i10.json` and `tests/.results/quality-round-i10/*.json`.

## 6. Suggested commits, by branch, in order
Nothing is committed: sessions 2 and 3 are both still in the working tree. Both sessions edited many of the same files, so these commits are grouped by area and hold each file's final version, with every file in exactly one commit. Commits 4–8 depend on each other (the icon set, paper styles and motion kit are used everywhere, and `lucide-react` leaves `package.json` in 4). Commit them together and run `npm run build && npm run test && npm run slop` after commit 8, or squash 4–8 into one `remake/` branch.

1. **`claude-align-md`**: "Bring DESIGN.md and GAUNTLET.md up to the owner's latest copies (anti-slop rules, G13)"
   - `DESIGN.md`, `GAUNTLET.md`
2. **`adjustment/reference-image`**: "Add the landing reference image"
   - `design/reference/landing.png`
3. **`sustaining/keep-prediction-on-hydrate`**: "Keep the student's prediction when saved progress finishes loading"
   - `lib/store.ts`
4. **`remake/paper-design-system`**: "Paper, not glass: own icon set, Schibsted Grotesk and Martian Mono, paper surfaces, one hue per gradient, spring motion kit"
   - New: `components/icons/Svg.tsx`, `components/icons/icons.tsx`, `components/ui/Paper.tsx`, `components/ui/PaperCard.tsx`, `components/ui/RollingText.tsx`, `components/ui/RollLabel.tsx`, `components/ui/WordReveal.tsx`, `components/ui/Tilt.tsx`, `components/ui/SoundToggle.tsx`, `components/design-system/IconsDemo.tsx`, `lib/motion-loop.ts`
   - Deleted: `components/ui/GlassCard.tsx`, `components/ui/Sunrise.tsx`
   - Changed: `app/layout.tsx`, `app/globals.css`, `app/design-system/page.tsx`, `app/credits/page.tsx`, `app/not-found.tsx`, `lib/cn.ts`, `lib/tokens.ts`, `lib/motion.ts`, `lib/sound.ts`, `lib/fx/moments.ts`, `components/fx/cursor.ts`, `components/loading/Preloader.tsx`, `components/loading/RouteLoading.tsx`, `package.json`, `package-lock.json`, `README.md`, `RESOURCES.md`
   - Changed in `components/ui/`: `BeliefShiftCard`, `BreadcrumbBar`, `Button`, `CarouselControls`, `Chip`, `Frame`, `IconButton`, `InfoChipCard`, `Logo`, `PredictionChoices`, `ResultCard`, `Ribbon`, `SiteHeader`, `Slider`, `SpeechBubble`, `SplitHeadline`, `StageCard`, `TheorySheet`, `Toast`, `Toggle`
   - Changed in `components/design-system/`: `AnoDemo`, `CardsDemo`, `ControlsDemo`, `PatternsDemo`, `Swatches`, `Typography`
5. **`remake/landing-live`**: "Landing: simulator-fed hero cards, How it works as one live LED sequence, labs on ink, the belief deck, the level dial, knock-around shapes"
   - New: `components/landing/featured.ts`, `components/landing/featured.test.ts`, `components/landing/how-sequence.ts`, `components/landing/how-sequence.test.ts`, `components/landing/HowBench.tsx`, `components/landing/BeliefDeck.tsx`, `components/landing/useDeckDrag.ts`, `components/landing/LevelDialSection.tsx`, `components/landing/useScrollScene.ts`, `components/three/ShapesField.tsx`, `components/three/shapes.ts`, `components/three/shapes.test.ts`, `components/three/shape-meshes.ts`
   - Deleted: `components/landing/BeliefWall.tsx`, `components/landing/LevelsStrip.tsx`
   - Changed: `app/page.tsx`, `content/landing.json`, `components/three/LabObjectView.tsx`, `components/three/lab-objects.ts`, `components/three/studio-env.ts`, `components/ano/AnoView.tsx`
   - Changed in `components/landing/`: `BeliefSection`, `DropControls`, `DropScene`, `DropView`, `FinalCta`, `Hero`, `HeroCards`, `HowItWorks`, `LabCard`, `LabsSection`, `LowerBand`, `MeetAno`, `SectionHeading`, `useDropRun`
6. **`remake/selection-pages`**: "Grade dial with one changing level card on /start, My beliefs as one grouped column, sideways overflow clipped"
   - New: `components/explore/GradeDial.tsx`, `components/explore/LevelPicker.tsx`, `components/explore/LevelSelect.tsx`, `components/explore/level-picks.ts`, `components/explore/BeliefList.tsx`
   - Deleted: `components/explore/LevelCard.tsx`, `components/explore/BeliefGrid.tsx`
   - Changed: `lib/content.ts`, `lib/progress.ts` (comments only), `app/(explore)/layout.tsx`, `app/(explore)/start/page.tsx`, `app/(explore)/start/[level]/page.tsx`, `app/(explore)/labs/[lab]/[level]/page.tsx`, `app/(explore)/beliefs/page.tsx`, `components/explore/ExperimentPath.tsx`, `components/explore/ExploreBar.tsx`, `components/explore/PathNode.tsx`
7. **`remake/lab-studio-and-run`**: "Lab: the running state, a closer camera, one-hue studio light and benches, readouts in Martian Mono, verdict moments on the beat"
   - New: `components/lab/RunStatus.tsx`, `components/lab3d/scene/StudioLife.tsx`
   - Changed in `components/lab/`: `AnoDock`, `BuildControls`, `Inspector`, `LabExperiment`, `MissionCard`, `PredictDock`, `ResultDock`, `TimeScrubber`, `VerdictMoment`, `useRun`
   - Changed: `components/lab3d/shots.ts`
   - Changed in `components/lab3d/scene/`: `LabScene`, `Studio`, `VerdictBurst`
   - Changed in `components/lab3d/kit/`: `materials`, `Graph3D`, `TextBoard`, `circuit/Board3D`, `circuit/Tray3D`, `robot/Arena3D`, `robot/Lcd`, `robot/Multimeter3D`, `robot/Scope3D`, `chem/Scale3D`, `chem/instruments`, `chem/gas/PressureGauge`, `chem/heat/chart`, `chem/liquid/PhMeter`
   - Changed: `components/lab3d/stages/IndicatorStage3D.tsx`
8. **`sustaining/plain-copy`**: "Rewrite 'not just', 'never …, only' and unsupported copy plainly"
   - `content/ano-lines.json`, `content/hints/base-only-dilutes.json`, `content/hints/oxygen-only-helps.json`, `content/theory/neutralisation.json`, `lib/ai/prompt.ts`
9. **`filing/slop-scan-and-overflow-check`**: "Add the G13 slop scan and a no-sideways-scroll check; sample the Medium tier; test the hero teaser"
   - New: `scripts/slop-scan.mjs`, `tests/e2e/overflow.spec.ts`
   - Changed: `tests/e2e/perf.spec.ts`, `tests/e2e/flows.spec.ts`
10. **`sustaining/gauntlet-sessions-2-and-3`**: "Log the second and third gauntlet sessions"
    - `GAUNTLET_LOG.md`, `HANDOFF.md`

## 7. Open issues, manual checks, keys and questions
**Open issues:**
- **Rubric gaps (8 pages below 4 on at least one point, from the final Critics):**
  - **Lab framing at 1024 and 390.** The side cards cover apparatus at 1024 (LED, catalyst, series, neutralisation, PWM, equilibrium), and Ano covers the hot beaker on reaction speed at 390. Fix: frame each stage's camera inside the HUD's free area (between the top cards and the dock, beside Ano), or collapse the side cards below 1280 px.
  - **Phones:**
    - Run sits about 1,000–1,900 px below the 3D stage, so the run plays off-screen. Scroll the stage back into view on Run, or move the empty Inspector below the dock.
    - The 3D labels are about 4–6 px.
    - The breadcrumb cuts names to "Me…".
  - **Indicator colours at 390:** the Liquid segmented control overflows its dock card. It needs to wrap or scroll inside its parent.
  - **Equilibrium:** the NO₂ tubes render near-cream; give the brown more saturation.
  - **Parallel at 390:** the circuit is a thin strip. A closer phone camera would fix it.
  - **Landing at 390:** add space between the hero result card and "Learn why…". The deck's card clips its title and body.
  - **Credits:** almost no colour. A colour block or one accent element would fix it.
  - **Design system at 390:** the hero preview drops Ano.
- **Library licences.** See the questions below. Until you decide, nothing from those sites is in the code.
- **Lab bench tint (i2, cap reached).** The last Critic found the Chemistry bench greige, too close to the white scale and bag, and the Robotics board and tray grey. The final build has a follow-up (white board, volt tray, apricot-100 Chemistry bench, per-lab contact shadow). The final Critics' lab scores are above.
- **3D below the fold** renders blank in full-page captures, because views only draw on screen. It renders when scrolled into view (checked on the dev server for the deck and dial). Check the Robotics lab card on a real phone.
- **From the Critics, still open:**
  - at 390, the hero result card nearly touches "Learn why your intuition tripped.";
  - speech-bubble tails point at headlines;
  - the 404's Ano sits above the gap;
  - the map's apricot ribbon on the cool Robotics page;
  - the plinth status lights glow verify-green before any run (verify is reserved for verdicts).

**Needs manual check:**
- **Sound.** Session 2's plucks, stutter and whoosh, and the equaliser that now beats while sound is on, have never been heard (no speakers in headless Chrome).
- **Real AI providers.** With keys: run `ASK_ANO_EVAL=real npx vitest run tests/ask-ano.eval.ts`, about 20 calls.
- **Low-end hardware and tablets.** G10 ran on an M1 Pro with 4× throttling.
- **Safari and Firefox:** not tested.
- **Touch:** the dial on a real phone (only the arc and knob take input, so the page scrolls over the rest).

**Keys needed** (`.env.local`, never committed; template in `.env.example`):

| Variable | For | Without it |
|---|---|---|
| `GROQ_API_KEY` | Ask Ano answers | Written hints |
| `ELEVENLABS_API_KEY` | Ano's voice for answers | Browser speech |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limits and the answer cache | In-memory limits |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Eval grading | Real eval can't be graded |
| `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY` | Proposed jobs (session 1) | Nothing calls them yet |

Provider mapping (proposed in session 1, still waiting): Groq for Ask Ano, ElevenLabs for voice, Gemini for eval grading, Mistral for question screening, Cerebras for answer fact-checks, OpenRouter for typed hypotheses.

**Questions for you:**
1. **Library licences.**
   - Skiper's free tier allows use with attribution, but its own Terms of Service forbid copying, and the author disclaims being the original creator.
   - Aceternity forbids redistributing source files.
   - Animmaster is paid and non-redistributable.

   Do you want any original library code in this MIT repo? If so, which licence risk do you accept, and should we add Skiper's attribution or buy a licence? Otherwise our rebuilds stay.
2. **Rim light.** DESIGN.md §8 asks for a cool volt rim, but on apricot objects it read as an iridescent lilac edge (§0), so Chemistry and the landing use a warm white rim. Keep that?
3. **Corrective "X, not Y" lines in hints and theory**, for example "Equilibrium is a balance, not a stop." They aren't marketing copy, so the scanner allows them, but a Critic flagged them as borderline. Keep or rewrite?
4. **Easy uses the verify-green family** (DESIGN.md §3 "Levels"), but verify is also reserved for verdicts. Keep green for Easy?
5. **From session 2, still open:**
   - hero type width (68 → 75 %);
   - the 260 ms lab-card dive;
   - no shapes in the labs.
6. **From session 1:**
   - the provider mapping;
   - the libvips exception;
   - `ANOMALY_REQUIRE_KEYS`;
   - the arena mat;
   - refreshing CLAUDE.md (it still names Lucide, Host Grotesk, glass and a dark lab).

---

### Session 2 (also uncommitted), in brief
Rounds p1–p6:
- one spring motion kit;
- knock-around glossy shapes;
- a pinned scroll scene;
- the lab-card dive;
- a living lab studio;
- verdict sounds on the beat, and a mute toggle.

Four bugs were fixed: a lost prediction, an in-page wipe, a reduced-motion wipe, and teaser overflow. Its final run passed 135 of 135. Its files are folded into the commits in §6, and its log is in `GAUNTLET_LOG.md` under "Session 2".
