import { Vector2 } from "three";
import { RAMP } from "@/lib/tokens";
import { colour, FINISH, FOG_FRAGMENT_PARS, FOG_VERTEX, FOG_VERTEX_PARS, roomShader, SDF } from "../shader-kit";

/*
 * Self-lit surfaces of the rooms: wall panels and screens, the fume hood's
 * back wall, the robotics cutting mat, the pegboard and the holo board.
 * They all listen to the verdict pulses (uGold, uAnomaly) so the whole lab
 * reacts to a result, and to uPower while a run plays.
 */

const VARYINGS = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
`;

const VERTEX = /* glsl */ `
  ${VARYINGS}
  attribute float aSeed;
  attribute float aKind;
  varying float vSeed;
  varying float vKind;
  ${FOG_VERTEX_PARS}
  void main() {
    vUv = uv;
    vec4 local = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      vSeed = aSeed;
      vKind = aKind;
    #else
      vSeed = 0.0;
      vKind = 0.0;
    #endif
    vec4 world = modelMatrix * local;
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    ${FOG_VERTEX}
  }
`;

const PULSES = /* glsl */ `
  uniform float uTime;
  uniform float uGold;
  uniform float uAnomaly;
  uniform float uPower;
  uniform vec3 uGoldC;
  uniform vec3 uAnomC;
`;

const pulseUniforms = () => ({
  uGold: { value: 0 },
  uAnomaly: { value: 0 },
  uPower: { value: 0 },
  uGoldC: colour(RAMP.resolve[400]),
  uAnomC: colour(RAMP.anomaly[400]),
});

/** Wall panels (instanced). aKind 1 = a screen with a live holographic trace. */
export function panelMaterial(edgeHex: string, screenHex: string) {
  return roomShader({
    uniforms: { ...pulseUniforms(), uBase: colour(RAMP.depth[800], 0.55), uEdge: colour(edgeHex, 1.4), uScreen: colour(screenHex, 1.6), uOrigin: { value: new Vector2(0, 1) } },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      ${VARYINGS}
      ${PULSES}
      uniform vec3 uBase;
      uniform vec3 uEdge;
      uniform vec3 uScreen;
      uniform vec2 uOrigin;
      varying float vSeed;
      varying float vKind;
      ${SDF}
      ${FOG_FRAGMENT_PARS}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float d = roundRect(p, vec2(1.0), 0.14);
        float edge = smoothstep(0.04, 0.0, abs(d + 0.025));
        float inside = smoothstep(0.0, -0.06, d);
        float breathe = 0.5 + 0.5 * sin(uTime * 0.4 + vSeed * 6.2831);
        vec3 col = uBase * inside * (0.5 + 0.5 * vUv.y);
        col += uEdge * edge * (0.1 + 0.18 * breathe + 0.2 * uPower);
        if (vKind > 0.5) {
          vec2 g = abs(fract(vUv * vec2(12.0, 7.0)) - 0.5);
          float grid = smoothstep(0.46, 0.5, max(g.x, g.y));
          float y = 0.5 + 0.24 * sin(vUv.x * 9.0 + uTime * (0.6 + vSeed) + vSeed * 20.0) * sin(vUv.x * 2.7 + vSeed * 7.0);
          float trace = smoothstep(0.035, 0.0, abs(vUv.y - y));
          float scan = 0.82 + 0.18 * sin(vUv.y * 140.0 - uTime * 4.0);
          col += uScreen * inside * (grid * 0.1 + trace * 0.85) * scan;
        }
        float front = (1.0 - uGold) * 9.0;
        float wave = smoothstep(1.4, 0.0, abs(length(vWorld.xy - uOrigin) - front)) * uGold;
        col += uGoldC * (wave * 2.4 + uGold * 0.15) * (edge * 1.6 + inside * 0.3);
        float band = step(0.84, hash(floor(vWorld.y * 7.0) + floor(uTime * 18.0)));
        float flick = 0.55 + 0.45 * sin(uTime * 55.0 + vSeed * 40.0);
        col = mix(col, col * 0.3 + uAnomC * (edge * 1.5 + inside * 0.2) * flick, uAnomaly);
        col += uAnomC * band * inside * uAnomaly * 0.5;
        gl_FragColor = vec4(col, 1.0);
        ${FINISH}
      }
    `,
  });
}

/** The fume hood's back wall: dark, softly lit from the top, with baffle slots. */
export function hoodBackMaterial() {
  return roomShader({
    uniforms: { ...pulseUniforms(), uTop: colour(RAMP.depth[800], 0.42), uBottom: colour(RAMP.depth[950], 0.6), uSlit: colour(RAMP.ion[400], 0.7) },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      ${VARYINGS}
      ${PULSES}
      uniform vec3 uTop;
      uniform vec3 uBottom;
      uniform vec3 uSlit;
      ${SDF}
      ${FOG_FRAGMENT_PARS}
      void main() {
        vec3 col = mix(uBottom, uTop, smoothstep(0.05, 1.0, vUv.y));
        float slits = 0.0;
        for (int i = 0; i < 3; i++) slits += smoothstep(0.004, 0.0, abs(vUv.y - (0.93 - float(i) * 0.035)));
        slits *= smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
        col += uSlit * slits * (0.18 + 0.3 * uPower);
        vec2 a = vec2(0.24 + 0.07 * sin(uTime * 0.07), 0.64 + 0.05 * sin(uTime * 0.05));
        vec2 b = vec2(0.8 + 0.05 * sin(uTime * 0.06 + 2.0), 0.46);
        float blobs = exp(-dot((vUv - a) * vec2(1.8, 2.6), (vUv - a) * vec2(1.8, 2.6)) * 3.0)
                    + 0.7 * exp(-dot((vUv - b) * vec2(2.0, 2.8), (vUv - b) * vec2(2.0, 2.8)) * 3.0);
        col += uSlit * blobs * 0.05;
        // A pool of light from the canopy strip, brightest just under it.
        col += uSlit * 0.06 * smoothstep(0.55, 1.0, vUv.y) * (0.7 + 0.3 * uPower);
        col += uGoldC * uGold * 0.3 * (0.3 + 0.7 * vUv.y);
        col = mix(col, col * 0.5 + uAnomC * 0.16 * (0.6 + 0.4 * sin(uTime * 40.0)), uAnomaly);
        gl_FragColor = vec4(col, 1.0);
        ${FINISH}
      }
    `,
  });
}

/** Robotics bench top: a self-healing cutting mat with a glowing grid. A run sends a power wave out from the board. */
export function matMaterial() {
  return roomShader({
    uniforms: {
      ...pulseUniforms(),
      uBase: colour(RAMP.depth[900], 0.8),
      uLine: colour(RAMP.ion[500], 0.9),
      uMajor: colour(RAMP.ion[400], 1.3),
      uWave: colour(RAMP.glow[400], 2.2),
      uLane: colour(RAMP.glow[400], 1.1),
      uRunAge: { value: 100 },
      uLanes: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      ${VARYINGS}
      ${PULSES}
      uniform vec3 uBase;
      uniform vec3 uLine;
      uniform vec3 uMajor;
      uniform vec3 uWave;
      uniform vec3 uLane;
      uniform float uRunAge;
      uniform float uLanes;
      ${SDF}
      ${FOG_FRAGMENT_PARS}
      // A grid line about \`px\` pixels wide, anti-aliased, fading out where the
      // lines crowd closer than a few pixels (no moiré at grazing angles).
      float gridLine(vec2 p, float spacing, float px) {
        vec2 g = abs(fract(p / spacing + 0.5) - 0.5) * spacing;
        vec2 w = fwidth(p);
        vec2 line = 1.0 - clamp(g / (w * px), 0.0, 1.0);
        float fade = 1.0 - smoothstep(spacing * 0.08, spacing * 0.3, max(w.x, w.y));
        return max(line.x, line.y) * fade;
      }
      void main() {
        vec2 p = vWorld.xz;
        float minor = gridLine(p, 0.1, 1.0);
        float major = gridLine(p, 0.5, 1.6);
        float reach = smoothstep(5.0, 0.4, length(p * vec2(0.55, 1.0)));
        vec3 col = uBase;
        col += (uLine * minor * 0.07 + uMajor * major * 0.22) * reach * (0.75 + 0.35 * uPower);
        float r = length(p * vec2(1.0, 1.4));
        float front = uRunAge * 2.6;
        float wave = smoothstep(0.22, 0.0, abs(r - front)) * exp(-uRunAge * 0.8) * step(0.0, uRunAge);
        col += uWave * wave * (0.25 + major * 1.6 + minor * 0.8);
        float lane = smoothstep(0.012, 0.0, abs(abs(p.x) - 0.85)) * uLanes;
        col += uLane * lane * reach;
        col += uGoldC * uGold * (major * 1.2 + minor * 0.4) * reach;
        col = mix(col, col * 0.4 + uAnomC * (major + minor * 0.3) * reach * (0.6 + 0.4 * sin(uTime * 50.0)), uAnomaly);
        gl_FragColor = vec4(col, 1.0);
        ${FINISH}
      }
    `,
  });
}

/** Pegboard wall: a grid of holes, lit from above. */
export function pegboardMaterial() {
  return roomShader({
    uniforms: { ...pulseUniforms(), uBoard: colour(RAMP.depth[800], 0.75), uRim: colour(RAMP.ion[300], 0.5) },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      ${VARYINGS}
      ${PULSES}
      uniform vec3 uBoard;
      uniform vec3 uRim;
      ${SDF}
      ${FOG_FRAGMENT_PARS}
      void main() {
        vec2 p = vWorld.xy;
        vec2 cell = fract(p / 0.07) - 0.5;
        float hole = smoothstep(0.17, 0.13, length(cell));
        float rim = smoothstep(0.24, 0.17, length(cell + vec2(0.0, 0.05))) * (1.0 - hole);
        float light = smoothstep(-0.2, 2.6, p.y) * 0.7 + 0.3;
        vec3 col = uBoard * light * (1.0 - hole * 0.85) + uRim * rim * 0.08 * light;
        col += uGoldC * uGold * 0.12 * light;
        col = mix(col, col * 0.5 + uAnomC * 0.1 * hole, uAnomaly);
        gl_FragColor = vec4(col, 1.0);
        ${FINISH}
      }
    `,
  });
}

/** The robotics holo board: dark tinted glass with glowing edges and a slow scanline. */
export function holoBoardMaterial() {
  return roomShader({
    transparent: true,
    depthWrite: false,
    uniforms: { ...pulseUniforms(), uTint: colour(RAMP.depth[950]), uEdge: colour(RAMP.ion[400], 1.6) },
    vertexShader: VERTEX.replace(
      "vUv = uv;",
      "vUv = uv;\n    vAspect = length(modelMatrix[0].xyz) / max(1e-4, length(modelMatrix[1].xyz));",
    ).replace("varying float vSeed;", "varying float vSeed;\n  varying float vAspect;"),
    fragmentShader: /* glsl */ `
      ${VARYINGS}
      ${PULSES}
      uniform vec3 uTint;
      uniform vec3 uEdge;
      varying float vAspect;
      ${SDF}
      ${FOG_FRAGMENT_PARS}
      void main() {
        vec2 p = (vUv * 2.0 - 1.0) * vec2(vAspect, 1.0);
        float d = roundRect(p, vec2(vAspect, 1.0), 0.06);
        float edge = smoothstep(0.012, 0.0, abs(d + 0.006));
        float glowIn = smoothstep(-0.22, 0.0, d) * 0.22;
        float scan = smoothstep(0.02, 0.0, abs(fract(vUv.y - uTime * 0.06) - 0.5)) * 0.08;
        vec3 edgeC = mix(uEdge, uGoldC * 1.6, uGold);
        edgeC = mix(edgeC, uAnomC * 1.6 * (0.6 + 0.4 * sin(uTime * 45.0)), uAnomaly);
        vec3 col = uTint + edgeC * (edge * (0.8 + 0.4 * uPower) + glowIn * 0.35 + scan * 0.4);
        float alpha = 0.74 + edge * 0.26;
        gl_FragColor = vec4(col, alpha);
        ${FINISH}
      }
    `,
  });
}
