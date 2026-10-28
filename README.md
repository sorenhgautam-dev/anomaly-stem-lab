# ANOMALY

A virtual STEM lab where students build their own chemistry and robotics experiments, and Ano finds the wrong belief behind each mistake, then guides them to fix it.

Students predict before every run. The simulator (never an AI) decides what really happens. A correct prediction earns a celebration and the next experiment. A wrong one plays the ANOMALY moment, shows the student's prediction as a dashed ghost beside reality, names the belief that predicts exactly what they said, and walks them through a three-step hint ladder and the one small change that breaks that belief.

> Live demo: _add the Vercel link here_ · Demo GIF: _add it here_

## What's inside

- **Landing page**: a Lusion-style 3D scroll journey (Predict → Diagnose → Break → Rebuild) with physics you can knock around, a glass lens cursor, kinetic 3D type and a "Which falls faster?" hero experiment. Runs at 60 fps at 1.5× resolution on a laptop, under 150 draw calls.
- **Level → lab → experiment map → experiment**: three levels (Easy grades 6–8, Medium 9–10, Advanced 11–12), two labs, 21 playable experiments plus "coming soon" stars.
  - Robotics: light a bulb, switches, series and parallel bulbs, LED and resistor, two-wheel steering, the shortcut wire, Ohm's law and power, gears, PWM motor control.
  - Chemistry: melting and particles, dissolving, mass in a sealed bag, indicator colours, gas particles and heat, reaction speed, neutralisation, burning, gas laws, catalysts, equilibrium.
- **Wrong-model diagnosis**: every misconception is its own simulator. If a wrong model predicts exactly what the student predicted, that belief is the diagnosis. Evidence builds up across runs.
- **Belief map**: every belief the labs can spot; the ones Ano saw in your runs glow, and the ones you break shatter.
- **Ask Ano**: the only AI feature, capped at 5 questions per session, cached, server-side only, with a written-hint fallback.

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

## Credits and licences

ANOMALY is MIT licensed. Every 3D object is built from code; no assets are copied from reference sites.

- **Fonts**: [Archivo](https://fonts.google.com/specimen/Archivo), [Schibsted Grotesk](https://fonts.google.com/specimen/Schibsted+Grotesk) and [Martian Mono](https://fonts.google.com/specimen/Martian+Mono), all SIL Open Font License 1.1, self-hosted with `next/font`.
- **Icons**: our own set in `components/icons/`, drawn for ANOMALY.
- **UI patterns**: some interactions were studied on [Aceternity UI](https://ui.aceternity.com/), [Skiper UI](https://skiper-ui.com/) and [Animmaster Lib](https://animmasterlib.dev/) and rebuilt from scratch. No code was copied, because their licences don't allow it in an MIT project. RESOURCES.md §11 lists each pattern and where it lives.
- **Libraries**: three.js, @react-three/fiber, @react-three/drei, @react-three/rapier, lenis, maath, zustand, zod, @xyflow/react, opentype.js (MIT); postprocessing (Zlib); mathjs, Vercel AI SDK (Apache-2.0); idb (ISC).
- **Science**: theory pages cite OpenStax Chemistry 2e and College Physics 2e (CC BY 4.0) and the research papers listed in each misconception's `sources`. PhET and CircuitJS were studied only; no GPL code is used.
