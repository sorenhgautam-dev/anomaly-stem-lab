# RESOURCES.md — Libraries and open-source references for ANOMALY

Checked on 15 October 2026 against the npm registry and GitHub (each package exists, versions are the latest on npm that day, licences read from npm or the repo's licence file). Re-check versions when installing, and read each library's docs before using its API.

## How to use open-source code (read first)

| Licence | What we can do |
|---|---|
| MIT, ISC, BSD, Apache-2.0, CC0 | Use the package, and copy or adapt code, as long as we keep the copyright notice. List anything adapted in the README credits. |
| GSAP "Standard no-charge" licence | Free to use, including all plugins. Use the package; don't copy its source. |
| GPL (PhET sims, CircuitJS) | **Study only.** Read how they model the science and design misconceptions, then write our own code. Copying GPL code would force our whole project to become GPL. |
| Prosperity (Lygia shaders) | **Study only.** Free for non-commercial use, so don't copy it into this project. Write noise functions from glsl-noise instead. |

Never copy a reference site's assets (models, textures, images, copy, fonts) even if its code is open.

---

## 1. Libraries to install

### 3D core
| Package | Version | Licence | Use |
|---|---|---|---|
| `three` | 0.186.1 | MIT | WebGL engine |
| `@react-three/fiber` | 9.8.2 | MIT | Three.js in React (needs React 19) |
| `@react-three/drei` | 10.7.9 | MIT | Glass (`MeshTransmissionMaterial`), `Environment`, `Lightformer`, `Text3D`, `ContactShadows`, `MeshReflectorMaterial`, `Sparkles`, `Trail`, `Instances`, `PerformanceMonitor`, `AdaptiveDpr` |
| `three-stdlib` | 2.36.1 | MIT | Extra loaders and utilities |
| `troika-three-text` | 0.52.5 | MIT | Crisp SDF text in 3D (used by drei's `Text`) |
| `camera-controls` | 3.1.2 | MIT | Smooth, damped camera movement (drei `CameraControls`) |

### Effects and shaders
| Package | Version | Licence | Use |
|---|---|---|---|
| `@react-three/postprocessing` + `postprocessing` | 3.2.0 / 6.39.5 | MIT / Zlib | Bloom, chromatic aberration, noise, vignette, depth of field |
| `n8ao` | 2.0.1 | ISC | High-quality ambient occlusion (expensive: hero shots only) |
| `three-custom-shader-material` | 6.4.0 | MIT | Add custom GLSL to physical materials (fracture lines, glitch, glow) |

### Physics, interaction, motion
| Package | Version | Licence | Use |
|---|---|---|---|
| `@react-three/rapier` | 2.2.0 | MIT (repo) | 3D physics: collisions, impulses, cursor body |
| `three-mesh-bvh` | 0.9.16 | MIT | Fast raycasting for hover and click |
| `@use-gesture/react` | 10.3.1 | MIT | Drag, toss and throw velocity |
| `gsap` (+ ScrollTrigger) | 3.15.0 | Standard no-charge | Timelines and scroll-driven animation |
| `lenis` | 1.3.27 | MIT | Smooth weighted scrolling (by Studio Freight / darkroom.engineering) |
| `@theatre/core` + `@theatre/r3f` | 0.7.2 | Apache-2.0 | Keyframe cinematic camera and scene sequences visually |
| `motion` | 14.3.0 | MIT | UI animation in React (Framer Motion) |
| `@react-spring/three` | 10.1.2 | MIT | Springy physics-feel animations on 3D objects (Ano's moves) |
| `maath` | 0.10.8 | MIT | Damping, easing and random helpers for R3F |
| `@14islands/r3f-scroll-rig` | 8.15.0 | ISC | Sync 3D objects to normal HTML scroll (Locomotive-style pages) |

### Labs
| Package | Version | Licence | Use |
|---|---|---|---|
| `pixi.js` + `@pixi/react` | 8.22.0 / 8.0.5 | MIT | Fast 2D: particles, current flow, robot trails |
| `matter-js` | 0.20.0 | MIT | 2D physics for falling and collision experiments |
| `mathjs` | 15.2.0 | Apache-2.0 | Linear solver (`lusolve`) for the circuit solver |
| `@wokwi/elements` | 1.9.2 | MIT | Ready-made, realistic web components for LEDs, resistors, buttons, servos, Arduino boards: great visuals for the Robotics builder |
| `avr8js` | 0.21.1 | MIT | Runs real Arduino code in the browser (roadmap / stretch goal) |
| `blockly` + `react-blockly` | 13.4.0 / 9.0.0 | Apache-2.0 / MIT | Drag-and-drop programming for the robot brain |
| `3dmol` | 2.5.5 | BSD-3-Clause | Real molecule viewer for the theory view (Advanced chemistry) |
| `@xyflow/react` | 12.12.0 | MIT | Misconception map |
| `howler` | 2.2.4 | MIT | Sound effects |

### App, data and AI
| Package | Version | Licence | Use |
|---|---|---|---|
| `zustand` | 5.0.15 | MIT | State, including transient per-frame updates without re-renders |
| `zod` | 4.6.7 | MIT | Validate experiment and hint JSON |
| `idb` | 8.0.4 | ISC | Save progress in IndexedDB |
| `ai` + `@ai-sdk/groq` + `@ai-sdk/google` | 7.0.141 / 4.0.61 / 4.0.96 | Apache-2.0 | Ask Ano (server-side only) |
| `@react-three/a11y` | 3.0.0 | MIT | Keyboard focus and screen-reader support for 3D buttons |

### Dev only
| Package | Version | Licence | Use |
|---|---|---|---|
| `r3f-perf` | 7.2.3 | MIT | FPS, draw calls and GPU time |
| `leva` | 0.10.1 | MIT | Live tweak panel |
| `@theatre/studio` | 0.7.2 | AGPL-3.0: dev only, never ship it in the production build | Visual keyframe editor |
| `vitest` | 5.0.5 | MIT | Tests |

---

## 2. Open-source repos to learn from

### Starters and site structure
| Repo | Licence | What to take |
|---|---|---|
| [pmndrs/react-three-next](https://github.com/pmndrs/react-three-next) | MIT | Official Next.js + R3F starter: how to share one canvas across pages without reloading |
| [darkroomengineering/satus](https://github.com/darkroomengineering/satus) | MIT | Next.js starter from the Lenis team (ex-Studio Freight): smooth scroll, WebGL and page transitions set up the way award-winning studios do it |
| [14islands/r3f-scroll-rig](https://github.com/14islands/r3f-scroll-rig) | MIT | Pinning 3D scenes to scroll sections in Next.js |
| [pmndrs/examples](https://github.com/pmndrs/examples) | MIT | Hundreds of small R3F demos: glass, transmission, physics, instancing, post-processing, text. The best single place to copy patterns from |

### 3D craft and effects
| Repo | Licence | What to take |
|---|---|---|
| [pmndrs/drei](https://github.com/pmndrs/drei) | MIT | Source of every helper we use; read `MeshTransmissionMaterial` to tune glass cost vs quality |
| [pmndrs/react-postprocessing](https://github.com/pmndrs/react-postprocessing) | MIT | How to combine effects in one composer |
| [FarazzShaikh/THREE-CustomShaderMaterial](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) | MIT | Examples of custom shaders on physical materials |
| [N8python/n8ao](https://github.com/N8python/n8ao) | CC0 | Ambient occlusion setup and quality presets |
| [gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | MIT | Fast raycasting, plus impressive demos |
| [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | MIT | Cursor-reactive fluid background; adapt as a subtle landing-page layer |
| [hughsk/glsl-noise](https://github.com/hughsk/glsl-noise) | MIT | Simplex and classic noise for particles, glow and glitch |
| [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019) | MIT | Famous physics-playground portfolio: how to make a 3D world feel playful and smooth |
| [utsuboco/r3f-perf](https://github.com/utsuboco/r3f-perf) | MIT | Performance monitoring |
| [theatre-js/theatre](https://github.com/theatre-js/theatre) | Apache-2.0 (core) | Cinematic camera sequences |
| [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | MIT | Smooth scroll, and how to sync it with GSAP and R3F |

### Science simulations (study the science, write our own code)
| Repo | Licence | What to take |
|---|---|---|
| [phetsims/circuit-construction-kit-common](https://github.com/phetsims/circuit-construction-kit-common) | GPL (study only) | Research-based circuit sim: how they model bulbs, batteries, current flow visuals |
| [phetsims/gas-properties](https://github.com/phetsims/gas-properties) | GPL (study only) | Particle model of gases for the particles-and-heat experiments |
| [phetsims/states-of-matter](https://github.com/phetsims/states-of-matter) | GPL (study only) | Melting and particles for Easy chemistry |
| [phetsims/ph-scale](https://github.com/phetsims/ph-scale), [acid-base-solutions](https://github.com/phetsims/acid-base-solutions), [molarity](https://github.com/phetsims/molarity), [balancing-chemical-equations](https://github.com/phetsims/balancing-chemical-equations), [build-a-molecule](https://github.com/phetsims/build-a-molecule) | GPL (study only) | Chemistry experiment ideas and how to visualise them |
| [sharpie7/circuitjs1](https://github.com/sharpie7/circuitjs1) | GPL-2.0 (study only) | Full circuit simulator in the browser; reference for the solver and current-dot animation |
| [CircuitVerse/CircuitVerse](https://github.com/CircuitVerse/CircuitVerse) | MIT | Open-source circuit-building UI: grid, wiring, snapping |
| [3dmol/3Dmol.js](https://github.com/3dmol/3Dmol.js) | BSD-3-Clause | Molecule rendering |
| [molstar/molstar](https://github.com/molstar/molstar) | MIT | Advanced molecular graphics (heavy; reference only) |

### Robotics and programming
| Repo | Licence | What to take |
|---|---|---|
| [wokwi/wokwi-elements](https://github.com/wokwi/wokwi-elements) | MIT | Realistic electronic part components ready to drop into the builder |
| [wokwi/avr8js](https://github.com/wokwi/avr8js) | MIT | Real Arduino simulation (stretch goal) |
| [google/blockly](https://github.com/google/blockly) | Apache-2.0 | Block programming editor and custom blocks |
| [microsoft/pxt](https://github.com/microsoft/pxt) | MIT | MakeCode's blocks-plus-simulator design: how beginner robotics programming is taught |
| [OpenRoberta/openroberta-lab](https://github.com/OpenRoberta/openroberta-lab) | Apache-2.0 | Open-source educational robot programming with a browser robot simulator |
| [liabru/matter-js](https://github.com/liabru/matter-js) | MIT | 2D physics for the robot arena if needed |

---

## 3. Design inspiration sites (look, don't copy assets)

- https://lusion.co/ (primary)
- https://activetheory.net/
- https://locomotive.ca/
- https://studiofreight.com/
- https://www.paragonproductions.co/
- http://turionspace.com/
- https://heron.ai/

---

## 4. Assets: HDRIs, textures, models, sounds, fonts, icons

These were not live-checked from here. Open each page and confirm the licence of every individual asset before using it, and list each one in the README credits.

| Source | Link | Licence (verify per asset) | Use |
|---|---|---|---|
| Poly Haven | https://polyhaven.com/ | CC0 | HDRIs for reflections (download 1K versions), textures, some models |
| ambientCG | https://ambientcg.com/ | CC0 | PBR textures (brushed metal for the steel ball, glass, lab surfaces) |
| Kenney | https://kenney.nl/assets | CC0 | Simple models, UI sounds, game assets |
| Freesound | https://freesound.org/ | Varies per sound (CC0, CC BY, CC BY-NC) | Clinks, sparks, hums. Only use CC0 or CC BY; never CC BY-NC |
| Pixabay sounds | https://pixabay.com/sound-effects/ | Pixabay Content License | Extra sound effects |
| Fontshare | https://www.fontshare.com/ | ITF Free Font License | Clash Grotesk and General Sans |
| Google Fonts | https://fonts.google.com/ | Mostly SIL Open Font License | JetBrains Mono |
| Lucide | https://lucide.dev/ | ISC | Icons |

Rules: prefer building 3D objects from code. Never use assets from reference sites or anything without a clear licence. No AI-generated images of real brands or characters.

---

## 5. Official docs and performance guides (follow these over memory)

| Topic | Link | Why it matters |
|---|---|---|
| R3F performance pitfalls | https://r3f.docs.pmnd.rs/advanced/pitfalls | The most common causes of lag: state updates per frame, creating objects in loops |
| R3F scaling performance | https://r3f.docs.pmnd.rs/advanced/scaling-performance | Instancing, on-demand rendering, adaptive quality |
| React Three Fiber docs | https://r3f.docs.pmnd.rs/ | Correct APIs for the current version |
| Drei docs | https://drei.docs.pmnd.rs/ | Glass, environment, text, performance helpers |
| Rapier (R3F) docs | https://github.com/pmndrs/react-three-rapier | Colliders, physics settings |
| Three.js docs and examples | https://threejs.org/docs/ and https://threejs.org/examples/ | Materials, tone mapping, techniques |
| Next.js hydration errors | https://nextjs.org/docs/messages/react-hydration-error | Fixing server/client mismatches |
| Next.js lazy loading | https://nextjs.org/docs/app/guides/lazy-loading | `dynamic(..., { ssr: false })` for WebGL components |
| GSAP ScrollTrigger | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ | Scroll-driven camera |
| Lenis | https://github.com/darkroomengineering/lenis | Syncing smooth scroll with GSAP and R3F |
| Blockly guides | https://developers.google.com/blockly | Custom blocks for the robot brain |
| Vercel AI SDK | https://ai-sdk.dev/docs | Ask Ano with Groq and Gemini |

---

## 6. Science content sources (for accuracy)

| Source | Link | Licence | Use |
|---|---|---|---|
| OpenStax Chemistry 2e | https://openstax.org/details/books/chemistry-2e | CC BY 4.0 | Accurate explanations for the theory view; credit OpenStax if adapting text |
| OpenStax College Physics 2e | https://openstax.org/details/books/college-physics-2e | CC BY 4.0 | Circuits, forces, energy |
| PhET simulations | https://phet.colorado.edu/ | Sims GPL; study only | How experts design experiments around misconceptions |
| Physics education research on misconceptions | Search Google Scholar for "student misconceptions DC circuits", "chemistry misconceptions conservation of mass", "particle model misconceptions" | Read only | Check every misconception in our catalogue against real studies and cite them in the pitch |

Rule: every misconception, hint and theory explanation must be checked against a reliable source. Never invent science facts or research numbers.

---

## 7. Testing and deployment

| Tool | Link | Licence | Use |
|---|---|---|---|
| Vitest | https://vitest.dev/ | MIT | Unit tests for the solver and diagnosis engine |
| Playwright | https://playwright.dev/ | Apache-2.0 | End-to-end tests: click through level → lab → experiment; screenshots for visual checks |
| Lighthouse | Built into Chrome DevTools | Apache-2.0 | Load speed and accessibility checks |
| Chrome DevTools Performance panel | Built in | n/a | Find what's slowing frames |
| Vercel | https://vercel.com/ | Service | Hosting the live demo |

---

## 8. Don't use (and why)

| Avoid | Reason |
|---|---|
| Copying code from PhET, CircuitJS or any GPL project | Would force the whole project to become GPL |
| Copying Lygia shaders | Non-commercial licence |
| Shipping `@theatre/studio` | AGPL; dev only |
| `lamina` | No longer maintained; use `three-custom-shader-material` |
| `MeshTransmissionMaterial` on more than one object | Re-renders the scene per object; main cause of lag |
| N8AO and depth of field on the landing page | Too expensive for the budget |
| Assets, layouts or code from Lusion or other reference sites | Not ours to copy |
| Freesound clips marked CC BY-NC | Non-commercial only |
| Calling AI models from the browser | Exposes API keys |
| React Bits | MIT + Commons Clause, not truly permissive |
| Switching to Vite | Project is on Next.js; we need its routing and API routes |

---

## 9. Extra tools (second review, checked 15 October 2026)

All repos and npm packages below were confirmed to exist, with licences read from GitHub or npm.

| Tool | Version | Licence | Decision | Use in ANOMALY |
|---|---|---|---|---|
| [lusionltd/WebGL-Scroll-Sync](https://github.com/lusionltd/WebGL-Scroll-Sync) | repo | MIT | **Study first** | Lusion's own open-source demo for keeping WebGL visuals in sync with HTML scrolling. Read it before building the landing scroll; MIT, so patterns can be adapted with credit |
| `embla-carousel-react` | 8.6.0 | MIT | Add | Swipeable sliders: level cards, experiment cards, theory-view steps |
| `@radix-ui/react-*` (dialog, tooltip, tabs, dropdown) | 1.3.1 (dialog) | MIT | Add | Accessible HUD controls, theory view dialog, menus |
| `@paper-design/shaders-react` | 0.0.81 | Apache-2.0 | Optional | Ready-made animated shader backgrounds for level and lab select. Pin the version (pre-1.0); limit canvas size; pause offscreen |
| `animejs` | 4.5.0 | MIT | Backup | Use instead of GSAP only if the hackathon requires OSI open-source dependencies (GSAP's licence is free but not open source) |
| CSS scroll-driven animations | browser | n/a | Optional | Simple HTML scroll effects with no JavaScript; feature-detect and fall back |
| `@gltf-transform/cli`, `gltfpack` (meshoptimizer) | 4.5.1 / 1.3.0 | MIT | Only if using models | Shrink and compress any GLB models before shipping |
| `@react-three/gltfjsx` | 4.3.4 | MIT | Only if using models | Turn a GLB into a React component to animate its parts |
| Basis Universal + Three.js `KTX2Loader` | repo | Apache-2.0 | Only if using big textures | Compressed textures to save GPU memory |
| `stats.js` | 0.17.0 | MIT | Optional | Simple FPS meter (we already use r3f-perf) |
| `ogl` | 1.0.11 | Unlicense | Skip | Good library, but a second 3D engine would add weight; Three.js covers it |
| `@phosphor-icons/react` | 2.1.10 | MIT | Skip | Stick to one icon family (Lucide) |

**Not changing:** we stay on **Next.js**, not Vite. The project is already built on Next.js, and we need its routing and server API routes for Ask Ano.

Add to the "don't use" list: **React Bits** (MIT + Commons Clause, which restricts selling the software, so it's not truly permissive).