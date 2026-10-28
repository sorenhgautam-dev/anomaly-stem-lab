# DESIGN.md: ANOMALY "Bright Lab" redesign

**Status:** this file is the source of truth for how ANOMALY looks. It **replaces** the dark "Bioluminescent lab" palette and the dark-lab visuals in CLAUDE.md (sections 3.1 visual details, 3.3 colours, 3.6 lab look) wherever they conflict.

**Still in force from CLAUDE.md:** the simulator is the judge, performance budget (section 9), hit-area rules and Tailwind-only styling (10.1), licence rules, privacy rules, Ano's teacher style (7.1b), voice (7.4), the site structure (1.1).

**Reference image:** `design/reference/landing.png`. Open it before designing anything. Match its patterns closely, then push the colour further: the owner wants it **more vibrant** than the reference.

---

## 0. Anti-slop rules (hard bans, owner's list)

Testers still saw "AI slop". These are banned everywhere in the product, its copy and its code. They override anything else in this file.

| Banned | Use instead |
|---|---|
| Lucide icons (and other default icon packs used everywhere: Heroicons, Phosphor) | Our own small SVG icon set in `components/icons/` (section 5.1) |
| Emojis, anywhere (UI, copy, Ano's lines, toasts, logs shown to users) | Words, our icons, or Ano's face expressions |
| "Liquid glass" / glassmorphism (`backdrop-blur`, frosted translucent panels) | Solid **paper cards** (section 5) |
| Em dashes (—) in any user-facing text | Commas, colons, full stops or brackets |
| Inter, Geist, Space Grotesk (and other default "AI site" fonts) | Archivo + Schibsted Grotesk + Martian Mono (section 4) |
| Bento grids (mixed-size tile grids) | Purposeful layouts: one strong focal element per section |
| Fake terminal or code-window rows | Real product UI only |
| "Three features in a row" sections (and 3–4 identical cards in a row) | One interactive demo, a sequence the user steps through, or a single large card that changes |
| "It's not X, it's Y" copy (and "not just X", "more than X") | Plain, direct sentences that say what the thing does |
| Fake demos (decorative mockups with made-up data) | The **real** working product running live, with real simulator data |
| Radial orbs (blurry coloured blobs, glowing circles in the background) | Flat warm paper base with grain; colour comes from solid colour blocks and objects |
| Dot grids and grid-pattern backgrounds | Plain paper texture. (A real breadboard's holes are fine: that's apparatus, not decoration) |
| Sparkles (sparkle icons, twinkle particles, "magic" shimmer) | Effects with a physical cause: sparks from a short circuit, bubbles from a reaction |
| Rainbow colouring (multi-hue gradients, rainbow confetti, iridescent everything) | Gradients only within one hue family (two neighbouring stops at most); confetti in two brand colours |

Also avoid generic copy words: "unlock", "elevate", "seamless", "revolutionize", "supercharge", "next-level", "magic".

---

## 1. Direction in one paragraph

Bright, warm and friendly, like a premium product render. Giant ultra-bold condensed headlines in near-black. A lovable 3D Ano front and centre, waving. Floating paper cards showing **live data from the real experiment running on screen** (prediction vs reality, belief shifts). A warm paper base with vibrant colour carried by **solid colour blocks, saturated objects and tight same-hue gradients** (apricot to flame, volt to deeper blue). Lots of breathing room, soft warm shadows, tactile rounded shapes. It should feel playful enough for a 14-year-old and polished enough for a design award.

---

## 2. Patterns from the reference (reuse these on every page)

| # | Pattern | What it is |
|---|---|---|
| P1 | **Rounded frame** | The hero sits in a large rounded panel (radius 32px) inset 12px from the viewport on desktop, full-bleed on mobile |
| P2 | **Header** | Logo mark (black circle with a white bolt icon) + bold wordmark left; text nav links; one black pill CTA right |
| P3 | **Split giant headline** | Two huge uppercase words or phrases on one line ("PREDICT" … "TEST IT."), with Ano standing in the gap and overlapping the type |
| P4 | **Stage card** | A soft cream rounded card behind Ano that frames the hero object |
| P5 | **Floating data cards** | Solid paper cards that hover around the hero at different depths, fed by the real running experiment: a **Result card** (title, confidence chip, prediction row, reality row with status dot) and a **Belief shift card** (small caps eyebrow, bold title, one line of detail, status dot, corner arrow button) |
| P6 | **Lower band** | Left: bold sentence heading + short body. Centre: a "How it works" chip card with an icon tile. Right: small caps meta text. Bottom row: round arrow buttons + dot pagination on the left, an "Explore …" line on the right |
| P7 | **Gradient ribbon** | A wavy gradient band along the bottom edge of the frame, gently animating |

---

## 3. Colour system: vibrant on a warm light base

Define every ramp and gradient in the Tailwind theme (`@theme` in `app/globals.css`). Components only use Tailwind classes.

### Ramps
| Ramp | Shades | Role |
|---|---|---|
| `cream` | 50 `#FFFBF6` · 100 `#FEF4E8` · 200 `#FBE7D2` · 300 `#F6D3B0` | Page and stage backgrounds |
| `ink` | 900 `#121212` · 700 `#3A3631` · 500 `#6E665D` · 300 `#A79E93` | Headlines, text, primary buttons, muted text |
| `apricot` (brand) | 100 `#FFEBD6` · 200 `#FFD9B3` · 300 `#FFBE85` · 400 `#FF9E4F` · 500 `#FF7A1F` · 600 `#F05D00` · 700 `#C24A00` | Ano's accents, brand gradients, chemistry |
| `flame` (pink-coral) | 200 `#FFC9D4` · 300 `#FF9DB0` · 400 `#FF6B8B` · 500 `#FF3D6E` | Small highlights only (never mixed into apricot gradients) |
| `volt` (electric blue) | 100 `#E4EAFF` · 300 `#9DB4FF` · 400 `#6B8CFF` · 500 `#3D63FF` · 600 `#2A47E0` | Robotics, links, cool contrast |
| `grape` (violet) | 300 `#C3B1FF` · 400 `#9B7BFF` · 500 `#7A52FF` | Gradient partner to volt, Advanced level |
| `verify` (green) | 100 `#DDF8EA` · 500 `#16B364` · 700 `#0B7A44` | Correct predictions only |
| `anomaly` (red) | 100 `#FFE3E0` · 500 `#F2392C` · 700 `#B4231A` | Wrong predictions and ANOMALY only |

### Colour blocks and gradients (no orbs, no rainbow)
| Name | Recipe | Where |
|---|---|---|
| **Paper** | flat `cream-100` with a subtle paper-grain texture; a very soft top-to-bottom linear shift to `cream-50` | Default page background |
| **Colour blocks** | full-width sections in a solid `apricot-400`, `volt-500` or `ink-900` with large type on top | Rhythm between landing sections, lab headers |
| **Ribbon** | 90° `apricot-300 → apricot-500` (one hue family) | Bottom wave band (P7), progress bars |
| **Chem** | `apricot-400 → apricot-600` | Chemistry cards, lighting tint, chips |
| **Robo** | `volt-400 → volt-600` | Robotics cards, lighting tint, chips |
| **Levels** | Easy `verify` shades, Medium `apricot` shades, Advanced `grape` shades (each its own hue only) | Level dial and badges |
| **Win** | `verify-500 → verify-700` | Success moment |
| **Glitch** | `anomaly-500 → anomaly-700` | ANOMALY moment |

Gradients never mix more than one hue family. No radial blobs, no conic gradients, no iridescent rainbow materials.

### Usage rules
- About 65% paper and white, 20% ink, 15% vibrant colour. Vibrancy lives in **solid colour blocks, Ano's accents, chips, saturated 3D objects and VFX**, so it pops without hurting readability.
- Headlines stay solid `ink-900` (boldness comes from contrast). Use gradient text only for special moments: the success word, the ANOMALY word, level-complete.
- `verify` and `anomaly` are reserved for verdicts. Never rely on colour alone (also icon, shape and sound).
- All text passes WCAG AA. Put text on the light ends of gradients or on white cards, never on mid-tone saturated colour.
- Shadows are **warm-tinted**, never grey: e.g. `0 24px 48px -20px rgba(140,70,20,0.28), 0 2px 6px rgba(0,0,0,0.04)`.

---

## 4. Typography

| Role | Font | Settings |
|---|---|---|
| **Display** (giant headlines) | **Archivo Variable** (OFL-1.1; axes `wght` 100–900 and `wdth`) | weight 900, width condensed (~62–75), UPPERCASE, letter-spacing −0.03em, line-height 0.85, size `clamp(4rem, 13vw, 11rem)` for the hero |
| **Headings** (H2–H4, card titles) | Archivo Variable | weight 700–800, normal width, sentence case, letter-spacing −0.01em |
| **Body and UI** | **Schibsted Grotesk Variable** (OFL-1.1) | 400/500, 15–18 px, line-height 1.5 |
| **Small caps meta** (only on Belief shift cards and the hero meta line) | Schibsted Grotesk | 600, 11–12 px, uppercase, letter-spacing 0.14em, `ink-500` |
| **Readouts** (instruments, numbers) | Martian Mono Variable (OFL-1.1) | 500, tabular numbers |

Self-host via `next/font` or Fontsource (`@fontsource-variable/archivo`, `@fontsource-variable/schibsted-grotesk`, `@fontsource-variable/martian-mono`), loaded once in `app/layout.tsx` and mapped to `font-display`, `font-sans`, `font-mono`.

**Bold alternatives** (all OFL-1.1, checked): Anton, Big Shoulders Display, Bricolage Grotesque. In the `/design-system` page, render the hero headline in Archivo plus up to two alternatives, pick the one closest to the reference, and save comparison screenshots so the owner can switch later.

For the 3D title (if any), convert only fonts whose licence allows it (OFL does), and keep the converted file in `public/fonts/`.

---

## 5. Components

| Component | Spec |
|---|---|
| **Primary button** | Black pill (`ink-900`), white text Schibsted Grotesk 600, height 44–48 px, padding x 20–24 px. Hover: background shifts from `ink-900` to `ink-700` and the button lifts 2 px. Press: scale 0.97 |
| **Secondary button** | White pill, 1px `ink-900/10` border, ink text |
| **Icon button** | 48 px white circle, warm shadow, icon from our own set (section 5.1), 20 px. Hover lift 2 px |
| **Chip** | Height 24, radius full, 12 px 600. Confidence: High `apricot-100`/`apricot-700`, Medium `volt-100`/`volt-600`, Low `cream-200`/`ink-700`. Status: dot + text in `verify` or `anomaly` |
| **Paper card** | Solid `white` or `cream-50` (no transparency, no blur), 1.5 px `ink-900/10` border, radius 14–18 px (vary by size), padding 16–20 px, subtle paper grain, crisp warm shadow `0 1px 0 rgba(0,0,0,.04), 0 14px 28px -18px rgba(90,45,10,.35)`. Gentle idle float (±6 px, each card on its own phase) |
| **Result card** | Title + confidence chip on row 1; label/value rows "Prediction" and "Reality"; status dot (Verified / Anomaly) |
| **Belief shift card** | Eyebrow "BELIEF SHIFT", bold 2-line title, one line of detail, status dot + label, corner arrow icon button |
| **Info chip card** ("How it works") | Paper card with 36 px icon tile (radius 10, Chem gradient at 20%), title 600, subtitle 13 px `ink-500` |
| **Carousel controls** | Round icon buttons with arrows; dots: active = 18 px ink pill, inactive = 6 px `ink-300` dots |
| **Prediction choices** | Large white option cards; selected = 2 px gradient ring (Chem or Robo by lab) and a check |
| **Sliders and toggles** | Gradient track, white thumb with shadow; toggles are pills |
| **Breadcrumb bar** | Paper pill: Level · Lab · Experiment, each clickable |
| **Ano speech bubble** | White card with a small tail toward Ano, Schibsted Grotesk 15–16 px, a Listen button (speaker icon) and captions |
| **Theory sheet** | Radix Dialog: right-side sheet on desktop, bottom sheet on mobile; white; sections What happened / Why / The formula / In real life; animated diagram |
| **Toast** | Small paper card bottom-centre |

All clickable areas match their visible shape exactly (CLAUDE.md 10.1).

---

### 5.1 Our icon set

About 20 custom SVG icons in `components/icons/`, drawn for ANOMALY on a 24 px grid: **solid geometric shapes with one rounded notch cut out**, filled in `ink-900` with an optional `apricot-500` second tone. Needed: arrow left/right, arrow up-right, play, pause, rewind, step, speaker on/off, close, check, cross, flask, bolt (logo), robot, map, theory/book, hint, settings, restart, zoom. No outline-only icon sets.

## 6. Ano: the hero character (build in code, inspired by the reference)

Build Ano from primitives in React Three Fiber, inspired by the reference robot. Don't trace or import the reference image as a model.

- **Head:** slightly squashed sphere, glossy white (MeshPhysicalMaterial, clearcoat high, roughness low).
- **Visor:** dark glossy front panel (`#111`) with an **animated face** drawn on a CanvasTexture or shader: glowing `apricot-400` eyes and mouth.
- **Ears:** orange (`apricot-500`) rounded cylinders like headphones; small **antenna** with a ball tip.
- **Body:** rounded egg/capsule, glossy white, with an orange belt ring; floats (no legs).
- **Arms:** segmented white capsules with orange ball joints; simple mitten hands with rounded fingers.

**Expressions (visor face):** happy (^ ^ + smile), curious (o o + small mouth), thinking (eyes up + flat mouth), surprised (O O + round mouth) for ANOMALY, celebrating (star eyes + big smile), listening/speaking (animated sound bars).

**Animations:** idle float and blink, head follows the cursor (±20°), wave on greet, nod on correct, surprised hop on ANOMALY, spin on level complete, talk bars when speaking. All springy, never linear.

Ano appears: hero (large, waving), selection pages (peeking from a card edge), labs (bottom-left with speech bubble), success and ANOMALY moments.

---

## 7. Pages

### 7.1 Landing `/`
**Hero (P1–P7)** is a carousel of 3 featured anomalies. Auto-advance every 7 s, pause on hover, arrows and dots work, swipe on mobile. On each slide the headline words roll vertically into place, the floating cards swap data, and Ano changes pose.

| Slide | Headline | Result card | Belief shift card |
|---|---|---|---|
| 1 | PREDICT · TEST IT. | Gravity in vacuum · High conf. · Prediction: Equal speed · Reality: Verified | Why heavier objects fall together · "Ano spotted the air resistance bias" |
| 2 | GUESS · BREAK IT. | Backwards LED · Med conf. · Prediction: Lights up · Reality: Anomaly | LEDs only work one way · "Current can only flow forward" |
| 3 | THINK · PROVE IT. | Sealed bag · High conf. · Prediction: Gets lighter · Reality: Anomaly | Mass doesn't vanish · "Gas can't escape a sealed bag" |

Lower band (P6): "Learn why your intuition tripped." + "Guess what will happen. Run it. Ano shows you exactly where your thinking broke." · How it works chip · meta "INTERACTIVE INTUITION LAB / POWERED BY ANO" · carousel controls · "Explore {real number} experiments in chemistry and robotics". **Use the real experiment count from `content/`. Never invent numbers.** Each slide's cards show **real values from the experiment actually running** in the hero (simulator output, not hard-coded text). The Result card on slide 1 has a "Try it" action that opens the "Which falls faster?" hero experiment.

**Below the hero (scroll):**
1. **How it works, as one live sequence:** a single pinned scroll scene where the real LED experiment plays through Predict, Diagnose, Break and Rebuild as the user scrolls, with one caption changing at a time. Not a row of cards.
2. **Two labs:** a full-width `ink-900` colour block with two large cards side by side, Chemistry (Chem gradient) and Robotics (Robo gradient), each with a small 3D object and the experiment count. Hover tilts toward the cursor.
3. **Meet Ano:** Ano with a row of expression buttons the visitor can click, and the voice toggle.
4. **Belief deck:** a stack of real Belief shift cards the visitor can flick through one at a time (drag or arrows).
5. **Level dial:** one large interactive dial or slider from grade 6 to 12; one card updates to show the matching level and its experiments.
6. **Final CTA:** giant split headline "YOUR · TURN." with Ano and the Start experimenting button.
7. **Footer:** logo, nav, credits link.

### 7.2 Level select `/start`
Rounded frame, Paper background. Headline "PICK · YOUR LEVEL." A large **grade dial** (6 to 12) the student drags; one big level card beside it changes colour family, title, grade range, real experiment count and description as the dial moves. Ano reacts to the chosen level. Optional "Not sure? Let Ano place you" link.

### 7.3 Lab select `/start/[level]`
Headline "CHOOSE · YOUR LAB." Two large cards side by side: Chemistry (Chem gradient, 3D flask of glossy coloured liquid) and Robotics (Robo gradient, a mini Ano-style robot). Click: the card expands and the camera flies in (transition section 9).

### 7.4 Experiment map `/labs/[lab]/[level]`
A soft gradient canvas (Chem or Robo tint) with a curving path of nodes. Each node is a small paper card: title, time (2–5 min), status chip (done = verify, current = pulsing apricot, locked = cream). Ano sits next to the current node. Breadcrumb bar at top.

### 7.5 Experiment `/labs/[lab]/[level]/[id]`
A **cool-toned 3D laboratory** with its own colour world (section 8), so it never blends into the warm site, with the experiment on the bench in the centre. Overlaid paper UI:
- Top: breadcrumb bar + mission card (goal in one sentence).
- Right: inspector paper card with live values (Martian Mono).
- Bottom centre: prediction choices, then the time scrubber and the black **Run** pill.
- Bottom left: Ano with speech bubble.
- After Run: a Result card (P5 style) slides in showing Prediction vs Reality.

**Success moment:** verify-green check, giant condensed word ("NAILED IT." and variations) with Win gradient, confetti in two colours (`verify-500` and `apricot-400`), Ano nods and celebrates, progress ribbon fills, then Next experiment (black pill) and See the theory (white pill).
**ANOMALY moment:** giant "ANOMALY." in Glitch gradient with a short glitch, Ano surprised, ghost prediction vs reality, hint 1 in the speech bubble.

**All experiments are 3D.** Students must be able to see everything properly: beakers, flasks, liquids, particles, wires, batteries, LEDs, resistors, motors and robots are real 3D objects they can orbit (drag to rotate, scroll to zoom, double-click to reset view) and click to inspect.
- Build a **shared 3D apparatus kit** once (`components/lab3d/kit/`): beaker, flask, test tube, sealed bag, burner, scale, thermometer, multimeter, battery, wire (smooth tube along a curve, current shown as moving particles), LED, bulb, resistor (with colour bands), switch, button, motor, buzzer, breadboard grid, robot chassis and wheels. Every experiment is assembled from this kit.
- Liquids: coloured translucent volumes with a gently moving surface; reactions show bubbles, colour changes and particles. A "zoom to particles" toggle shows molecules inside.
- Circuits: wires snap between part terminals in 3D; current particle speed matches the simulator's real current.
- Readouts float above instruments as small paper labels (Martian Mono).
- Order: **Light the LED** and **Mass in a sealed bag** first and most polished, then every other experiment, reusing the kit.

### 7.6 My beliefs `/beliefs`
Headline "YOUR · BELIEFS." A single-column list of Belief shift cards, grouped by status: broken (verify), challenged (apricot), not yet tested (cream). Filter chips by lab and level. Each card opens the experiment that broke it.

### 7.7 Theory view
Theory sheet component (section 5) opened from the success moment or the experiment map.

### 7.8 Loading and 404
Loading: Ano assembling with a percentage. 404: "LOST · IN SPACE." with Ano shrugging and a button home.

---

## 8. 3D, lighting and VFX for a light theme

- **Lab colour worlds (cool, and different from the warm site).** Testers said the lab "vanished" into the cream site. Each lab is a strong, cool, single-hue space so stepping in feels like entering a different place:

| Lab | Walls and floor | Bench | Accents and light | Feel |
|---|---|---|---|---|
| **Chemistry** (owner's palette: `#097770`, `#E0CDBE`, `#EDCA82`, `#A9C0A6`) | teal `#097770`, deepening to `#065A55` at the floor | warm beige `#E0CDBE`, satin | sand gold `#EDCA82` for heat, burners, highlights and active states; sage `#A9C0A6` for shelves, secondary surfaces and soft liquid tints | calm, natural, glassware glows against the teal |
| **Robotics** (owner's palette: black, white, gold and teal accents) | near-black graphite `#0F1012` → `#1A1B1F` | clean white `#F4F4F2`, matte, with black trim | gold `#D4A537` for highlights, warning lights and active parts; teal `#1FA7A0` for current flow and sensor beams | sleek, technical, premium |

Rules: stick to each lab's own palette (no extra colours, no rainbow gradients), no orbs or grid backgrounds on walls, apparatus stays light so it pops against the cool walls, and UI paper cards stay warm cream so they read clearly on top. Text never sits directly on the dark walls without a card behind it.
- **Lighting:** soft key light (slightly warm), strong rim light so apparatus edges separate from the dark walls, a soft fill from the front. Tone mapping AgX or ACES, exposure tuned so whites stay clean.
- **Lab set:** a seamless curved backdrop (floor curving into wall) in the lab's colour, a solid rounded bench, wall-mounted shelves with real apparatus silhouettes, a fume-hood frame (Chemistry) or a pegboard and tool rack (Robotics), all modelled to the standard in section 8.2.
- **Shadows:** soft and baked (`AccumulativeShadows` or `ContactShadows` rendered once). No real-time shadow maps.
- **Materials:** glossy white plastic, matte orange, coloured translucent liquids. Real transmission on at most one object (performance budget); fake the rest.
- **VFX on light backgrounds:** additive blending disappears on cream, so use normal alpha blending with saturated colours. Sparks get a thin dark core; smoke is soft lilac-grey; shockwave rings use gradient strokes; confetti uses two colours only.
- Performance budget from CLAUDE.md section 9 still applies.

---

## 8.2 Model quality standard (testers said the models look bad)

Models built from plain spheres and boxes look lumpy and cheap. Every 3D object must meet this standard:

1. **Match real proportions.** Look at real lab equipment references (photos, real dimensions) before modelling. A beaker has a pouring spout, a thick rim and measurement marks; an LED has a domed lens, a flat edge and two legs of different lengths.
2. **Model properly in code:**
   - Glassware (beakers, flasks, test tubes) with `LatheGeometry` from a carefully drawn profile curve: real wall thickness, rounded rims, spouts.
   - Hard parts (batteries, scale, multimeter, chassis) with rounded, bevelled boxes (`RoundedBox` or extruded shapes with bevels), never sharp default cubes.
   - Wires with `TubeGeometry` along smooth curves: coloured insulation plus visible copper ends.
   - Small details: resistor colour bands, battery labels and terminals, LED legs, screen bezels, screws. Use canvas textures for printed labels.
3. **Materials make it premium:** physically based materials with varied roughness, clearcoat on plastics, metalness on terminals, believable glass (fake transmission except for one object), subtle surface imperfections. Bake ambient occlusion so parts sit in the scene.
4. **One consistent style** across every model: clean, rounded "premium product render", like high-end toys or Apple product shots. No mixing of styles.
5. **Use better assets when code isn't enough:** high-quality CC0 models (Poly Haven) or models made in Blender, compressed with glTF Transform. Check and credit licences.
6. **Ano** follows the same standard: smooth surfaces, clean seams between parts, clear visor reflections.

The gauntlet Critic must judge every model at close range in screenshots: if a model looks lumpy, toy-cheap or out of proportion, it fails.

## 8.1 Everything in 3D: the whole lab and the whole process

The lab isn't a 2D page with a 3D picture. The **entire experiment process happens in one continuous 3D space**, with the camera guiding the student through it:

1. **Arrive:** the camera glides into the lab and settles on the bench. Ano floats in and waves.
2. **Build:** parts fly from a 3D tray on the bench and snap into place with a spring and a soft click; glowing outlines show where they go. Students can orbit, zoom and click any part to inspect it (a paper label shows its name and live values).
3. **Predict:** the camera moves closer. The prediction choices appear as paper cards floating in 3D next to the apparatus. The chosen prediction appears as a translucent **ghost** of the expected result (a ghost-glowing LED, a ghost scale reading).
4. **Run:** a short cinematic camera move to the best viewing angle. The experiment plays in real time with the time scrubber (slow motion, pause, rewind).
5. **Reveal:** the camera pulls back to show the ghost and reality side by side.
   - **Correct:** a verify-green shockwave ring ripples across the bench, two-colour confetti bursts in 3D, Ano celebrates, the giant "NAILED IT." word assembles in 3D space.
   - **ANOMALY:** the scene briefly freezes with a glitch distortion, the giant "ANOMALY." word slams in, Ano hops in surprise and floats to the part that matters.
6. **Zoom to particles:** one button dives the camera inside the beaker or wire to see molecules moving or electrons flowing, then back out.
7. **Theory:** the theory sheet opens beside a 3D diagram that animates the idea (particles, current paths, forces as arrows).

**Visualization tools:** live 3D graphs floating above the bench (temperature, mass, current over time), force and current shown as animated arrows, heat as colour shimmer, gas as particles bouncing inside containers.

**VFX list:** sparks and arcs, smoke and steam, bubbling and fizzing, pouring liquid, colour-change swirls in liquids, heat shimmer, glowing current particles along wires, LED bloom, burnout pop and smoke, shockwave rings, 3D confetti, dissolve and glitch transitions, soft dust in light beams (no sparkles). Use `three.quarks` for particles, `three-custom-shader-material` for liquids, glitch and shimmer, `@react-three/postprocessing` for bloom (selective), and `@theatre/core` for the cinematic camera moves.

**Performance still rules:** pool particles, bake shadows, keep within the CLAUDE.md section 9 budget, and reduce effects in low-quality mode. If something can't hit 60 fps, simplify it rather than ship lag.

## 9. Motion and transitions

- Easing: springs or `cubic-bezier(0.22, 1, 0.36, 1)`. Durations: UI 150–300 ms, page transitions 600–900 ms.
- Hero headline: words roll up from a mask on slide change; letters settle with a slight overshoot. Use this only on headlines, not on every element.
- Cards: idle float, parallax with the mouse (cards at different depths move different amounts).
- **Page transitions:** shared-element morphs where possible (a level card expands into the next page's background; a lab card expands into the lab; a map node expands into the experiment). Fallback: solid colour wipe. Back plays in reverse. Reduced motion: quick fade.
- The Ribbon (P7) waves slowly. Backgrounds stay still.

---

## 9.1 Lusion-style animations for everything

Every element should feel alive and physical. Nothing appears, moves or disappears without motion.

- **Cursor:** a soft custom cursor that grows over interactive elements and leaves a tiny trail; magnetic pull on buttons (inner content only, hit area unchanged).
- **3D shapes and objects:** idle drift and slow rotation; push away from the cursor with spring physics; lean toward the cursor when nearby; specular highlights sweep as the mouse moves.
- **Headlines:** words roll in from masks, letters settle with a small overshoot, and react slightly to scroll speed (subtle skew).
- **Cards:** float at different depths with mouse parallax; tilt toward the cursor on hover; lift with a deeper shadow; press down on click.
- **Buttons:** sheen sweep on hover, squash on press, ripple on release.
- **Scroll:** smooth weighted scroll (Lenis); sections pin and play short scroll-driven scenes; elements scale and fade in with depth, each at its own speed.
- **Numbers and readouts:** count up and down smoothly; graphs draw themselves.
- **Ano:** never fully still: breathing float, blinks, head follows the cursor, reacts to every click near it.
- **Page transitions:** shared-element morphs and camera fly-throughs (section 9).
- **Sound sync:** small sounds land exactly on animation beats.

Use springs (`@react-spring/three`, `motion`) for anything physical and GSAP timelines or Theatre.js for choreographed sequences. Never linear easing.

## 9.2 Smooth on low-end devices

Smoothness matters more than effects. Target 60 fps on mid-range laptops and **at least a steady 30 fps on low-end devices**, with no stutter.

- **Quality tiers:** detect the device at start with `detect-gpu` (MIT) plus `PerformanceMonitor`, and pick **High / Medium / Low**. Keep adjusting live: drop a tier if frames fall, raise it if there's headroom.
  - **High:** all effects, dpr up to 1.5.
  - **Medium:** dpr 1, fewer particles, no chromatic aberration, simpler glass.
  - **Low:** dpr 0.75–1, no post-processing except light bloom or none, particles reduced by about 70%, baked lighting only, simplified Ano materials, 2D fallbacks for heavy VFX.
- **Animate cheaply:** only `transform` and `opacity` in CSS; 3D motion via refs in `useFrame`, never React state per frame.
- **Render only when needed:** pause the canvas when the tab is hidden or the scene is offscreen; use on-demand rendering on static screens.
- **Load smart:** lazy-load each lab's 3D scene, preload the next one during transitions, compress textures and keep geometry light.
- **Reduced motion:** respect the OS setting with calm fades instead of camera flights.
- **Test on a slow profile:** in Chromium, throttle the CPU (4× or 6× slowdown) during gate G10 and confirm the Low tier stays smooth.

## 10. Responsive

| Width | Behaviour |
|---|---|
| ≥ 1280 | Layout as in the reference; frame inset 12 px |
| 1024 | Headline scales down; floating cards tuck closer to Ano |
| 768 | Lower band stacks into two rows |
| 390 | Full-bleed, headline on two lines ("PREDICT" / "TEST IT."), Ano below the headline, one floating card visible at a time, carousel swipe |

---

## 11. Content truthfulness

- Use real counts and real experiment names from `content/`. No "40+" unless there really are 40+.
- Labs are **Chemistry** and **Robotics**; the hero falling experiment is the one physics teaser.
- "Powered by Ano" is fine; don't claim features that don't exist.

---

## 12. Design rubric (used by the gauntlet, score 1–5 per page)

1. **Pattern match:** uses P1–P7 where relevant and feels like the reference.
2. **Vibrancy:** gradients and accents feel rich and alive, but text stays readable.
3. **Typography:** headlines huge, heavy, tight; clear hierarchy below.
4. **Spacing and alignment:** consistent spacing scale, nothing cramped or cut off.
5. **Polish:** warm shadows, consistent radii, smooth motion, hover and press feedback.
6. **Consistency:** looks like the same product as every other page.
7. **Clarity:** in labs, the experiment is the obvious focus.
8. **No slop:** none of the section 0 bans appear anywhere on the page or in its copy.

Every page must score at least 4 on every point.