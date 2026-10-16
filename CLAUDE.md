CLAUDE.md — ANOMALY

This file tells Claude Code what we are building, how it should look, and the rules to follow. Read it fully before writing code. When something here conflicts with a quick idea, this file wins.

1. What we are building

ANOMALY is a web app (not a native mobile app and not a standalone game). It runs in the browser on laptops, Chromebooks and tablets, opens from a single link with no install or account, and feels like a game through its levels, effects and Ano. It is a virtual STEM lab for high school students (ages 14–18). Students build short, easy chemistry and robotics experiments in the browser. Before each run they predict the result. The simulator checks it.

Correct prediction: Ano congratulates the student and offers two buttons: Next experiment and See the theory. No new problem is created.
Wrong prediction: the ANOMALY DETECTED moment plays, the student's prediction appears as a ghost next to reality, and only then does Ano suggest one small change and walk them through a 3-step hint ladder.

Ano is the face of the product: a small floating glass robot with one glowing eye. Ano greets users on the landing page, guides every experiment, delivers verdicts, celebrates, and leads users to the next level.

Elevator pitch: ANOMALY is a virtual STEM lab where students build their own chemistry and robotics experiments, and Ano finds the wrong belief behind each mistake, then guides them to fix it.

Hackathon: Education track. Deadline is close, so the core loop must work before any polish.

1.1 Site structure and navigation

The landing page is a teaser, not the whole product. Users must always choose a level, then a lab, then an experiment. Ano guides each step with one short line.

Flow: Landing (hero experiment teaser) → Choose your level → Choose your lab → Experiment map → Experiment → result → Next experiment / See the theory / Back to map.

Route	Screen	What it shows
/	Landing	Hero "Which falls faster?" teaser and scroll journey. Ends with a clear Start exploring button. After the hero result, Ano says: "Want more? Pick your level."
/start	Choose your level	Three options: Easy (middle school, grades 6–8), Medium (grades 9–10), Advanced (grades 11–12). Each shows a one-line description and how many experiments it has.
/start/[level]	Choose your lab	Chemistry or Robotics, as two 3D objects (a flask and a small robot). Hover tilts them toward the cursor; clicking flies the camera into that lab.
/labs/[lab]/[level]	Experiment map	All experiments for that lab and level as a glowing path of stars. Each star shows title, time (2–5 min) and status: done (gold), current (pulsing), locked (dim). Unlock in order; one correct run completes an experiment.
/labs/[lab]/[level]/[id]	Experiment	The lab HUD and the predict → run → verdict loop.
A persistent top bar shows Level · Lab · Experiment as clickable breadcrumbs, so users can switch level or lab at any time.
Completing every experiment in a level shows a celebration and offers the next level up.
Progress is saved per lab and level in IndexedDB.
Optional: a 3-question warm-up on /start ("Not sure? Let Ano place you") that suggests a level.
Experiment list
Lab	Easy (grades 6–8)	Medium (grades 9–10)	Advanced (grades 11–12)
Chemistry	Melting and particles · Dissolving sugar · Mass in a sealed bag · Indicator colours (acid or base)	Gas particles and heat · Reaction speed and temperature · Neutralisation and pH · Burning in open vs sealed containers	Gas laws (PV = nRT) · Equilibrium (Le Chatelier) · Titration curves · Electrolysis · Activation energy and catalysts
Robotics	Light a bulb · Switches · Series vs parallel bulbs	LED and resistor · Buttons and sensors · Two-wheel steering · Program a sequence with blocks	Line follower with feedback · Ohm's law and power budget · Gears: speed vs strength · Motor speed control (PWM) · Obstacle avoidance

Each experiment JSON has "level": "easy" | "medium" | "advanced" and "grades": "6-8" | "9-10" | "11-12". Build at least 3 experiments per lab per level for Demo Day; the rest can show as locked "coming soon" stars.

Sandbox mode (free build)

Inspiration: https://physandbox.com/ (study it if web access is available; take inspiration from how it feels, don't copy its code or assets).

Unlocks after a student finishes the first level of a lab; also reachable from the breadcrumb bar.
Toolbox: drag in objects (balls, boxes, ramps, springs, ropes, motors, magnets; in Robotics also batteries, LEDs, sensors and the brain).
World sliders: gravity, friction, air resistance, time speed.
Time controls: play, pause, step one frame, rewind.
Live graphs: click any object to see its speed, energy or position over time.
Save and share: encode the build in the URL so it can be shared as a link.
The ANOMALY twist: before pressing play, the student can predict what will happen; Ano reacts if they were right or wrong. Predictions are optional in Sandbox.
Libraries: matter-js for 2D sandboxes, @react-three/rapier for 3D (see RESOURCES.md).
2. Non-negotiable rules
The simulator is the judge. Every verdict ("Working" / "Not working yet"), every diagnosis, and every hint comes from deterministic code and written tables. Never let an AI model decide whether an experiment is correct.
AI is only for "Ask Ano." A button the student presses to ask their own question. Capped at 5 questions per session, cached, tiny prompt, and it must never contradict the simulator.
API keys never reach the browser. Keys live in .env.local and are used only inside Next.js API routes (app/api/*). Never import a key into a client component.
Everything works offline except Ask Ano. If the AI call fails, Ano shows the next written hint. The student never sees an error.
Experiments are easy. 2–5 minutes each, only the parts needed, faint outlines showing where parts go, one thing to change and one thing to predict.
Cinematic landing, clear labs. The landing page is Lusion-level spectacle. Inside the labs, clarity beats effects: the experiment is always the focus and labels are always readable.
Performance is a feature. 60 fps on an ordinary laptop. Every heavy effect has a lower-quality fallback and a reduced-motion alternative.
Licences. This project is MIT. Only use or copy code licensed MIT, Apache-2.0, BSD, ISC or CC0, and credit it in the README. GPL code (PhET, CircuitJS) and Prosperity code (Lygia) are study-only: read them to understand the science or technique, then write our own code. Never paste their code. If unsure of a licence, stop and ask.
Kids' privacy. No accounts, no personal data, no stored chats. Progress saves locally in IndexedDB only.
3. Design direction: make it feel like Lusion

The target is an award-winning interactive studio site, not a school tool. Take heavy inspiration from Lusion. It is our primary reference and quality bar. Someone who knows Lusion should feel the same energy in ANOMALY: the same kind of glossy floating objects you can knock around, the lens cursor, the heavy scroll-driven camera, the kinetic 3D type, the cinematic post-processing, the satisfying sounds, the pacing and the polish. Study it closely and borrow its techniques, interaction patterns and feel as much as possible.

Inspired by, not a clone. The one line we don't cross: don't reproduce their actual assets or content. No copying their 3D models, textures, exact scene compositions, page layouts, text, logos, fonts or source code. Our objects are science objects (atoms, beakers, gears, robots, Ano), our story is Predict → Diagnose → Break → Rebuild, and our colours and type are our own tokens. Same feel and quality, our own world. This also keeps the project original for judging.

Reference	Link	What to take from it
Lusion	https://lusion.co/	Primary. Floating glossy 3D objects you can knock around, refractive lens cursor, scroll that drives a camera along a 3D path, kinetic 3D letters, bloom + chromatic aberration + grain, collision sounds
Active Theory	https://activetheory.net/	Immersive WebGL worlds, seamless scene-to-scene transitions without page loads
Locomotive	https://locomotive.ca/	Smooth weighted scrolling, editorial typography, confident layout rhythm
Studio Freight	https://studiofreight.com/	Creators of Lenis; buttery scroll feel and restrained, precise motion
Paragon Productions	https://www.paragonproductions.co/	Cinematic presentation and pacing
Turion Space	http://turionspace.com/	Dark space aesthetic, sense of scale and depth
Heron	https://heron.ai/	Sleek, minimal product UI to borrow for the in-lab HUD

If web access is available, open these sites and study them before designing. If not, follow the detailed breakdown below, which describes the Lusion effects we want.

3.1 The Lusion effects to recreate (landing page)
Hidden cursor → refractive lens. Hide the system cursor. A small glass sphere (drei MeshTransmissionMaterial) follows the mouse with lerp smoothing and refracts whatever is behind it, like a magnifying glass.
Floating glossy science objects. ~25 objects built from primitives in code: atoms (sphere + 3 thin torus orbits), beakers, flasks, gears, light bulbs, tiny robots. MeshPhysicalMaterial with high clearcoat, some iridescence. Zero gravity, slow drift, linear + angular damping so they settle when untouched.
Cursor collisions. The cursor is an invisible kinematic physics body (Rapier). Moving through objects knocks them away realistically. Nearby objects slowly rotate to face the cursor (magnetic pull).
Moving specular light. Highlights sweep across glossy surfaces as the cursor moves (light or environment rotation tied to pointer position).
Scroll drives a camera along a spline. Scroll does not move the page. It sets progress t ∈ [0,1] along a CatmullRomCurve3. Four chapters: Predict → Diagnose → Break → Rebuild. Scrolling up retraces the path exactly. Camera position is lerped so motion feels heavy and fluid.
Kinetic 3D type. The letters of ANOMALY are separate meshes (drei Text3D) that tumble in from space and snap into place at a scroll milestone, then scatter at the Break chapter and reverse when scrolling back.
Magnetic buttons. Buttons lean toward the cursor on hover and press down in depth on click.
Post-processing. Bloom on highlights, chromatic aberration stronger at the screen edges, subtle film grain. Keep all three subtle.
Sound. Short glass clinks on hard collisions, a soft low click on button presses. Audio starts only after the first user click, with a visible mute toggle.
Preloader. A percentage counter while particles assemble into the ANOMALY logo, then burst into the scene.
3.2 The hero experiment

The hero asks: "Which falls faster?" above a heavy metal ball and a light glass ball. The visitor taps a guess. Gravity turns on for both balls only; they land together. ANOMALY DETECTED flashes with a glitch, Ano appears and says one line, and the scroll journey begins. The visitor experiences the product's core idea in the first five seconds.

3.3 Design tokens

The brief pins a dark Lusion-style world. Use these tokens; don't invent new colours ad hoc.

Token	Hex	Use
void	
#05060A	Background, the deep space everything floats in
pearl	
#EDEBFF	Primary text, iridescent highlights
lilac	
#B8A6FF	Ano's glow, primary accent, interactive states
signal	
#3D7BFF	Current in wires, active particles, focus rings
anomaly	
#FF3B5C	Wrong beliefs, the ANOMALY DETECTED moment only
resolve	
#F2C14E	Correct predictions, completed levels, celebrations
Type: Clash Grotesk (display, from Fontshare) and General Sans (body, from Fontshare), each with a real system fallback stack. JetBrains Mono only for live instrument readouts (voltmeter, scale, thermometer), because those are real instruments.
Surfaces: frosted glass panels (backdrop-filter: blur), thin bright edge, no heavy drop shadows. Vary corner radius by hierarchy; don't put the same radius on everything.
Motion: springy and weighted on the landing page; fast and calm (under 400 ms) inside labs.
Restraint: spend the boldness on the landing page and the ANOMALY moment. Everything else is quiet. Avoid generic tells: no fade-and-slide-up on every section, no ALL-CAPS eyebrow labels above headings, no identical rounded cards with grey shadows, no → appended to every button.
3.4 Graphics quality bar: use the best 3D available

Aim for the most impressive real-time 3D we can ship at 60 fps. Use these techniques, all built from our own content:

Materials and lighting

Physically based materials everywhere: MeshPhysicalMaterial with clearcoat, iridescence, sheen and transmission for glass and glossy plastic.
Real reflections from HDRI environments (drei Environment, with Lightformer shapes to sculpt studio-style highlights).
MeshTransmissionMaterial for glass (Ano's shell, beakers, the lens cursor) with chromatic aberration and slight distortion.
MeshReflectorMaterial for a dark, glossy floor that reflects floating objects.
Soft contact shadows (ContactShadows or AccumulativeShadows + RandomizedLight) instead of hard shadow maps.

Custom shaders

Write GLSL with three-custom-shader-material to extend standard materials (fracture lines, glitch, glow pulses) without losing PBR lighting.
Noise-driven effects (simplex/curl noise) for drifting particles, Ano's inner glow and the ANOMALY glitch.
A cursor-reactive fluid or ripple background pass for the landing page (a simple stable-fluids or ping-pong render-target simulation).

Particles

GPU particles: InstancedMesh for thousands of objects, and GPGPU (Three.js GPUComputationRenderer) for 50k+ particles that flow, swirl around the cursor and assemble into shapes (the ANOMALY logo, Ano forming, belief nodes shattering).
drei Sparkles and Trail for small accents (current sparks, robot trails).

Post-processing

Bloom (selective, on emissive parts only), chromatic aberration at the edges, film grain, vignette.
Screen-space ambient occlusion (N8AO) for depth, and depth of field during cinematic camera moments.
Tone mapping set deliberately (ACES or AgX) so colours stay rich, not washed out.

Camera and choreography

Scroll-driven camera rails (GSAP ScrollTrigger + Lenis), with damped lerp for weight.
@theatre/core + @theatre/r3f to choreograph cinematic sequences (preloader → hero, Break chapter shatter) with keyframes instead of hand-tuned numbers.
Seamless scene transitions (Active Theory style): never a hard page load between landing, lab select and labs.

Interaction

Rapier physics for collisions, grab-and-toss (@use-gesture/react for drag velocity), and the kinematic cursor body.
three-mesh-bvh for fast, accurate raycasting on hover and click.

Performance guards (always on)

drei PerformanceMonitor + AdaptiveDpr to drop quality automatically when FPS falls.
Instances / Merged for repeated objects, compressed textures (KTX2) and Draco/Meshopt-compressed models if any are used.
r3f-perf in dev to watch draw calls and frame time.

Optional stretch: Three.js's WebGPU renderer and TSL node materials are powerful but newer; only try them on a branch after everything works with WebGL.

Original 3D assets only. Build objects from primitives and shaders in code, or make them in Blender. If using free assets (Poly Haven HDRIs and textures, CC0 models), check the licence and credit them in the README.

3.5 Inside the labs (the HUD, Heron-style minimal UI)
Top bar: one thin glass strip with the mission goal, current step, and confidence setting.
Centre: the experiment, always the visual focus.
Right panel: inspector showing the selected part's live values.
Bottom: time scrubber (pause, slow motion, rewind) and the Run button.
Ano: floats near the experiment and flies to whichever part it is talking about.
Signature moments only: ghost vs reality, ANOMALY DETECTED glitch (RGB split, scanline flash, then calm), glowing current particles, sparks and smoke on burnouts, gold burst on correct.
4. Tech stack and libraries

See RESOURCES.md for the full researched list: every library with its checked version and licence, open-source repos to learn from (R3F examples, Next.js + WebGL starters, physics and shader demos, science simulations, robotics tools), and the licence rules for reusing code. Follow those licence rules strictly.

Use Next.js App Router with TypeScript. Install with npm. Pin versions in package.json once installed and check each library's official docs for current APIs before using them.

Core
Library	Purpose
next, react, react-dom, typescript	App framework
tailwindcss	Styling, driven by the tokens above
zustand	App state (current experiment, prediction, verdict, Ano state)
zod	Validate experiment, misconception and hint JSON files at load time
idb	Small wrapper around IndexedDB for saving progress
clsx, tailwind-merge	Class name helpers
lucide-react	Icons
3D, physics and motion (landing page and Ano)
Library	Purpose
three	WebGL engine
@react-three/fiber	Three.js in React
@react-three/drei	Helpers: MeshTransmissionMaterial, Text3D, Environment, ContactShadows, Float
@react-three/postprocessing, postprocessing	Bloom, chromatic aberration, noise
@react-three/rapier	Physics: collisions, impulses, the kinematic cursor body
gsap, @gsap/react	Timelines and ScrollTrigger
lenis	Smooth, weighted scrolling
motion	UI animation in React (Framer Motion's current package)
maath	Easing and damping helpers for R3F
three-custom-shader-material	Custom GLSL on top of PBR materials (fracture, glitch, glow)
three-stdlib	Extra Three.js utilities and loaders
three-mesh-bvh	Fast raycasting for hover, click and cursor interaction
@theatre/core, @theatre/r3f (+ @theatre/studio in dev)	Keyframed cinematic camera and scene choreography
@use-gesture/react	Drag, toss and gesture velocity for grabbing objects
Labs
Library	Purpose
pixi.js, @pixi/react	Fast 2D rendering for particles, current flow, robot trails
mathjs	Linear solver (lusolve) for the circuit solver
blockly	Drag-and-drop programming for the robot's brain
@xyflow/react	Misconception map (React Flow)
howler	Sound effects
Ask Ano (server only)
Library	Purpose
ai	Vercel AI SDK: one API for multiple providers
@ai-sdk/groq	Groq provider (first choice: fast)
@ai-sdk/google	Gemini provider (backup)
Dev tools
Library	Purpose
leva	Live tweaking panel for shader and physics values (dev only)
r3f-perf	FPS and draw-call monitor for the 3D scene (dev only)
vitest	Unit tests, especially for the circuit solver and diagnosis engine

Fonts: load Clash Grotesk and General Sans from Fontshare (or self-host the files in public/fonts), JetBrains Mono via next/font/google.

5. Project structure
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
6. The engine
6.1 The loop (every experiment)
Ano introduces the experiment and its goal.
The student places the few parts needed (snap to outlines).
The student makes a prediction (pick an answer, drag a slider, or draw a path).
Run. The simulator computes the real result.
Compare prediction to result:
Match → verdict correct. Ano celebrates (gold). Show Next experiment and See the theory. Done.
No match → verdict wrong. Run diagnose(). Play ANOMALY DETECTED. Show the ghost beside reality. Ano gives hint 1. Optionally show the conflict edit from conflict(). The student fixes and re-runs.
Finishing every experiment in a level passes it and unlocks the next.
6.2 Wrong-model diagnosis

Each misconception is a wrong-model simulator: the same lab physics, but following the student's mistaken rule.

ts
interface Misconception {
  id: string;                 // "current-used-up"
  lab: "chemistry" | "robotics";
  title: string;              // "Current gets used up"
  simulate: (build: Build) => Outcome;   // wrong-model result
  hints: [string, string, string];       // nudge, principle, fix
  conceptIds: string[];       // links into the misconception map
}

diagnose(build, prediction):

Run the build through every wrong model for that lab.
Any wrong model whose output matches the prediction (within tolerance) is a candidate.
Add evidence to that misconception across runs; only label it "likely" after 2+ matching runs.

conflict(build, misconception): try a small set of allowed edits (add a bulb, seal the container, flip a part, change one wheel speed), run each through the real model and the wrong model, return the edit with the biggest difference. Keep the list of allowed edits per experiment in its JSON.

6.3 Circuit solver (Robotics Lab)
Modified Nodal Analysis: build conductance matrix G and source vector, solve G·v = i with mathjs.lusolve.
Parts: battery (voltage source with small internal resistance), wire, switch, button, resistor, bulb (resistor; brightness from power P = I²R), LED, motor (resistor + animation), buzzer.
LED model: conducts only forward, only above ~2 V; above its current limit it burns out (pop, smoke, permanently dark until replaced).
Short circuit: detect near-zero resistance across a source; don't crash, show sparks and a blown fuse.
Open circuit / singular matrix: detect and treat as "no current," never throw.
Re-solve only when the build changes.
Write vitest tests for: series bulbs, parallel bulbs, backwards LED, LED without resistor, short circuit, open switch.
6.4 Robots
Differential drive: v = (vL + vR) / 2, ω = (vR − vL) / L. Integrate position each frame.
Sensors read the arena canvas (brightness under a line sensor, distance by raycast).
Blockly blocks: when run, forever, if sensor < value, set motor left/right, wait. A small interpreter steps the program each frame.
Prediction mode: student draws the expected path; show it as a ghost trail beside the real trail.
6.5 Chemistry
Show two levels at once: the beaker the student sees and the particles inside (zoom in to see molecules).
Experiments: conservation of mass (sealed vs open container on a scale), particles and heat (particles speed up, they don't grow), dissolving, reaction speed (temperature / concentration).
Mass is always conserved in a sealed system; an open system loses gas particles visibly.
Include short real-lab safety notes where relevant.
6.6 Experiment JSON (example)
json
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
7. Ano
7.1 States and reactions
State	Line (pick a variant from ano-lines.json)	Look
greet	"Hey, I'm Ano. Want to break some science?"	Assembles from particles, eye opens
building	"Nice. What do you think will happen?"	Leans in, eye follows cursor
correct	"Nailed it! That's exactly how a scientist thinks."	Spins, gold glow, particle burst
wrong	"Whoa, did you see that? Let's figure out why."	Red glitch, then curious lilac
stuck	"Want a hint? Just a small one."	Flies to the part that matters
levelUp	"Level complete! Ready for the next one?"	Celebration, flies to the next star

Lines are short (one or two sentences), specific, varied, and never mock a wrong answer.

7.2 Who produces what
Moment	Source	API call?
Verdict	Simulator, spoken by Ano	No
Explanation + 3 hints	content/hints/*.json	No
Congratulations, level-up	content/ano-lines.json	No
Ask Ano (student's own question)	AI via /api/ask-ano	Yes, capped
7.3 Ask Ano rules (app/api/ask-ano/route.ts)
Try Groq first, fall back to Gemini, fall back to the next written hint.
Cap: 5 questions per session; show "3 left" on the button.
Cache by (experimentId, faultCode, normalised question).
Prompt contains only: experiment title, fault code, the simulator's numbers, the verdict, and the question.
System instructions: speak as Ano (friendly lab partner for a teenager), explain in under 60 words, use only the facts provided, never contradict the verdict, stay on STEM, gently redirect anything else.
Use each provider's safety settings. Don't log or store the question.
8. Build order

Work in this order. Don't start polish before the core loop works end to end.

Foundation: Next.js + Tailwind + tokens + fonts. Zustand store. Types in engine/types.ts.
One full loop: one robotics experiment (light the LED) with builder, prediction, solver, verdict, ghost, ANOMALY flash, hint ladder, Next experiment / See the theory.
Circuit solver complete with tests.
Chemistry: conservation of mass experiment end to end.
Ano 2D first (simple glowing orb in the HUD with lines), then Ano 3D.
Remaining experiments: 5 levels per lab (see content/experiments).
Robot arena with Blockly.
Misconception map with shatter animation.
Landing page: scene → objects → physics + cursor → post-processing → lens cursor → camera rail → kinetic title → hero experiment → sound → preloader.
Lab select 3D fly-in transition.
Ask Ano API route with caps, cache and fallback.
Polish: micro-interactions, sounds, quality modes, reduced motion, mobile layout.

After each step: run it, take a screenshot if possible, compare against this file, and fix what looks off before moving on.

9. Quality, performance and accessibility
Performance budget (hard limits)
Steady 60 fps on the production build (npm run build && npm start). Never judge speed in dev mode.
At most ONE MeshTransmissionMaterial on screen (the lens cursor), at low resolution and samples. Fake all other glass with MeshPhysicalMaterial + environment map.
dpr capped at [1, 1.5], with drei PerformanceMonitor + AdaptiveDpr.
Under 150 draw calls on the landing page; use Instances / Merged for repeats.
Post-processing: one EffectComposer, multisampling off; bloom + light chromatic aberration + grain only. No N8AO or depth of field on the landing page.
No React state updates per frame. Mouse, scroll and animation values live in refs or zustand transient updates.
One animation loop: Lenis and GSAP driven from the same ticker as R3F.
1K HDRIs, simple colliders (spheres, boxes), shadows baked once (ContactShadows frames={1}).
Check r3f-perf after every visual change and report FPS and draw calls.
No hydration mismatches

The first render must be identical on server and client. Never read window, storage, IndexedDB, media queries, screen size, Date.now() or Math.random() during render. Read them in useEffect after mount, or load browser-only components with dynamic(..., { ssr: false }). Wait for persisted stores to hydrate before using saved values.

Other quality rules
Cap device pixel ratio at 2. Keep landing physics objects to 20–40.
lib/quality.ts: high / low. Low disables the lens cursor, chromatic aberration and reduces particles. Auto-drop to low if FPS stays under 45.
Respect prefers-reduced-motion: no camera rail flying, no glitch flashes; use fades instead.
Keyboard controls for all lab actions, visible focus rings (signal colour).
Ghost colours must be distinguishable for colourblind users (use shape and opacity, not only colour).
Captions for every sound cue.
Responsive down to tablet for labs; landing page works on mobile with a simplified scene.
10. Commands and conventions
bash
npm run dev      # local dev
npm run build    # production build (must pass before any commit to main)
npm run test     # vitest
npm run lint
TypeScript strict mode. No any in engine/.
engine/ is pure TypeScript with no React imports, so it can be tested in isolation.
Content (experiments, hints, lines, theory) lives in JSON, never hard-coded in components.
Client components that use WebGL are loaded with dynamic(..., { ssr: false }).
Never commit .env.local. Required env vars: GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY.
10.1 Code quality rules (from team code review)

These came from a review of the first build. Follow them for all new code and when touching old code.

Components (TSX)

Small components with one job each. If a file passes ~150 lines or does two things, split it.
Typed props, no any. Logic goes in hooks (hooks/ or the feature's use*.ts), components only render.
Never write the same thing twice. Repeated markup becomes a shared component; repeated logic becomes a hook or a function in lib/.

Files and folders

Organize by feature, not by file type: everything for one feature (component, hook, styles, types, tests) lives in that feature's folder (components/lab/, components/ano/, engine/circuits/ …). Shared pieces go in components/ui/ and lib/.
One clear home for each thing. Before creating a file, check whether one already exists for that purpose.

Fonts

Load fonts once in app/layout.tsx (next/font), expose them as CSS variables, and map them in the Tailwind theme (font-display, font-body, font-mono). Components only use those classes; never declare font-family in a component.

CSS

All colours, spacing, radii and fonts come from the Tailwind theme tokens (section 3.3). No hard-coded hex values in components.
app/globals.css holds only base styles, CSS variables and a few global utilities.
Component variants (button sizes, states) use class-variance-authority + tailwind-merge, not copied class strings.
No inline style for static values, no !important, no one-off overrides.

Buttons and hit areas

The clickable area must match the visible button exactly. Put padding, size and the click handler on the same element.
Hover effects (magnetic pull, scale) move only the inner content, never the hit area, and never shrink it.
Minimum target size 44 × 44 px; if a button looks smaller, make it look that size too rather than adding invisible padding.
3D clickable objects: raycast against the visible mesh or a collider that matches it closely.
Add a dev-only ?debugHit mode that outlines every clickable area so mismatches are easy to spot.

AI and API keys (one service, one job)

One AI module, lib/ai/askAno.ts, used by one route, app/api/ask-ano/route.ts. No other file calls an AI provider.
Provider fallback (Groq → Gemini → written hint) lives only inside that module.
Keys only come from environment variables, validated at startup with @t3-oss/env-nextjs (or zod) before any request is made. Never hard-code a key, never log one, never commit .env.local. If a key was ever committed, rotate it at the provider.
"Accuracy" means grounding, not training: send the simulator's facts, a strict system prompt, 3–5 example Q&A pairs, and a fixed answer length. We do not fine-tune models.
Keep tests/ask-ano.eval.ts: about 20 sample questions with the facts sent and the points a good answer must contain (and must not contradict). Run it with a mock provider in CI and against the real provider before Demo Day, and record the pass rate.

After any refactor: npm run build, npm run test and a manual click-through must all pass before moving on.

11. Definition of done (for Demo Day)
 Landing page loads with the preloader and looks Lusion-level within 3 seconds
 Hero "Which falls faster?" experiment works
 At least 5 robotics and 4 chemistry experiments playable end to end
 Correct → congratulations + Next experiment + See the theory
 Wrong → ANOMALY moment + ghost + diagnosis + hints + fix
 Misconception map updates and shatters broken beliefs
 Ask Ano works with the cap, cache and offline fallback
 60 fps on the demo laptop, low-quality mode works
 No API keys in client code; npm run build passes
 README with GIF, live link, and run instructions