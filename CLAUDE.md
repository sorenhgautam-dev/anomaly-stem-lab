# CLAUDE.md — ANOMALY

This file tells Claude Code what we are building, how it should look, and the rules to follow. Read it fully before writing code. When something here conflicts with a quick idea, this file wins.

---

## 1. What we are building

**ANOMALY is a web app** (not a native mobile app and not a standalone game). It runs in the browser on laptops, Chromebooks and tablets, opens from a single link with no install or account, and feels like a game through its levels, effects and Ano. It is a virtual STEM lab for high school students (ages 14–18). Students build short, easy chemistry and robotics experiments in the browser. Before each run they predict the result. The simulator checks it.

- **Correct prediction:** Ano congratulates the student and offers two buttons: **Next experiment** and **See the theory**. No new problem is created.
- **Wrong prediction:** the **ANOMALY DETECTED** moment plays, the student's prediction appears as a **ghost** next to reality, and only then does Ano suggest one small change and walk them through a 3-step hint ladder.

**Ano** is the face of the product: a small floating glass robot with one glowing eye. Ano greets users on the landing page, guides every experiment, delivers verdicts, celebrates, and leads users to the next level.

**Elevator pitch:** ANOMALY is a virtual STEM lab where students build their own chemistry and robotics experiments, and Ano finds the wrong belief behind each mistake, then guides them to fix it.

**Hackathon:** Education track. Deadline is close, so the core loop must work before any polish.

---

## 1.1 Site structure and navigation

The landing page is a teaser, not the whole product. Users must always choose a level, then a lab, then an experiment. Ano guides each step with one short line.

**Flow:** Landing (hero experiment teaser) → **Choose your level** → **Choose your lab** → **Experiment map** → Experiment → result → Next experiment / See the theory / Back to map.

| Route | Screen | What it shows |
|---|---|---|
| `/` | Landing | Hero "Which falls faster?" teaser and scroll journey. Ends with a clear **Start exploring** button. After the hero result, Ano says: "Want more? Pick your level." |
| `/start` | Choose your level | Three options: **Easy** (middle school, grades 6–8), **Medium** (grades 9–10), **Advanced** (grades 11–12). Each shows a one-line description and how many experiments it has. |
| `/start/[level]` | Choose your lab | **Chemistry** or **Robotics**, as two 3D objects (a flask and a small robot). Hover tilts them toward the cursor; clicking flies the camera into that lab. |
| `/labs/[lab]/[level]` | Experiment map | All experiments for that lab and level as a glowing path of stars. Each star shows title, time (2–5 min) and status: done (gold), current (pulsing), locked (dim). Unlock in order; one correct run completes an experiment. |
| `/labs/[lab]/[level]/[id]` | Experiment | The lab HUD and the predict → run → verdict loop. |

- A persistent top bar shows **Level · Lab · Experiment** as clickable breadcrumbs, so users can switch level or lab at any time.
- Completing every experiment in a level shows a celebration and offers the next level up.
- Progress is saved per lab and level in IndexedDB.
- Optional: a 3-question warm-up on `/start` ("Not sure? Let Ano place you") that suggests a level.

### Experiment list

| Lab | Easy (grades 6–8) | Medium (grades 9–10) | Advanced (grades 11–12) |
|---|---|---|---|
| Chemistry | Melting and particles · Dissolving sugar · Mass in a sealed bag · Indicator colours (acid or base) | Gas particles and heat · Reaction speed and temperature · Neutralisation and pH · Burning in open vs sealed containers | Gas laws (PV = nRT) · Equilibrium (Le Chatelier) · Titration curves · Electrolysis · Activation energy and catalysts |
| Robotics | Light a bulb · Switches · Series vs parallel bulbs | LED and resistor · Buttons and sensors · Two-wheel steering · Program a sequence with blocks | Line follower with feedback · Ohm's law and power budget · Gears: speed vs strength · Motor speed control (PWM) · Obstacle avoidance |

Each experiment JSON has `"level": "easy" | "medium" | "advanced"` and `"grades": "6-8" | "9-10" | "11-12"`. Build at least 3 experiments per lab per level for Demo Day; the rest can show as locked "coming soon" stars.

### Sandbox mode (free build)

Inspiration: https://physandbox.com/ (study it if web access is available; take inspiration from how it feels, don't copy its code or assets).

- Unlocks after a student finishes the first level of a lab; also reachable from the breadcrumb bar.
- **Toolbox:** drag in objects (balls, boxes, ramps, springs, ropes, motors, magnets; in Robotics also batteries, LEDs, sensors and the brain).
- **World sliders:** gravity, friction, air resistance, time speed.
- **Time controls:** play, pause, step one frame, rewind.
- **Live graphs:** click any object to see its speed, energy or position over time.
- **Save and share:** encode the build in the URL so it can be shared as a link.
- **The ANOMALY twist:** before pressing play, the student can predict what will happen; Ano reacts if they were right or wrong. Predictions are optional in Sandbox.
- Libraries: `matter-js` for 2D sandboxes, `@react-three/rapier` for 3D (see RESOURCES.md).

---

## 2. Non-negotiable rules

1. **The simulator is the judge.** Every verdict ("Working" / "Not working yet"), every diagnosis, and every hint comes from deterministic code and written tables. Never let an AI model decide whether an experiment is correct.
2. **AI only does the jobs listed in §7.5, one provider per job.** The main one is "Ask Ano": a button the student presses to ask their own question, capped at 5 questions per session, cached, tiny prompt, and it must never contradict the simulator. No AI job ever decides a verdict.
3. **API keys never reach the browser.** Keys live in `.env.local` and are used only inside Next.js API routes (`app/api/*`). Never import a key into a client component.
4. **AI failures never block the student.** API keys are required (validated at startup) and offline use is not a goal. If an AI call fails while a student uses the app, Ano shows the next written hint, and voice falls back to the browser's speech. The student never sees an error.
5. **Experiments are easy.** 2–5 minutes each, only the parts needed, faint outlines showing where parts go, one thing to change and one thing to predict.
6. **Cinematic landing, clear labs.** The landing page is Lusion-level spectacle. Inside the labs, clarity beats effects: the experiment is always the focus and labels are always readable.
7. **Performance is a feature.** 60 fps on an ordinary laptop. Every heavy effect has a lower-quality fallback and a reduced-motion alternative.
8. **Licences.** This project is MIT. Only use or copy code licensed MIT, Apache-2.0, BSD, ISC or CC0, and credit it in the README. GPL code (PhET, CircuitJS) and Prosperity code (Lygia) are study-only: read them to understand the science or technique, then write our own code. Never paste their code. If unsure of a licence, stop and ask.
9. **Kids' privacy.** No accounts, no personal data, no stored chats. Progress saves locally in IndexedDB only.

---

## 3. Design direction: make it feel like Lusion

The target is an award-winning interactive studio site, not a school tool. **Take heavy inspiration from Lusion.** It is our primary reference and quality bar. Someone who knows Lusion should feel the same energy in ANOMALY: the same kind of glossy floating objects you can knock around, the lens cursor, the heavy scroll-driven camera, the kinetic 3D type, the cinematic post-processing, the satisfying sounds, the pacing and the polish. Study it closely and borrow its techniques, interaction patterns and feel as much as possible.

**Inspired by, not a clone.** The one line we don't cross: don't reproduce their actual assets or content. No copying their 3D models, textures, exact scene compositions, page layouts, text, logos, fonts or source code. Our objects are science objects (atoms, beakers, gears, robots, Ano), our story is Predict → Diagnose → Break → Rebuild, and our colours and type are our own tokens. Same feel and quality, our own world. This also keeps the project original for judging.

| Reference | Link | What to take from it |
|---|---|---|
| Lusion | https://lusion.co/ | **Primary.** Floating glossy 3D objects you can knock around, refractive lens cursor, scroll that drives a camera along a 3D path, kinetic 3D letters, bloom + chromatic aberration + grain, collision sounds |
| Active Theory | https://activetheory.net/ | Immersive WebGL worlds, seamless scene-to-scene transitions without page loads |
| Locomotive | https://locomotive.ca/ | Smooth weighted scrolling, editorial typography, confident layout rhythm |
| Studio Freight | https://studiofreight.com/ | Creators of Lenis; buttery scroll feel and restrained, precise motion |
| Paragon Productions | https://www.paragonproductions.co/ | Cinematic presentation and pacing |
| Turion Space | http://turionspace.com/ | Dark space aesthetic, sense of scale and depth |
| Heron | https://heron.ai/ | Sleek, minimal product UI to borrow for the in-lab HUD |

If web access is available, open these sites and study them before designing. If not, follow the detailed breakdown below, which describes the Lusion effects we want.

### 3.1 The Lusion effects to recreate (landing page)

1. **Hidden cursor → refractive lens.** Hide the system cursor. A small glass sphere (drei `MeshTransmissionMaterial`) follows the mouse with lerp smoothing and refracts whatever is behind it, like a magnifying glass.
2. **Floating glossy science objects.** ~25 objects built from primitives in code: atoms (sphere + 3 thin torus orbits), beakers, flasks, gears, light bulbs, tiny robots. `MeshPhysicalMaterial` with high clearcoat, some iridescence. Zero gravity, slow drift, linear + angular damping so they settle when untouched.
3. **Cursor collisions.** The cursor is an invisible kinematic physics body (Rapier). Moving through objects knocks them away realistically. Nearby objects slowly rotate to face the cursor (magnetic pull).
4. **Moving specular light.** Highlights sweep across glossy surfaces as the cursor moves (light or environment rotation tied to pointer position).
5. **Scroll drives a camera along a spline.** Scroll does not move the page. It sets progress `t ∈ [0,1]` along a `CatmullRomCurve3`. Four chapters: **Predict → Diagnose → Break → Rebuild**. Scrolling up retraces the path exactly. Camera position is lerped so motion feels heavy and fluid.
6. **Kinetic 3D type.** The letters of ANOMALY are separate meshes (drei `Text3D`) that tumble in from space and snap into place at a scroll milestone, then scatter at the Break chapter and reverse when scrolling back.
7. **Magnetic buttons.** Buttons lean toward the cursor on hover and press down in depth on click.
8. **Post-processing.** Bloom on highlights, chromatic aberration stronger at the screen edges, subtle film grain. Keep all three subtle.
9. **Sound.** Short glass clinks on hard collisions, a soft low click on button presses. Audio starts only after the first user click, with a visible mute toggle.
10. **Preloader.** A percentage counter while particles assemble into the ANOMALY logo, then burst into the scene.

### 3.2 The hero experiment

The hero asks: **"Which falls faster?"** above a heavy metal ball and a light glass ball. The visitor taps a guess. Gravity turns on for both balls only; they land together. **ANOMALY DETECTED** flashes with a glitch, Ano appears and says one line, and the scroll journey begins. The visitor experiences the product's core idea in the first five seconds.

### 3.3 Design tokens

The brief pins a dark Lusion-style world. Use these tokens; don't invent new colours ad hoc.

**Palette: "Bioluminescent lab", blue-led with tonal ramps and gradients.** Testers found single flat colours static. Every colour is a ramp of shades, and gradients carry most of the colour. Define all ramps in the Tailwind theme (`@theme` in `app/globals.css`) so components only use classes like `bg-depth-900`, `text-ion-300`, `from-ion-500`.

| Ramp | Shades (light → dark) | Role |
|---|---|---|
| `depth` (navy) | 700 `#132654` · 800 `#0C1A3D` · 900 `#071027` · 950 `#030712` | Backgrounds, lab walls, bench, glass panels |
| `ion` (blue, primary) | 50 `#EEF3FF` · 100 `#DCE6FF` · 200 `#B9CCFF` · 300 `#93AEFF` · 400 `#6C8CFF` · 500 `#4A6BF5` · 600 `#3450D6` · 700 `#283FAA` · 800 `#1F3180` · 900 `#18265E` | Main accent: buttons, links, particles, current, Ano's shell glow |
| `glow` (aqua-mint) | 200 `#A6F8E2` · 400 `#45F0C3` · 600 `#17B892` · 800 `#0B6E58` | Highlights at the bright end of blue gradients, Ano's eye, focus rings |
| `mist` (text) | 100 `#F1F7F7` · 200 `#DCEBEA` · 400 `#9FB3BC` · 600 `#62757F` | Text: primary, secondary, muted |
| `resolve` (gold) | 300 `#FFD27A` · 400 `#FFC24B` · 600 `#E69A12` | Correct answers and celebrations only |
| `anomaly` (coral red) | 300 `#FF8E83` · 400 `#FF5A4E` · 600 `#D9342B` | Wrong beliefs and ANOMALY DETECTED only |

**Signature gradients** (define once as Tailwind utilities or CSS variables, reuse everywhere):
- **Background:** radial `depth-800` at top centre fading to `depth-950` at the edges, plus one or two very soft `ion-700` light blobs that drift slowly.
- **Headings:** gradient text `ion-200 → ion-400 → glow-400`.
- **Primary buttons:** `ion-600 → ion-400`, shifting toward `glow-400` on hover.
- **Glass panels:** `depth-800/60` fill with a 1px gradient border `ion-400/40 → transparent`.
- **Abstract shapes and materials:** shader gradients `ion-800 → ion-400 → glow-200`, with iridescent shifts.
- **Verdicts:** correct `resolve-300 → resolve-600`; wrong `anomaly-300 → anomaly-600`.

Usage rules:
- Mostly `depth` shades, then `mist` text, then `ion`/`glow` as light. Use shades of the same ramp for hierarchy instead of new colours.
- Gold and coral are reserved for verdicts so their meaning stays clear.
- Never rely on colour alone (wrong vs correct also differ in icon, shape and sound).
- Check text contrast (WCAG AA) on every background shade.

- **Type:** a bold, expressive display font (wide, heavy, characterful, not generic) plus a readable body font, both free for commercial use and self-hostable (Fontshare, Google Fonts or similar), each with a real system fallback stack. **Not** Clash Grotesk or General Sans. The team picks the pair from 3 researched options, each with its licence checked and a screenshot of the landing title. Until then the code keeps Host Grotesk + Instrument Serif. `JetBrains Mono` only for live instrument readouts (voltmeter, scale, thermometer), because those are real instruments.
- **Surfaces:** frosted glass panels (`backdrop-filter: blur`), thin bright edge, no heavy drop shadows. Vary corner radius by hierarchy; don't put the same radius on everything.
- **Motion:** springy and weighted on the landing page; fast and calm (under 400 ms) inside labs.
- **Restraint:** spend the boldness on the landing page and the ANOMALY moment. Everything else is quiet. Avoid generic tells: no fade-and-slide-up on every section, no ALL-CAPS eyebrow labels above headings, no identical rounded cards with grey shadows, no `→` appended to every button.

### 3.4 Graphics quality bar: use the best 3D available

Aim for the most impressive real-time 3D we can ship at 60 fps. Use these techniques, all built from our own content:

**Materials and lighting**
- Physically based materials everywhere: `MeshPhysicalMaterial` with clearcoat, iridescence, sheen and transmission for glass and glossy plastic.
- Real reflections from HDRI environments (drei `Environment`, with `Lightformer` shapes to sculpt studio-style highlights).
- `MeshTransmissionMaterial` for glass (Ano's shell, beakers, the lens cursor) with chromatic aberration and slight distortion.
- `MeshReflectorMaterial` for a dark, glossy floor that reflects floating objects.
- Soft contact shadows (`ContactShadows` or `AccumulativeShadows` + `RandomizedLight`) instead of hard shadow maps.

**Custom shaders**
- Write GLSL with `three-custom-shader-material` to extend standard materials (fracture lines, glitch, glow pulses) without losing PBR lighting.
- Noise-driven effects (simplex/curl noise) for drifting particles, Ano's inner glow and the ANOMALY glitch.
- A cursor-reactive fluid or ripple background pass for the landing page (a simple stable-fluids or ping-pong render-target simulation).

**Particles**
- GPU particles: `InstancedMesh` for thousands of objects, and GPGPU (Three.js `GPUComputationRenderer`) for 50k+ particles that flow, swirl around the cursor and assemble into shapes (the ANOMALY logo, Ano forming, belief nodes shattering).
- drei `Sparkles` and `Trail` for small accents (current sparks, robot trails).

**Post-processing**
- Bloom (selective, on emissive parts only), chromatic aberration at the edges, film grain, vignette.
- Screen-space ambient occlusion (`N8AO`) for depth, and depth of field during cinematic camera moments.
- Tone mapping set deliberately (ACES or AgX) so colours stay rich, not washed out.

**Camera and choreography**
- Scroll-driven camera rails (GSAP ScrollTrigger + Lenis), with damped lerp for weight.
- `@theatre/core` + `@theatre/r3f` to choreograph cinematic sequences (preloader → hero, Break chapter shatter) with keyframes instead of hand-tuned numbers.
- Seamless scene transitions (Active Theory style): never a hard page load between landing, lab select and labs.

**Interaction**
- Rapier physics for collisions, grab-and-toss (`@use-gesture/react` for drag velocity), and the kinematic cursor body.
- `three-mesh-bvh` for fast, accurate raycasting on hover and click.

**Performance guards (always on)**
- drei `PerformanceMonitor` + `AdaptiveDpr` to drop quality automatically when FPS falls.
- `Instances` / `Merged` for repeated objects, compressed textures (KTX2) and Draco/Meshopt-compressed models if any are used.
- `r3f-perf` in dev to watch draw calls and frame time.

**Optional stretch:** Three.js's WebGPU renderer and TSL node materials are powerful but newer; only try them on a branch after everything works with WebGL.

**Original 3D assets only.** Build objects from primitives and shaders in code, or make them in Blender. If using free assets (Poly Haven HDRIs and textures, CC0 models), check the licence and credit them in the README.

### 3.6 Design revision (team feedback round 2)

The first build looked too generic, too plain, and the experiment page didn't feel like a lab. These rules override earlier visual choices where they conflict. Stay within the performance budget (section 9).

**1. Abstract shapes, not clip-art objects**
Literal beakers, gears and bulbs read as generic AI art. The landing page and selection screens use abstract forms that only *hint* at science:
- Liquid chrome or iridescent blobs with noise displacement (custom shader)
- Metaball clusters that merge and split like molecules (drei `MarchingCubes`)
- Glass prisms and crystals that split light into colour
- Interlocking rings and torus knots for orbits
- Ribbon surfaces that ripple like waves
- Particle clouds shaped like electron orbitals
Mix 3–4 shape families, vary scale strongly (one or two large hero forms, many small ones fading into depth), and keep generous empty space.

**2. The experiment page is a laboratory**
Each lab is a stylized, dark, futuristic laboratory in 3D, with the experiment on a bench in the centre:
- **Chemistry lab:** glossy dark lab bench, a fume-hood frame around the experiment area, back wall of softly lit panels, shelves of abstract glassware silhouettes, volumetric light beams with drifting dust.
- **Robotics lab:** workbench with a glowing cutting-mat grid, pegboard wall, tool silhouettes, a robot arena floor with neon lane lines.
- Camera at bench height, subtle parallax with the mouse, soft fog for depth.
- Instruments (scale, thermometer, multimeter) appear as physical devices on the bench with live holographic readouts above them.
- The HUD floats as glass panels over the scene. The experiment always stays the clear focus.
- **Approach (decided): hybrid.** One 3D room per lab, with the bench, the instruments as 3D devices and the holographic readouts. Each experiment's current 2D apparatus sits on the bench as a lit work surface, so every experiment keeps working. The two demo experiments, Light the LED and Mass in a sealed bag, get fully 3D apparatus.

**3. More life and detail (never clutter)**
- Ambient details: blinking status lights, slow holographic grids, a small data ticker, Ano idle animations (looking around, floating, blinking).
- Bench props that react: glassware rings faintly when the bench is clicked, lights flicker when power runs.
- Small labels and readouts in mono type on instruments.
- A mini map of level progress in a corner.

**4. VFX (pooled, GPU-instanced, off or reduced in low quality)**
- Sparks and electric arcs on short circuits and burnouts
- Smoke puffs and steam from reactions and burnt LEDs
- Bubbling and fizzing in liquids; liquid pouring with a shader or metaballs
- Heat shimmer distortion over hot objects
- Shockwave ring and particle burst on correct (gold) and on ANOMALY (red)
- Confetti in brand colours on level up
- Dissolve transitions between screens
- Very subtle screen shake on big moments (disabled with reduced motion)
Use `three.quarks` for particle effects, drei `Sparkles` / `Trail` / `Cloud` for small accents, and custom shaders for arcs, shimmer and dissolves.

**5. Voice for Ano**
See section 7.4.

### 3.7 Feedback round 3: transitions, success moment, smoothness

**Page transitions (currently too plain).** Use one persistent 3D canvas across all routes (the `pmndrs/react-three-next` pattern) so scenes never reload, and pair it with `motion`'s `AnimatePresence` for the HTML layer:
- Landing → level select: the camera dives through the largest abstract shape, which opens into the level choices.
- Level → lab: the chosen lab object grows and the camera flies into it.
- Experiment map → experiment: the camera zooms into the chosen star, which bursts into particles that assemble into the lab bench.
- Back navigation plays the same move in reverse.
- Between unrelated screens: a shader dissolve wipe in `ion` → `glow` gradient.
- 600–900 ms, eased (no linear motion), preload the next scene before starting. Reduced motion: a quick fade.

**Success moment (currently weak).** Correct prediction plays, in about 1.5 seconds and without blocking the screen:
1. A gold shockwave ring and particle burst from the experiment (`three.quarks`).
2. Ano spins, glows gold and says a line (voice if on).
3. Kinetic headline: letters of a short phrase ("Nailed it", varied) pop in with a spring.
4. A small card slides up showing **your prediction vs the result**, both ticked.
5. A progress bar fills and the experiment's star on the mini map turns gold.
6. **Next experiment** and **See the theory** buttons appear with a staggered fade.
7. A soft rising chime.
Level complete gets a bigger version with confetti in `ion`, `glow` and `resolve`. The ANOMALY moment mirrors this structure in coral with a glitch instead of a chime.

**Smoothness.** Everything already working should feel smoother: ease every animation, never jump between states, keep 60 fps (section 9), lerp all camera and object movement, and add hover/press feedback to every interactive element.

**Tailwind only.** All styling is Tailwind classes using the theme tokens, so teammates can check and edit styles in one place. No CSS modules, styled-components or inline styles for static values. `app/globals.css` only holds the `@theme` tokens, gradient utilities and base styles.

### 3.5 Inside the labs (the HUD, Heron-style minimal UI)

- **Top bar:** one thin glass strip with the mission goal, current step, and confidence setting.
- **Centre:** the experiment, always the visual focus.
- **Right panel:** inspector showing the selected part's live values.
- **Bottom:** time scrubber (pause, slow motion, rewind) and the **Run** button.
- **Ano:** floats near the experiment and flies to whichever part it is talking about.
- **Signature moments only:** ghost vs reality, ANOMALY DETECTED glitch (RGB split, scanline flash, then calm), glowing current particles, sparks and smoke on burnouts, gold burst on correct.

---

## 4. Tech stack and libraries

**See RESOURCES.md** for the full researched list: every library with its checked version and licence, open-source repos to learn from (R3F examples, Next.js + WebGL starters, physics and shader demos, science simulations, robotics tools), and the licence rules for reusing code. Follow those licence rules strictly.

Use Next.js App Router with TypeScript. Install with npm. Pin versions in `package.json` once installed and check each library's official docs for current APIs before using them.

**Node and versions (decided).** Development stays on **Node 20**. Don't upgrade Node or bump any package's major version. Keep the majors that run on Node 20: `ai@6`, `@ai-sdk/groq@3`, `@ai-sdk/google@3`, `@ai-sdk/openai-compatible@2`, `vitest@4`. Where RESOURCES.md lists newer majors that need Node 22+ (ai 7, @ai-sdk 4, vitest 5, planck 1.4.3+), its versions don't apply. **Vercel no longer builds on Node 20** (deprecated 1 October 2026; only 22.x and 24.x are offered), so the Vercel project's Node.js Version setting is **24.x**. Set it in Project Settings, not in `package.json` `engines`, which would warn on every local install. The project builds and tests the same on Node 24.

**No 2D physics library (decided).** `planck` was evaluated and skipped. Experiments keep running on the deterministic models in `engine/`; maintain those rather than adding a physics engine.

### Core
| Library | Purpose |
|---|---|
| `next`, `react`, `react-dom`, `typescript` | App framework |
| `tailwindcss` | Styling, driven by the tokens above |
| `zustand` | App state (current experiment, prediction, verdict, Ano state) |
| `zod` | Validate experiment, misconception and hint JSON files at load time |
| `idb` | Small wrapper around IndexedDB for saving progress |
| `clsx`, `tailwind-merge` | Class name helpers |
| `lucide-react` | Icons |

### 3D, physics and motion (landing page and Ano)
| Library | Purpose |
|---|---|
| `three` | WebGL engine |
| `@react-three/fiber` | Three.js in React |
| `@react-three/drei` | Helpers: `MeshTransmissionMaterial`, `Text3D`, `Environment`, `ContactShadows`, `Float` |
| `@react-three/postprocessing`, `postprocessing` | Bloom, chromatic aberration, noise |
| `@react-three/rapier` | Physics: collisions, impulses, the kinematic cursor body |
| `gsap`, `@gsap/react` | Timelines and ScrollTrigger |
| `lenis` | Smooth, weighted scrolling |
| `motion` | UI animation in React (Framer Motion's current package) |
| `maath` | Easing and damping helpers for R3F |
| `three-custom-shader-material` | Custom GLSL on top of PBR materials (fracture, glitch, glow) |
| `three-stdlib` | Extra Three.js utilities and loaders |
| `three-mesh-bvh` | Fast raycasting for hover, click and cursor interaction |
| `@theatre/core`, `@theatre/r3f` (+ `@theatre/studio` in dev) | Keyframed cinematic camera and scene choreography |
| `@use-gesture/react` | Drag, toss and gesture velocity for grabbing objects |

### Labs
| Library | Purpose |
|---|---|
| `pixi.js`, `@pixi/react` | Fast 2D rendering for particles, current flow, robot trails |
| `mathjs` | Linear solver (`lusolve`) for the circuit solver |
| `blockly` | Drag-and-drop programming for the robot's brain |
| `@xyflow/react` | Misconception map (React Flow) |
| `howler` | Sound effects |

### AI (server only, one job per provider, see §7.5)
| Library | Purpose |
|---|---|
| `ai` | Vercel AI SDK: one API for multiple providers |
| `@ai-sdk/groq` | Groq provider |
| `@ai-sdk/google` | Gemini provider |
| `@ai-sdk/openai-compatible` | Cerebras, Mistral and OpenRouter through one client |
| `@elevenlabs/elevenlabs-js` | Ano's voice |
| `@upstash/ratelimit`, `@upstash/redis` | Server-side rate limits and the answer cache |
| `@t3-oss/env-nextjs` | Validate every key at startup |

### Dev tools
| Library | Purpose |
|---|---|
| `leva` | Live tweaking panel for shader and physics values (dev only) |
| `r3f-perf` | FPS and draw-call monitor for the 3D scene (dev only) |
| `vitest` | Unit tests, especially for the circuit solver and diagnosis engine |

Fonts: self-host the chosen display and body fonts (§3.3) with `next/font` (`next/font/google`, or `next/font/local` with the files in `public/fonts`), JetBrains Mono via `next/font/google`.

---

## 5. Project structure

```
app/
  page.tsx                  # Landing page (3D hero + scroll journey)
  labs/page.tsx             # Lab select (3D: flask and robot you fly into)
  labs/chemistry/[id]/page.tsx
  labs/robotics/[id]/page.tsx
  api/ask-ano/route.ts      # The ONLY place AI is called
components/
  landing/                  # Scene, FloatingObjects, LensCursor, CameraRail, KineticTitle, HeroExperiment, Effects
  ano/                      # Ano3D, AnoBubble, useAno (state machine)
  lab/                      # HUD, Inspector, TimeScrubber, RunButton, GhostOverlay, AnomalyFlash, TheoryView
  chemistry/                # Beaker, ParticleView, Scale, Thermometer
  robotics/                 # BuilderGrid, Parts, Wire, BlocklyBrain, Arena
  map/                      # MisconceptionMap
engine/
  types.ts                  # Shared types (Experiment, Build, Prediction, Verdict, Misconception)
  run.ts                    # runExperiment(build, prediction) → verdict + diagnosis
  diagnose.ts               # wrong-model matching
  conflict.ts               # pick the small edit where belief and reality disagree most
  circuits/solver.ts        # Modified Nodal Analysis
  circuits/models.ts        # real model + wrong models
  robotics/kinematics.ts
  robotics/interpreter.ts   # runs Blockly programs
  chemistry/sim.ts
  chemistry/models.ts
content/
  experiments/*.json        # one file per experiment
  misconceptions/*.json
  hints/*.json              # 3-step hint ladders per misconception
  theory/*.json             # theory view content per experiment
  ano-lines.json            # greeting, building, correct, wrong, stuck, level-up lines (several variants each)
lib/
  store.ts  progress.ts  sound.ts  quality.ts
public/
  hdri/  sounds/  fonts/
```

---

## 6. The engine

### 6.1 The loop (every experiment)

1. Ano introduces the experiment and its goal.
2. The student places the few parts needed (snap to outlines).
3. The student makes a **prediction** (pick an answer, drag a slider, or draw a path).
4. **Run.** The simulator computes the real result.
5. Compare prediction to result:
   - **Match →** verdict `correct`. Ano celebrates (gold). Show **Next experiment** and **See the theory**. Done.
   - **No match →** verdict `wrong`. Run `diagnose()`. Play ANOMALY DETECTED. Show the ghost beside reality. Ano gives hint 1. Optionally show the conflict edit from `conflict()`. The student fixes and re-runs.
6. Finishing every experiment in a level passes it and unlocks the next.

### 6.2 Wrong-model diagnosis

Each misconception is a **wrong-model simulator**: the same lab physics, but following the student's mistaken rule.

```ts
interface Misconception {
  id: string;                 // "current-used-up"
  lab: "chemistry" | "robotics";
  title: string;              // "Current gets used up"
  simulate: (build: Build) => Outcome;   // wrong-model result
  hints: [string, string, string];       // nudge, principle, fix
  conceptIds: string[];       // links into the misconception map
}
```

`diagnose(build, prediction)`:
1. Run the build through every wrong model for that lab.
2. Any wrong model whose output matches the prediction (within tolerance) is a candidate.
3. Add evidence to that misconception across runs; only label it "likely" after 2+ matching runs.

`conflict(build, misconception)`: try a small set of allowed edits (add a bulb, seal the container, flip a part, change one wheel speed), run each through the real model and the wrong model, return the edit with the biggest difference. Keep the list of allowed edits per experiment in its JSON.

### 6.3 Circuit solver (Robotics Lab)

- Modified Nodal Analysis: build conductance matrix `G` and source vector, solve `G·v = i` with `mathjs.lusolve`.
- Parts: battery (voltage source with small internal resistance), wire, switch, button, resistor, bulb (resistor; brightness from power `P = I²R`), LED, motor (resistor + animation), buzzer.
- **LED model:** conducts only forward, only above ~2 V; above its current limit it **burns out** (pop, smoke, permanently dark until replaced).
- **Short circuit:** detect near-zero resistance across a source; don't crash, show sparks and a blown fuse.
- **Open circuit / singular matrix:** detect and treat as "no current," never throw.
- Re-solve only when the build changes.
- Write vitest tests for: series bulbs, parallel bulbs, backwards LED, LED without resistor, short circuit, open switch.

### 6.4 Robots

- Differential drive: `v = (vL + vR) / 2`, `ω = (vR − vL) / L`. Integrate position each frame.
- Sensors read the arena canvas (brightness under a line sensor, distance by raycast).
- Blockly blocks: `when run`, `forever`, `if sensor < value`, `set motor left/right`, `wait`. A small interpreter steps the program each frame.
- Prediction mode: student draws the expected path; show it as a ghost trail beside the real trail.

### 6.5 Chemistry

- Show two levels at once: the beaker the student sees and the particles inside (zoom in to see molecules).
- Experiments: conservation of mass (sealed vs open container on a scale), particles and heat (particles speed up, they don't grow), dissolving, reaction speed (temperature / concentration).
- Mass is always conserved in a sealed system; an open system loses gas particles visibly.
- Include short real-lab safety notes where relevant.

### 6.6 Experiment JSON (example)

```json
{
  "id": "robotics-led-01",
  "lab": "robotics",
  "level": "medium",
  "grades": "9-10",
  "order": 1,
  "title": "Light the LED",
  "goal": "Make the LED glow without burning it out.",
  "parts": ["battery", "led", "resistor", "wire"],
  "outlines": true,
  "prediction": { "type": "choice", "question": "Will the LED light up?", "options": ["Yes", "No"] },
  "misconceptions": ["led-any-direction", "no-resistor-needed"],
  "allowedEdits": ["flip-led", "remove-resistor", "add-resistor"],
  "theoryId": "led-basics"
}
```

---

## 7. Ano

### 7.1 States and reactions

| State | Line (pick a variant from `ano-lines.json`) | Look |
|---|---|---|
| `greet` | "Hey, I'm Ano. Want to break some science?" | Assembles from particles, eye opens |
| `building` | "Nice. What do you think will happen?" | Leans in, eye follows cursor |
| `correct` | "Nailed it! That's exactly how a scientist thinks." | Spins, gold glow, particle burst |
| `wrong` | "Whoa, did you see that? Let's figure out why." | Red glitch, then curious glow |
| `stuck` | "Want a hint? Just a small one." | Flies to the part that matters |
| `levelUp` | "Level complete! Ready for the next one?" | Celebration, flies to the next star |

Lines are short (one or two sentences), specific, varied, and never mock a wrong answer.

### 7.1b Ano teaches like a great teacher, not a fact machine

Testers said answers worked but were bland. Ano's written lines, hints and Ask Ano answers follow these rules:
- **Warm and encouraging:** treat mistakes as interesting ("Ooh, a lot of scientists thought that too!"), praise thinking, not just answers.
- **Socratic first:** guide with a question before explaining ("What do you think happens to the current after the first bulb?").
- **Analogies and real life:** explain with everyday comparisons (current as water in pipes, particles as people in a crowded room) and where students see it in daily life.
- **One idea at a time,** short sentences, matched to the level (Easy = simple words, Advanced = correct terms and formulas).
- **End with a nudge:** a tiny question or "try this next" so the student keeps thinking.
- **Never** lecture, list dry facts, or contradict the simulator.

Ask Ano system prompt must include this persona plus 3–5 example answers written in this style. Rewrite all hints and lines in `content/` to match. Add teacher-quality checks to `tests/ask-ano.eval.ts` (asks a guiding question, uses an analogy or real-life link, under 80 words, correct science).

### 7.2 Who produces what

| Moment | Source | API call? |
|---|---|---|
| Verdict | Simulator, spoken by Ano | No |
| Explanation + 3 hints | `content/hints/*.json` | No |
| Congratulations, level-up | `content/ano-lines.json` | No |
| Ask Ano (student's own question) | AI via `/api/ask-ano` | Yes, capped |

### 7.3 Ask Ano rules (`app/api/ask-ano/route.ts`)

- Answered by the one provider §7.5 assigns to Ask Ano. No second provider: if that call fails, Ano shows the next written hint.
- Cap: 5 questions per session; show "3 left" on the button.
- Cache by `(experimentId, faultCode, normalised question)`.
- Prompt contains only: experiment title, fault code, the simulator's numbers, the verdict, and the question.
- System instructions: speak as Ano (friendly lab partner for a teenager), explain in under 80 words in Ano's teacher style (section 7.1b), use only the facts provided, **never contradict the verdict**, stay on STEM, gently redirect anything else.
- Use each provider's safety settings. Don't log or store the question.

---

### 7.4 Ano's voice (optional, off by default)

- A speaker toggle next to Ano's speech bubble and on every Ask Ano answer: "Listen".
- **Written lines** (greetings, verdicts, hints, congratulations): pre-generate MP3 files once at build time with ElevenLabs (`@elevenlabs/elevenlabs-js`, server-side script), store them in `public/voice/`, and play them with Howler. No API calls at runtime.
- **Ask Ano answers:** generate speech in a server route `app/api/ano-voice/route.ts` with ElevenLabs, behind the same rate limiter and cache (Upstash) as Ask Ano. Cache audio by answer text so repeated answers are free.
- **Fallback:** if ElevenLabs fails, is rate-limited or out of quota, use the browser's built-in `speechSynthesis`. The student never sees an error.
- One friendly, clear voice for Ano across the whole site. Keys only in env vars. Voice output only; never record the student's microphone.
- Show captions (the text) whenever audio plays.

### 7.5 AI jobs and providers (decided)

- **One provider per job, one job per provider.** No provider handles two jobs, and there are no provider-to-provider fallback chains.
- Providers in use: Groq, Gemini, Cerebras, Mistral, OpenRouter (LLMs) and ElevenLabs (voice).
- **Each job has its own module in `lib/ai/`** (for example `lib/ai/askAno.ts`) **and its own route in `app/api/`.** No other file calls a provider.
- **Keys are required.** The keys for every job are validated at startup with `@t3-oss/env-nextjs`. A missing or malformed key stops the server instead of failing on the first request.
- **Fallback:** only for a call that fails while the app is in use (for example during the demo). Text jobs fall back to the next written hint, and voice to the browser's `speechSynthesis`.
- The job → provider table goes here once the team approves it.

## 8. Build order

Work in this order. Don't start polish before the core loop works end to end.

1. **Foundation:** Next.js + Tailwind + tokens + fonts. Zustand store. Types in `engine/types.ts`.
2. **One full loop:** one robotics experiment (light the LED) with builder, prediction, solver, verdict, ghost, ANOMALY flash, hint ladder, Next experiment / See the theory.
3. **Circuit solver complete** with tests.
4. **Chemistry:** conservation of mass experiment end to end.
5. **Ano 2D first** (simple glowing orb in the HUD with lines), then Ano 3D.
6. **Remaining experiments:** 5 levels per lab (see `content/experiments`).
7. **Robot arena** with Blockly.
8. **Misconception map** with shatter animation.
9. **Landing page:** scene → objects → physics + cursor → post-processing → lens cursor → camera rail → kinetic title → hero experiment → sound → preloader.
10. **Lab select** 3D fly-in transition.
11. **Ask Ano** API route with caps, cache and fallback.
12. **Polish:** micro-interactions, sounds, quality modes, reduced motion, mobile layout.

After each step: run it, take a screenshot if possible, compare against this file, and fix what looks off before moving on.

---

## 9. Quality, performance and accessibility

### Performance budget (hard limits)

- **Steady 60 fps** on the production build (`npm run build && npm start`). Never judge speed in dev mode.
- **At most ONE `MeshTransmissionMaterial`** on screen (the lens cursor), at low resolution and samples. Fake all other glass with `MeshPhysicalMaterial` + environment map.
- **dpr capped at `[1, 1.5]`**, with drei `PerformanceMonitor` + `AdaptiveDpr`.
- **Under 150 draw calls** on the landing page; use `Instances` / `Merged` for repeats.
- **Post-processing:** one `EffectComposer`, multisampling off; bloom + light chromatic aberration + grain only. No N8AO or depth of field on the landing page.
- **No React state updates per frame.** Mouse, scroll and animation values live in refs or zustand transient updates.
- **One animation loop:** Lenis and GSAP driven from the same ticker as R3F.
- **1K HDRIs, simple colliders (spheres, boxes), shadows baked once** (`ContactShadows frames={1}`).
- Check `r3f-perf` after every visual change and report FPS and draw calls.

### No hydration mismatches

The first render must be identical on server and client. Never read `window`, storage, IndexedDB, media queries, screen size, `Date.now()` or `Math.random()` during render. Read them in `useEffect` after mount, or load browser-only components with `dynamic(..., { ssr: false })`. Wait for persisted stores to hydrate before using saved values.

### Other quality rules

- Cap device pixel ratio at 2. Keep landing physics objects to 20–40.
- `lib/quality.ts`: `high` / `low`. Low disables the lens cursor, chromatic aberration and reduces particles. Auto-drop to low if FPS stays under 45.
- Respect `prefers-reduced-motion`: no camera rail flying, no glitch flashes; use fades instead.
- Keyboard controls for all lab actions, visible focus rings (`glow` colour).
- Ghost colours must be distinguishable for colourblind users (use shape and opacity, not only colour).
- Captions for every sound cue.
- Responsive down to tablet for labs; landing page works on mobile with a simplified scene.

---

## 10. Commands and conventions

```bash
npm run dev      # local dev
npm run build    # production build (must pass before any commit to main)
npm run test     # vitest
npm run lint
```

- TypeScript strict mode. No `any` in `engine/`.
- `engine/` is pure TypeScript with no React imports, so it can be tested in isolation.
- Content (experiments, hints, lines, theory) lives in JSON, never hard-coded in components.
- Client components that use WebGL are loaded with `dynamic(..., { ssr: false })`.
- Never commit `.env.local`. Required env vars: the key for each provider in §7.5 (`GROQ_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY`), plus `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. `.env.example` lists them all.

---

## 10.1 Code quality rules (from team code review)

These came from a review of the first build. Follow them for all new code and when touching old code.

**Components (TSX)**
- Small components with one job each. If a file passes ~150 lines or does two things, split it.
- Typed props, no `any`. Logic goes in hooks (`hooks/` or the feature's `use*.ts`), components only render.
- Never write the same thing twice. Repeated markup becomes a shared component; repeated logic becomes a hook or a function in `lib/`.

**Files and folders**
- Organize by feature, not by file type: everything for one feature (component, hook, styles, types, tests) lives in that feature's folder (`components/lab/`, `components/ano/`, `engine/circuits/` …). Shared pieces go in `components/ui/` and `lib/`.
- One clear home for each thing. Before creating a file, check whether one already exists for that purpose.

**Fonts**
- Load fonts once in `app/layout.tsx` (`next/font`), expose them as CSS variables, and map them in the Tailwind theme (`font-display`, `font-body`, `font-mono`). Components only use those classes; never declare `font-family` in a component.

**CSS**
- All colours, spacing, radii and fonts come from the Tailwind theme tokens (section 3.3). No hard-coded hex values in components.
- `app/globals.css` holds only base styles, CSS variables and a few global utilities.
- Component variants (button sizes, states) use `class-variance-authority` + `tailwind-merge`, not copied class strings.
- No inline `style` for static values, no `!important`, no one-off overrides.

**Buttons and hit areas**
- The clickable area must match the visible button exactly. Put padding, size and the click handler on the same element.
- Hover effects (magnetic pull, scale) move only the inner content, never the hit area, and never shrink it.
- Minimum target size 44 × 44 px; if a button looks smaller, make it look that size too rather than adding invisible padding.
- 3D clickable objects: raycast against the visible mesh or a collider that matches it closely.
- Add a dev-only `?debugHit` mode that outlines every clickable area so mismatches are easy to spot.

**AI and API keys (one service, one job)**
- One module per AI job in `lib/ai/`, each used by its own route in `app/api/` (§7.5). No other file calls an AI provider.
- Each job uses exactly one provider. The written-hint fallback for a failed call lives inside that job's module.
- Keys only come from environment variables, validated at startup with `@t3-oss/env-nextjs` (or zod) **before** any request is made. Never hard-code a key, never log one, never commit `.env.local`. If a key was ever committed, rotate it at the provider.
- **Server-side rate limiting on `/api/ask-ano`.** The 5-questions counter in the UI is only for display; anyone can bypass it. Enforce limits in the route with `@upstash/ratelimit` + `@upstash/redis` (free tier): about 5 questions per session and 20 per IP per hour, plus a global daily cap below the AI providers' free quota. When a limit is hit, return the next written hint instead of an error. Store the answer cache in the same Redis. Keep the request body small and validate it with zod.
- **No database for the MVP.** Progress stays in the browser (IndexedDB); experiments, hints and theory are JSON files. Add a database (e.g. Postgres) only for roadmap features like teacher accounts or class views.
- "Accuracy" means grounding, not training: send the simulator's facts, a strict system prompt, 3–5 example Q&A pairs, and a fixed answer length. We do not fine-tune models.
- Keep `tests/ask-ano.eval.ts`: about 20 sample questions with the facts sent and the points a good answer must contain (and must not contradict). Run it with a mock provider in CI and against the real provider before Demo Day, and record the pass rate.

After any refactor: `npm run build`, `npm run test` and a manual click-through must all pass before moving on.

## 10.2 Git workflow (decided)

**The team makes every commit.** Claude Code never runs `git commit`, `git push` or `git merge`, and never creates or switches branches. After each change or phase, Claude Code:
1. Pauses and says the change is ready.
2. Names the branch it belongs on, using the branch types below.
3. Lists every file it changed.
4. Suggests a short commit message.

The team commits it, then says when to continue.

- **Small commits, one change each.** Changes merge into `main` only after review.
- **No attribution.** No co-author lines and no mention of Claude in commit messages, code comments or the README.

| Branch | For |
|---|---|
| `opinion/...` | Changes from tester feedback |
| `suggestion/...` | Changes from the teammate's code review |
| `remake/...` | Big rebuilds (landing page, labs) |
| `adjustment/...` | Small tweaks (colours, buttons, spacing) |
| `ideas/...` | Experiments that might get thrown away |
| `filing/...` | File and folder organisation |
| `sustaining/...` | Fixes, performance and maintenance |
| `claude-align-md` | Updating CLAUDE.md |

## 11. Definition of done (for Demo Day)

- [ ] Landing page loads with the preloader and looks Lusion-level within 3 seconds
- [ ] Hero "Which falls faster?" experiment works
- [ ] At least 5 robotics and 4 chemistry experiments playable end to end
- [ ] Correct → congratulations + Next experiment + See the theory
- [ ] Wrong → ANOMALY moment + ghost + diagnosis + hints + fix
- [ ] Misconception map updates and shatters broken beliefs
- [ ] Ask Ano works with the cap, cache and written-hint fallback
- [ ] 60 fps on the demo laptop, low-quality mode works
- [ ] No API keys in client code; `npm run build` passes
- [ ] README with GIF, live link, and run instructions