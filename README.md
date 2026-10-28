# ANOMALY

A cancer science lab for students aged 11 to 18. You guess what will happen, watch the real science run in 3D, and Ano, a friendly robot, shows you exactly where your thinking broke. Built for the CodeTheCure hackathon (Education).

In biology, cancer begins as an anomaly: one cell that stops following the body's rules. ANOMALY is also what you feel when reality contradicts your guess. The simulator (never an AI) decides what really happens; a wrong guess plays the ANOMALY moment, shows your idea as a ghost beside reality, pauses the replay at the exact moment they split, and walks you through three hints.

This is for learning, not medical advice. If you have questions about cancer or your health, talk to a parent, teacher or doctor.

> Live demo: _add the Vercel link here_ · Demo GIF: _add it here_

## What's inside

- **Four labs, one story:** Cell Lab (what cancer is), Prevention Lab, Detection Lab, Treatment Lab.
- **Five experiments:**
  - Why chemo causes hair loss (Treatment, Medium);
  - How tumours grow (Detection, Easy);
  - Cells out of control and Can you catch cancer? (Cell, Easy);
  - UV on a cloudy day (Prevention, Easy).
  - Radiotherapy beams and Born with it? are coming soon.
- **Every fact cited:** 41 claims confirmed on the WHO, the National Cancer Institute, Cancer Research UK and the American Cancer Society, recorded with the exact quote in `content/citations.json`. A missing citation fails the build. All of them are listed on `/science` with live validation results.
- **Teaching models, tested:** `engine/cancer/` simulates each idea; `tests/validation/` checks every model behaves as the sources describe (14 checks, shown on `/science`).
- **Wrong-model diagnosis, root belief finder, replay at the exact moment you were wrong, "What if?" buttons, calibration meter and a live count of busted ideas** (Upstash, real counts only).
- **Ask Ano and Explain it simpler:** 5 questions a session, cached, server-side only. Personal health questions get a warm redirect to a trusted adult, with no medical information.
- **A 60-second guided tour** at `/demo`.

## Run it

Needs Node 20 or newer.

```bash
npm install
cp .env.example .env.local   # optional: add free AI keys for Ask Ano
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build && npm start` | Production build (judge performance here, not in dev) |
| `npm run test` | Vitest: circuit solver, chemistry models, diagnosis engine, content checks |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

URL switches: `?quality=high` or `?quality=low` forces the 3D quality; `?debug=stats` exposes draw calls on `window.__anomalyStats`.

### Ask Ano keys (free tiers)

Everything works offline without keys; Ask Ano then answers with the next written hint. To turn the AI on, put any of these in `.env.local`. They're tried in this order:

| Provider | Key | Get one |
|---|---|---|
| Groq | `GROQ_API_KEY` | https://console.groq.com/keys |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | https://aistudio.google.com/apikey |
| Cerebras (optional) | `CEREBRAS_API_KEY` | https://cloud.cerebras.ai |
| Mistral (optional) | `MISTRAL_API_KEY` | https://console.mistral.ai/api-keys |
| OpenRouter (optional) | `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` | https://openrouter.ai/keys |

Keys are only read in `app/api/ask-ano/route.ts`. Never commit `.env.local`.

## Adding an experiment

1. Add `content/experiments/<lab>-<name>.json` (validated by `engine/schema.ts`): goal, Ano's intro, the board or controls, the prediction, the answer rule, misconceptions, allowed edits and a theory page.
2. If it needs new physics, add a stage model in `engine/<lab>/` and a renderer in `components/`.
3. `npm run test`. The content tests check that exactly one answer is right, that every listed misconception disagrees with reality somewhere, and that a "try this" edit exists.

## Credits

**Cancer facts:** World Health Organization, National Cancer Institute (cancer.gov), Cancer Research UK and the American Cancer Society. Every page used is listed with its date on `/science` and in `content/citations.json`.

**3D models:** all built in code for this project (MIT): the cells, dishes, microscope, scanner, UV meter, treatment machine, sun, clouds (drei `Cloud` with a puff texture generated in the repo) and backdrops. See RESOURCES.md §13 for the free models we checked and why none was used.
 and licences

ANOMALY is MIT licensed. Every 3D object is built from code; no assets are copied from reference sites.

- **Fonts**: [Archivo](https://fonts.google.com/specimen/Archivo), [Schibsted Grotesk](https://fonts.google.com/specimen/Schibsted+Grotesk) and [Martian Mono](https://fonts.google.com/specimen/Martian+Mono), all SIL Open Font License 1.1, self-hosted with `next/font`.
- **Icons**: our own set in `components/icons/`, drawn for ANOMALY.
- **UI patterns**: some interactions were studied on [Aceternity UI](https://ui.aceternity.com/), [Skiper UI](https://skiper-ui.com/) and [Animmaster Lib](https://animmasterlib.dev/) and rebuilt from scratch. No code was copied, because their licences don't allow it in an MIT project. RESOURCES.md §11 lists each pattern and where it lives.
- **Libraries**: three.js, @react-three/fiber, @react-three/drei, @react-three/rapier, lenis, maath, zustand, zod, @xyflow/react, opentype.js (MIT); postprocessing (Zlib); mathjs, Vercel AI SDK (Apache-2.0); idb (ISC).
- **Science**: theory pages cite OpenStax Chemistry 2e and College Physics 2e (CC BY 4.0) and the research papers listed in each misconception's `sources`. PhET and CircuitJS were studied only; no GPL code is used.
