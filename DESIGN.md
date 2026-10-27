# DESIGN.md — ANOMALY "Bright Lab" redesign

**Status:** this file is the source of truth for how ANOMALY looks. It **replaces** the dark "Bioluminescent lab" palette and the dark-lab visuals in CLAUDE.md (sections 3.1 visual details, 3.3 colours, 3.6 lab look) wherever they conflict.

**Still in force from CLAUDE.md:** the simulator is the judge, performance budget (section 9), hit-area rules and Tailwind-only styling (10.1), licence rules, privacy rules, Ano's teacher style (7.1b), voice (7.4), the site structure (1.1).

**Reference image:** `design/reference/landing.png`. Open it before designing anything. Match its patterns closely, then push the colour further: the owner wants it **more vibrant** than the reference.

---

## 1. Direction in one paragraph

Bright, warm and friendly, like a premium product render. Giant ultra-bold condensed headlines in near-black. A lovable 3D Ano front and centre, waving. Floating white glass cards showing live experiment data (prediction vs reality, belief shifts). A cream base lit by **vibrant sunrise gradients** (apricot, flame pink, electric blue, violet) that move slowly. Lots of breathing room, soft warm shadows, tactile rounded shapes. It should feel playful enough for a 14-year-old and polished enough for a design award.

---

## 2. Patterns from the reference (reuse these on every page)

| # | Pattern | What it is |
|---|---|---|
| P1 | **Rounded frame** | The hero sits in a large rounded panel (radius 32px) inset 12px from the viewport on desktop, full-bleed on mobile |
| P2 | **Header** | Logo mark (black circle with a white bolt icon) + bold wordmark left; text nav links; one black pill CTA right |
| P3 | **Split giant headline** | Two huge uppercase words or phrases on one line ("PREDICT" … "TEST IT."), with Ano standing in the gap and overlapping the type |
| P4 | **Stage card** | A soft cream rounded card behind Ano that frames the hero object |
| P5 | **Floating data cards** | White glass cards that hover around the hero at different depths: a **Result card** (title, confidence chip, prediction row, reality row with status dot) and a **Belief shift card** (small caps eyebrow, bold title, one line of detail, status dot, corner arrow button) |
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
| `flame` (pink-coral) | 200 `#FFC9D4` · 300 `#FF9DB0` · 400 `#FF6B8B` · 500 `#FF3D6E` | Gradient partner to apricot, highlights |
| `volt` (electric blue) | 100 `#E4EAFF` · 300 `#9DB4FF` · 400 `#6B8CFF` · 500 `#3D63FF` · 600 `#2A47E0` | Robotics, links, cool contrast |
| `grape` (violet) | 300 `#C3B1FF` · 400 `#9B7BFF` · 500 `#7A52FF` | Gradient partner to volt, Advanced level |
| `verify` (green) | 100 `#DDF8EA` · 500 `#16B364` · 700 `#0B7A44` | Correct predictions only |
| `anomaly` (red) | 100 `#FFE3E0` · 500 `#F2392C` · 700 `#B4231A` | Wrong predictions and ANOMALY only |

### Signature gradients
| Name | Recipe | Where |
|---|---|---|
| **Sunrise** | cream-50 base, radial `apricot-300` glow bottom-left, radial `flame-300/50` top-right, radial `volt-300/30` far right; slowly drifting (20–30 s loop) | Landing hero and page backgrounds |
| **Ribbon** | 90° `apricot-200 → apricot-500 → flame-400 → apricot-300` | Bottom wave band (P7), progress bars |
| **Chem** | `apricot-400 → flame-500` | Chemistry lab cards, lighting tint, chips |
| **Robo** | `volt-400 → grape-500` | Robotics lab cards, lighting tint, chips |
| **Level Easy / Medium / Advanced** | `verify-500 → volt-400` / `apricot-400 → flame-400` / `grape-500 → volt-600` | Level cards and badges |
| **Sheen** | moving highlight sweep `apricot-300 → flame-300` at 30% opacity | Hover on the black primary button |
| **Win** | `verify-500 → volt-400` | Success moment accents |
| **Glitch** | `anomaly-500 → flame-500` | ANOMALY moment accents |

### Usage rules
- About 70% cream and white, 20% ink, 10% vibrant colour. Vibrancy lives in **gradients, Ano's accents, chips, 3D lighting and VFX**, so it pops without hurting readability.
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
| **Body and UI** | **Geist Variable** (OFL-1.1) | 400/500, 15–18 px, line-height 1.5 |
| **Small caps meta** (eyebrows like "BELIEF SHIFT") | Geist | 600, 11–12 px, uppercase, letter-spacing 0.14em, `ink-500` |
| **Readouts** (instruments, numbers) | Geist Mono Variable (OFL-1.1) | 500, tabular numbers |

Self-host via `next/font` or Fontsource (`@fontsource-variable/archivo`, `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`), loaded once in `app/layout.tsx` and mapped to `font-display`, `font-sans`, `font-mono`.

**Bold alternatives** (all OFL-1.1, checked): Anton, Big Shoulders Display, Bricolage Grotesque. In the `/design-system` page, render the hero headline in Archivo plus up to two alternatives, pick the one closest to the reference, and save comparison screenshots so the owner can switch later.

For the 3D title (if any), convert only fonts whose licence allows it (OFL does), and keep the converted file in `public/fonts/`.

---

## 5. Components

| Component | Spec |
|---|---|
| **Primary button** | Black pill (`ink-900`), white text Geist 600, height 44–48 px, padding x 20–24 px. Hover: Sheen gradient sweep + slight lift. Press: scale 0.97 |
| **Secondary button** | White pill, 1px `ink-900/10` border, ink text |
| **Icon button** | 48 px white circle, warm shadow, Lucide icon 20 px stroke 1.75. Hover lift 2 px |
| **Chip** | Height 24, radius full, 12 px 600. Confidence: High `apricot-100`/`apricot-700`, Medium `volt-100`/`volt-600`, Low `cream-200`/`ink-700`. Status: dot + text in `verify` or `anomaly` |
| **Glass card** | `bg-white/80`, `backdrop-blur-xl`, `border-white/60`, radius 18–20 px, padding 16–20 px, warm shadow. Gentle idle float (±6 px, each card on its own phase) |
| **Result card** | Title + confidence chip on row 1; label/value rows "Prediction" and "Reality"; status dot (Verified / Anomaly) |
| **Belief shift card** | Eyebrow "BELIEF SHIFT", bold 2-line title, one line of detail, status dot + label, corner arrow icon button |
| **Info chip card** ("How it works") | Glass card with 36 px icon tile (radius 10, Chem gradient at 20%), title 600, subtitle 13 px `ink-500` |
| **Carousel controls** | Round icon buttons with arrows; dots: active = 18 px ink pill, inactive = 6 px `ink-300` dots |
| **Prediction choices** | Large white option cards; selected = 2 px gradient ring (Chem or Robo by lab) and a check |
| **Sliders and toggles** | Gradient track, white thumb with shadow; toggles are pills |
| **Breadcrumb bar** | Glass pill: Level · Lab · Experiment, each clickable |
| **Ano speech bubble** | White card with a small tail toward Ano, Geist 15–16 px, a Listen button (speaker icon) and captions |
| **Theory sheet** | Radix Dialog: right-side sheet on desktop, bottom sheet on mobile; white; sections What happened / Why / The formula / In real life; animated diagram |
| **Toast** | Small glass card bottom-centre |

All clickable areas match their visible shape exactly (CLAUDE.md 10.1).

---

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

Lower band (P6): "Learn why your intuition tripped." + "Guess what will happen. Run it. Ano shows you exactly where your thinking broke." · How it works chip · meta "INTERACTIVE INTUITION LAB / POWERED BY ANO" · carousel controls · "Explore {real number} experiments in chemistry and robotics". **Use the real experiment count from `content/`. Never invent numbers.** The Result card on slide 1 has a "Try it" action that opens the "Which falls faster?" hero experiment.

**Below the hero (scroll):**
1. **How it works:** 4 steps (Predict, Diagnose, Break, Rebuild) as glass cards with gradient icon tiles and tiny looping animations.
2. **Two labs:** two big cards, Chemistry (Chem gradient) and Robotics (Robo gradient), each with a small 3D object and the experiment count. Hover tilts toward the cursor.
3. **Meet Ano:** Ano with a row of expression buttons the visitor can click, and the voice toggle.
4. **Belief wall:** a staggered grid of Belief shift cards from real experiments.
5. **Levels strip:** Easy (grades 6–8), Medium (9–10), Advanced (11–12) with level gradients.
6. **Final CTA:** giant split headline "YOUR · TURN." with Ano and the Start experimenting button.
7. **Footer:** logo, nav, credits link.

### 7.2 Level select `/start`
Rounded frame, Sunrise background. Headline "PICK · YOUR LEVEL." Three tall cards (Easy, Medium, Advanced) with level gradient fills, grade badge, experiment count, a one-line description. Ano peeks over the Medium card. Optional "Not sure? Let Ano place you" link.

### 7.3 Lab select `/start/[level]`
Headline "CHOOSE · YOUR LAB." Two large cards side by side: Chemistry (Chem gradient, 3D flask of glossy coloured liquid) and Robotics (Robo gradient, a mini Ano-style robot). Click: the card expands and the camera flies in (transition section 9).

### 7.4 Experiment map `/labs/[lab]/[level]`
A soft gradient canvas (Chem or Robo tint) with a curving path of nodes. Each node is a small glass card: title, time (2–5 min), status chip (done = verify, current = pulsing apricot, locked = cream). Ano sits next to the current node. Breadcrumb bar at top.

### 7.5 Experiment `/labs/[lab]/[level]/[id]`
A **bright studio laboratory** in 3D (section 8) with the experiment on the bench in the centre. Overlaid glass UI:
- Top: breadcrumb bar + mission card (goal in one sentence).
- Right: inspector glass card with live values (Geist Mono).
- Bottom centre: prediction choices, then the time scrubber and the black **Run** pill.
- Bottom left: Ano with speech bubble.
- After Run: a Result card (P5 style) slides in showing Prediction vs Reality.

**Success moment:** verify-green check, giant condensed word ("NAILED IT." and variations) with Win gradient, confetti in brand colours, Ano nods and celebrates, progress ribbon fills, then Next experiment (black pill) and See the theory (white pill).
**ANOMALY moment:** giant "ANOMALY." in Glitch gradient with a short glitch, Ano surprised, ghost prediction vs reality, hint 1 in the speech bubble.

**All experiments are 3D.** Students must be able to see everything properly: beakers, flasks, liquids, particles, wires, batteries, LEDs, resistors, motors and robots are real 3D objects they can orbit (drag to rotate, scroll to zoom, double-click to reset view) and click to inspect.
- Build a **shared 3D apparatus kit** once (`components/lab3d/kit/`): beaker, flask, test tube, sealed bag, burner, scale, thermometer, multimeter, battery, wire (smooth tube along a curve, current shown as moving particles), LED, bulb, resistor (with colour bands), switch, button, motor, buzzer, breadboard grid, robot chassis and wheels. Every experiment is assembled from this kit.
- Liquids: coloured translucent volumes with a gently moving surface; reactions show bubbles, colour changes and particles. A "zoom to particles" toggle shows molecules inside.
- Circuits: wires snap between part terminals in 3D; current particle speed matches the simulator's real current.
- Readouts float above instruments as small glass labels (Geist Mono).
- Order: **Light the LED** and **Mass in a sealed bag** first and most polished, then every other experiment, reusing the kit.

### 7.6 My beliefs `/beliefs`
Headline "YOUR · BELIEFS." A grid of Belief shift cards: broken (verify), challenged (apricot), not yet tested (cream). Filter chips by lab and level. Each card opens the experiment that broke it.

### 7.7 Theory view
Theory sheet component (section 5) opened from the success moment or the experiment map.

### 7.8 Loading and 404
Loading: Ano assembling with a percentage. 404: "LOST · IN SPACE." with Ano shrugging and a button home.

---

## 8. 3D, lighting and VFX for a light theme

- **Studio lighting:** soft key light (warm), cool rim light (volt tint) and coloured bounce (apricot on one side, flame or volt on the other). Tone mapping AgX or ACES, exposure tuned so whites stay creamy, not grey.
- **Lab set:** a seamless curved backdrop (floor curving into wall) in cream, a rounded clay-like bench, toy-like rounded instruments (scale, thermometer, multimeter) with small screens in Geist Mono. Chemistry tint warm, Robotics tint cool.
- **Shadows:** soft and baked (`AccumulativeShadows` or `ContactShadows` rendered once). No real-time shadow maps.
- **Materials:** glossy white plastic, matte orange, coloured translucent liquids. Real transmission on at most one object (performance budget); fake the rest.
- **VFX on light backgrounds:** additive blending disappears on cream, so use normal alpha blending with saturated colours. Sparks get a thin dark core; smoke is soft lilac-grey; shockwave rings use gradient strokes; confetti uses apricot, flame, volt, grape and verify.
- Performance budget from CLAUDE.md section 9 still applies.

---

## 8.1 Everything in 3D: the whole lab and the whole process

The lab isn't a 2D page with a 3D picture. The **entire experiment process happens in one continuous 3D space**, with the camera guiding the student through it:

1. **Arrive:** the camera glides into the studio lab and settles on the bench. Ano floats in and waves.
2. **Build:** parts fly from a 3D tray on the bench and snap into place with a spring and a soft click; glowing outlines show where they go. Students can orbit, zoom and click any part to inspect it (a glass label shows its name and live values).
3. **Predict:** the camera moves closer. The prediction choices appear as glass cards floating in 3D next to the apparatus. The chosen prediction appears as a translucent **ghost** of the expected result (a ghost-glowing LED, a ghost scale reading).
4. **Run:** a short cinematic camera move to the best viewing angle. The experiment plays in real time with the time scrubber (slow motion, pause, rewind).
5. **Reveal:** the camera pulls back to show the ghost and reality side by side.
   - **Correct:** a verify-green shockwave ring ripples across the bench, confetti bursts in 3D, Ano celebrates, the giant "NAILED IT." word assembles in 3D space.
   - **ANOMALY:** the scene briefly freezes with a glitch distortion, the giant "ANOMALY." word slams in, Ano hops in surprise and floats to the part that matters.
6. **Zoom to particles:** one button dives the camera inside the beaker or wire to see molecules moving or electrons flowing, then back out.
7. **Theory:** the theory sheet opens beside a 3D diagram that animates the idea (particles, current paths, forces as arrows).

**Visualization tools:** live 3D graphs floating above the bench (temperature, mass, current over time), force and current shown as animated arrows, heat as colour shimmer, gas as particles bouncing inside containers.

**VFX list:** sparks and arcs, smoke and steam, bubbling and fizzing, pouring liquid, colour-change swirls in liquids, heat shimmer, glowing current particles along wires, LED bloom, burnout pop and smoke, shockwave rings, 3D confetti, dissolve and glitch transitions, dust in light beams. Use `three.quarks` for particles, `three-custom-shader-material` for liquids, glitch and shimmer, `@react-three/postprocessing` for bloom (selective), and `@theatre/core` for the cinematic camera moves.

**Performance still rules:** pool particles, bake shadows, keep within the CLAUDE.md section 9 budget, and reduce effects in low-quality mode. If something can't hit 60 fps, simplify it rather than ship lag.

## 9. Motion and transitions

- Easing: springs or `cubic-bezier(0.22, 1, 0.36, 1)`. Durations: UI 150–300 ms, page transitions 600–900 ms.
- Hero headline: words roll up from a mask on slide change; letters settle with a slight overshoot. Use this only on headlines, not on every element.
- Cards: idle float, parallax with the mouse (cards at different depths move different amounts).
- **Page transitions:** shared-element morphs where possible (a level card expands into the next page's background; a lab card expands into the lab; a map node expands into the experiment). Fallback: Sunrise gradient wipe. Back plays in reverse. Reduced motion: quick fade.
- The Ribbon (P7) waves slowly; the Sunrise background drifts slowly.

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

Every page must score at least 4 on every point.