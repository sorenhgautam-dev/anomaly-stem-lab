import { RAMP } from "@/lib/tokens";
import { colour, FINISH, FOG_FRAGMENT_PARS, FOG_VERTEX, FOG_VERTEX_PARS, roomShader } from "../shader-kit";

/*
 * Light you can see: volumetric beams from the ceiling, dust drifting
 * through them, and the little blinking status lights on the equipment.
 */

/** A soft cone of light (an open cylinder), brightest where it faces you and at its source. */
export function beamMaterial(hex: string, intensity = 1) {
  return roomShader({
    additive: true,
    doubleSided: true,
    uniforms: { uColor: colour(hex), uIntensity: { value: intensity } },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vViewW;
      varying float vH;
      ${FOG_VERTEX_PARS}
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewW = normalize(cameraPosition - world.xyz);
        vH = uv.y;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        ${FOG_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying vec3 vNormalW;
      varying vec3 vViewW;
      varying float vH;
      ${FOG_FRAGMENT_PARS}
      void main() {
        float facing = pow(abs(dot(normalize(vNormalW), normalize(vViewW))), 2.2);
        float along = pow(vH, 1.5) * smoothstep(1.0, 0.93, vH);
        float shimmer = 0.84 + 0.16 * sin(vH * 9.0 - uTime * 0.6);
        gl_FragColor = vec4(uColor * facing * along * shimmer * uIntensity * 0.22, 1.0);
        ${FINISH}
      }
    `,
  });
}

/** Dust motes: drift is computed in the vertex shader, so there is no CPU work per frame. */
export function dustMaterial() {
  return roomShader({
    additive: true,
    uniforms: { uPixelRatio: { value: 1 }, uSize: { value: 15 }, uGold: { value: 0 }, uGoldC: colour(RAMP.resolve[300]) },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uSize;
      attribute float aSeed;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vAlpha;
      ${FOG_VERTEX_PARS}
      void main() {
        vec3 p = position;
        float t = uTime * 0.05 + aSeed * 6.2831;
        p += vec3(sin(t + p.y * 0.7) * 0.25, sin(t * 0.7 + p.x) * 0.18 + mod(uTime * 0.02 * (0.3 + aSeed), 0.6) - 0.3, cos(t * 0.8 + p.x * 0.5) * 0.25);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        gl_PointSize = uSize * uPixelRatio * (0.3 + aSeed * 0.8) / depth;
        vAlpha = smoothstep(0.6, 2.0, depth) * (0.08 + 0.4 * aSeed) * (0.6 + 0.4 * sin(uTime * (0.6 + aSeed) + aSeed * 30.0));
        vColor = aColor;
        ${FOG_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uGold;
      uniform vec3 uGoldC;
      varying vec3 vColor;
      varying float vAlpha;
      ${FOG_FRAGMENT_PARS}
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(mix(vColor, uGoldC * 2.0, uGold * 0.8) * a, 1.0);
        ${FINISH}
      }
    `,
  });
}

/** Small LEDs on the equipment. Each blinks at its own rate; some just breathe. */
export function statusLightMaterial() {
  return roomShader({
    additive: true,
    uniforms: { uPixelRatio: { value: 1 }, uPower: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uPower;
      attribute vec3 aColor;
      attribute float aRate;
      attribute float aPhase;
      varying vec3 vColor;
      ${FOG_VERTEX_PARS}
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float rate = aRate * (1.0 + uPower * 2.5);
        float on = aRate > 0.0 ? step(0.45, fract(uTime * rate + aPhase)) : 0.6 + 0.4 * sin(uTime * 1.3 + aPhase * 6.0);
        vColor = aColor * (0.25 + 0.75 * on);
        gl_PointSize = 22.0 * uPixelRatio / -mvPosition.z;
        ${FOG_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      ${FOG_FRAGMENT_PARS}
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.18, 0.08, d);
        float halo = smoothstep(0.5, 0.0, d) * 0.35;
        gl_FragColor = vec4(vColor * (core * 2.5 + halo), 1.0);
        ${FINISH}
      }
    `,
  });
}
