# Edge cases: new features, full test pass and fixes (28 October 2026)

Everything here ran on the **production build** (`ANOMALY_DESIGN_SYSTEM=1 npm run build`, then `next start -p 3100`) in real Chrome with the GPU on, an Apple M1 Pro. No `.env.local` exists, so every AI job ran on its written fallback and the live counter ran without Redis. Provider outages, limits and a live Redis count were faked with route mocks. No engine logic changed; the only `engine/` edit adds `export` to the existing edit schema so `content/what-if.json` can reuse it.

## The new features

| Feature | Where | How it works |
|---|---|---|
| Root belief finder | `content/root-beliefs.json`, `lib/root-beliefs.ts`, the lab's result panel and Ano's bubble, My ideas | 8 root ideas group 29 of the 31 tricky ideas. Each diagnosed wrong guess is saved as (experiment, idea). Two or more different wrong guesses under one root trigger Ano: "Two of your wrong guesses come from the same idea: heat always means more: hotter, bigger or more of something." My ideas lists each root with links to the experiments it caused. The same guess repeated in one experiment counts once. |
| The exact moment you were wrong | `content/replays.json`, `lib/replay.ts`, `components/lab/ReplayPanel.tsx`, `useReplay.ts`, `components/lab3d/scene/ReplayMarker.tsx` | After the ANOMALY word leaves, the run replays and pauses at the first frame where the student's idea (the wrong model's run) and reality differ by more than 3 % of the reading's range. The chart marks the split; a red ring pulses round the apparatus in 3D; Ano flies to point (on wide screens) and says one line with the real numbers. "Keep watching" plays on; "Show me the moment again" repeats. Circuits settle at once, so they pause the moment the power comes on. Reduced motion jumps straight to the moment. |
| What if? buttons | `content/what-if.json` (2 or 3 per experiment, all 21), `lib/what-if.ts`, `components/lab/WhatIf.tsx` | Shown after a run. One click applies the change and runs it at once. A What if? is a test drive: no verdict moment, no progress, no diagnosis evidence. The card shows the reading before and after. Ano reacts with the real change ("Seal the bag: the scale at the end went from 127.51 g to 130.00 g."). "Undo the change" goes back; "Make a guess for this" turns it into a normal test. Options that wouldn't change anything are hidden. |
| Live impact counter | `lib/impact.ts`, `app/api/impact/route.ts`, `components/landing/ImpactCounter.tsx` | One Upstash number, raised only when a belief is really busted (a right run after a diagnosed wrong one). The server checks the idea belongs to the experiment and caps each hashed IP at 120 per day. Without Redis there is no number, just: "The live count of busted ideas is taking a break right now. Every idea you bust still saves on this device." Never seeded or estimated. |
| Calibration meter | `lib/progress.ts` (`calls`), `lib/calibration.ts`, `components/explore/CalibrationMeter.tsx` | Each judged run saves its "How sure are you?" setting and whether it was right. My ideas shows "When you were sure, you were right 3 of 5 times." with a bar per setting. What if? runs never count. |
| Explain it simpler | `components/lab/ExplainSimpler.tsx`, `/api/ask-ano` (`mode: "simpler"`) | On the hint ladder (once "Why it happened" shows) and in the theory sheet. Sends the same simulator facts plus the text being read, and uses one of the 5 questions. Without an answer it shows the written "Why it happened" hint. |

## What was tested, and the result

Totals on the production build: all-experiments spec 21 of 21; edge-case and new-feature specs together 114 of 115 (the one failure is the keyboard focus ring, fixed in source and waiting for a rebuild); count specs 12 of 12; unit tests 654 of 654 (1 skipped).

| Area | What | Result |
|---|---|---|
| Unit tests | `npm run test`: 654 passed, 1 skipped (the real-provider eval). New: root beliefs with 0, 1, 2 and many wrong guesses; every What if? stays inside its control's range and steps; every wrong guess with a ghost has a replay moment whose numbers equal the simulator's at that frame; calibration tallies; formatting; the impact counter's checks and limit; Explain it simpler (prompt, cache, limit, fallback); the Ask Ano route with an empty, long, broken or off-topic question | Pass |
| Static | `npx tsc --noEmit`, `npm run lint`, `npm run slop` (0 hits) | Pass |
| Every experiment (`tests/e2e/experiments.spec.ts`) | All 21: each wrong guess (ANOMALY, replay pause and its numbers), then the right one, then every What if? with Undo. The result card, every Inspector row, the replay's numbers and the What if? card were checked against the simulator run in the test | 21 of 21 pass |
| New features (`tests/e2e/features.spec.ts`) | Replay (pause, Keep watching, again); no replay where there's no ghost; What if? doesn't count; root beliefs in the lab and on My ideas; Explain it simpler on hints and theory; the counter offline, live (mocked 1234) and with a 500 | Pass (2 failures in the first run were the test's own console filter, fixed) |
| Counts (`tests/e2e/counts.spec.ts`) | Level select (count, shelf models, lab split, ideas), lab cards, all 6 maps, landing counts, My ideas groups | 12 of 12 pass |
| Sliders | Melting power, gas laws volume, steering right wheel at minimum and maximum, each run with the simulator's answer | Pass |
| Runs | Same wrong guess twice ("Maybe" becomes "This looks like the idea you used"); three clicks on Run in one go start one run; leaving mid-run saves nothing and the page starts fresh; slow motion, pause (clock stands still), rewind; the clock ends at 380.0 s | Pass |
| Storage | Empty, a return visit with saved progress (1 busted), and cleared storage (back to 0); busting reports exactly one POST to the counter | Pass |
| Navigation | Refresh on all 31 routes including deep links; browser back and forward round a finished run; breadcrumbs (existing flows) | Pass |
| Ask Ano | Empty question (stays open with a nudge); no key (written hint); provider down (aborted request opens the next hint rung); limit hit (button shows 0 left and is disabled, a note says hints still work); empty, very long, broken and off-topic bodies at the route | Pass, never an error |
| Voice | ElevenLabs down (503): an Ask Ano answer tries it once, then the browser speaks it; mute stops speech and Listen says "Sound is off" | Pass |
| Screen sizes | No sideways scroll on all 31 routes at 1440, 1280 and 768 (390 and 1024 were already in `overflow.spec.ts`); a busy lab result (replay, hints, What if?) at 1440, 1280, 1024, 768 and 390 with every button inside the screen | Pass |
| Slow 3G | 400 ms latency, 500 kbit/s: the preloader shows, then the landing and a deep link to melting work | Pass |
| Low tier, CPU 4× | Melting with `?quality=low`, a wrong run, the replay and Keep watching | 60.3 fps, p95 16.7 ms |
| Reduced motion | The replay jumps straight to the moment | Pass |
| Keyboard only | Tab to a guess, pick it, Tab to Run, Enter | **Failed: no visible focus ring.** Fixed in source (see below); not yet re-run on a new build |
| Console | Every spec above fails on any console error, hydration warning or failed request | Clean, apart from deliberately faked outages |

## Bugs found and fixed

| # | Bug | Fix | Re-tested |
|---|---|---|---|
| 1 | No visible keyboard focus on any `Button`, `IconButton`, toggle, prediction choice, carousel dot, lab card or map node: `outline-none` overrode the site's `:focus-visible` ring | Removed `outline-none` from those 7 components, so the global 2 px volt ring shows on keyboard focus only | **No.** Needs a rebuild, then `npx playwright test tests/e2e/edge.spec.ts -g "keyboard"` |
| 2 | Melting's time scrubber ended at "10.0 s" while the 3D chart's axis counts real seconds to 380 s (any run with its own clock) | The scrubber and the replay read the run's own clock | Yes: the clock ends at 380.0 s; unit test checks the replay's seconds |
| 3 | Three quick clicks on Run could start runs on top of each other (the store didn't check it was already running) | `run()` ignores calls while a run plays | Yes: two runs counted, not four |
| 4 | Mute silenced sound effects but not Ano's voice | `speak()` does nothing while muted; muting stops speech; Listen says "Sound is off. Turn it on at the top to hear Ano." | Yes |
| 5 | Ask Ano with an empty question closed the box with no answer | The box stays open: "Type a question first, like 'Why did it change?'" | Yes |
| 6 | Before a run, a written-hint fallback was thrown away and Ano said "there's a hint just below" when no hint was on screen | The hint text shows in Ano's bubble when the ladder isn't on screen | Yes (no-key test) |
| 7 | Lab sound captions ("[Soft clink]") sat over the time scrubber on desktop | Lab captions sit top-centre at every width | Not re-screenshotted |
| 8 | Adding the replay made the wrong-guess dock too tall for 1440×900: the chart and Ano's bubble fell below the screen | Two columns: the result card and replay on the left, why and what to try on the right | Width checked at 5 sizes; not re-screenshotted |

## Not tested here

- Real Groq, ElevenLabs and Upstash calls (no keys). The counter's live number was checked with a mock.
- Safari, Firefox and touch devices.
- The full screenshot pass at 1440, 1024 and 390 was skipped at the owner's request. `tests/e2e/hunt.spec.ts` is ready: `HUNT=1 GAUNTLET_ROUND=hunt GAUNTLET_SKIP_BUILD=1 npx playwright test tests/e2e/hunt.spec.ts`.
