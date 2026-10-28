# Bug hunt (28 October 2026)

**Scope note.** The owner asked to stop before the full screenshot pass, so this hunt is **partial**. The bugs below were found by looking at screenshots of the new features at 1440 and by automated checks that compare the screen with the real data. The pass that screenshots every page and lab state at 1440, 1024 and 390 has **not** been run; its spec is ready in `tests/e2e/hunt.spec.ts` (run it with `HUNT=1`). Everything ran on the production build. Screenshots are git-ignored, so the paths below are local.

## Bugs found

| # | Page | Screen size | What was wrong | Screenshot | Status |
|---|---|---|---|---|---|
| 1 | Every page with buttons, toggles, guess cards, carousel dots, lab cards or map nodes | All | Keyboard focus was invisible: `outline-none` on 7 shared components overrode the site's focus ring. Found by the keyboard-only test (the focused Run button had no outline or ring) | None: it's an absence, found by measuring | Fixed in source; re-run pending a rebuild |
| 2 | Melting and particles (any run with its own clock) | All | The time scrubber ended at "10.0 s" and the first replay said "At 0.8 s", while the 3D chart beside it counts real seconds (0 to 380 s) | `tests/screenshots/round-features/feature-replay-paused-1440.png` (before the fix) | Fixed and re-tested |
| 3 | Experiment, after a wrong guess | 1440 × 900 | With the new replay, the dock was too tall: the replay chart was cut off at the bottom and Ano's speech bubble was pushed off screen | `tests/screenshots/round-features/feature-replay-paused-1440.png` | Fixed (two columns); width re-tested at 5 sizes, not re-screenshotted |
| 4 | Experiment | 1440 | The "[Soft clink]" caption sat over the time scrubber | `tests/screenshots/round-features/feature-what-if-1440.png` | Fixed (lab captions top-centre); not re-screenshotted |
| 5 | Experiment | All | Three quick clicks on Run could start runs on top of each other | None (behaviour) | Fixed and re-tested |
| 6 | Experiment, Ano's bubble | All | Mute didn't silence Ano's voice | None (sound) | Fixed and re-tested |
| 7 | Experiment, Ask Ano | All | An empty question closed the box with no reply | None (behaviour) | Fixed and re-tested |
| 8 | Experiment, Ask Ano before a run | All | Without a key, Ano said "there's a hint just below" when no hint was on screen | None (behaviour) | Fixed and re-tested |

Two things looked wrong in the first screenshots but weren't bugs:
- **The What if? Inspector** showed "Start temperature −9.6 °C" and "Melted 96 %" for a moment (`feature-what-if-1440.png`). Those were count-up animations caught mid-way: the all-experiments spec waits for them to settle, and every row then matched the simulator in all 21 experiments.
- **The My ideas screenshot** (`feature-root-beliefs-1440.png`) caught the preloader. The page itself passed its checks.

## Screen against data: what's now checked automatically
These fail if a mismatch comes back:
- `tests/e2e/counts.spec.ts`:
  - each level's count equals its shelf models (by name), its lab split and its distinct ideas;
  - lab cards, map nodes and the "0 of N done" line match;
  - the landing counts match;
  - My ideas' group counts equal the rows shown.
- `tests/e2e/experiments.spec.ts`: in all 21 experiments, these match the simulator:
  - the result card's "What really happened";
  - every Inspector row;
  - the replay's paused numbers;
  - every What if? card (before and after).
- `tests/e2e/edge.spec.ts`:
  - the scrubber clock matches the run's own clock;
  - calibration and busted counts match saved runs;
  - a bust sends exactly one count to the live counter.

No mismatch was found in any count or reading; every check passed.

## Still open, and why
- **The full visual pass** (every page and lab state at 1440, 1024 and 390): skipped at the owner's request. The spec is ready.
- **Live mode and teacher view**: they don't exist in this codebase, so there was nothing to test.
- **The focus-ring fix** needs a rebuild and the keyboard test re-run before it counts as verified.
- **Never re-screenshotted**: fixes 3 and 4.
- **Open from earlier sessions, not re-checked this time:**
  - lab framing at 1024 and 390;
  - small in-scene labels on phones;
  - the bag model;
  - the 404's empty lower area.
- **No engine bugs were found.**
