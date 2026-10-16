import { Color, MathUtils, MeshPhysicalMaterial } from "three";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { TOKENS } from "@/lib/tokens";

/*
 * The ANOMALY letters: glossy pearl plastic (a real MeshPhysicalMaterial, so
 * PBR lighting and reflections stay) extended with our own GLSL through
 * three-custom-shader-material (CLAUDE.md §3.4).
 *  - Always: a lilac rim on the edges and a slow pearl sheen that sweeps
 *    across the word, so the letters read as glossy objects in the void.
 *  - Break: red-hot cracks run out from each letter's centre just before the
 *    word bursts apart. The idea cracks.
 *  - Rebuild: the same cracks heal into thin gold seams, like kintsugi.
 * The crack pattern is cellular noise in each letter's own space, so it sticks
 * to the letter as it tumbles.
 */

const { smoothstep } = MathUtils;

/**
 * How cracked and how healed the letters are at scroll progress p. Tied to
 * the letters' motion in KineticTitle: they burst apart from 0.63 and
 * rebuild from 0.84.
 */
export function titleFx(p: number): { crack: number; seam: number } {
  return {
    crack: smoothstep(p, 0.55, 0.65) * (1 - smoothstep(p, 0.84, 0.9)),
    seam: smoothstep(p, 0.86, 0.96),
  };
}

const vertexShader = /* glsl */ `
  varying vec3 vLetter;
  varying vec3 vWorld;

  void main() {
    vLetter = position;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uCrack;
  uniform float uSeam;
  uniform float uMotion;
  uniform vec3 uRim;
  uniform vec3 uSheen;
  uniform vec3 uCrackColor;
  uniform vec3 uSeamColor;
  varying vec3 vLetter;
  varying vec3 vWorld;

  vec3 crackHash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453);
  }

  // Cellular noise. x: distance to the nearest cell border (F2 - F1), which
  // is near zero along the cracks. y: a random value for the nearest cell.
  vec2 crackField(vec3 p) {
    vec3 cell = floor(p);
    vec3 f = fract(p);
    float f1 = 9.0;
    float f2 = 9.0;
    float id = 0.0;
    for (int z = -1; z <= 1; z++) {
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec3 o = vec3(float(x), float(y), float(z));
          vec3 h = crackHash3(cell + o);
          vec3 d = o + h - f;
          float dist = dot(d, d);
          if (dist < f1) {
            f2 = f1;
            f1 = dist;
            id = h.x;
          } else if (dist < f2) {
            f2 = dist;
          }
        }
      }
    }
    return vec2(sqrt(f2) - sqrt(f1), id);
  }

  void main() {
    // Own block: this body is pasted into three.js's main(), so keep names local.
    {
      float facing = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
      float rim = pow(1.0 - facing, 3.0);
      csm_Emissive += uRim * rim * 0.6;

      // A soft band of light crosses the word about every 11 seconds.
      float band = dot(vWorld.xy, vec2(0.55, 0.35)) - (fract(uTime * 0.09) * 2.0 - 1.0) * 5.0;
      csm_Emissive += uSheen * exp(-band * band * 5.0) * (0.15 + 0.5 * rim) * uMotion;

      if (uCrack + uSeam > 0.001) {
        vec3 q = vLetter * 1.8 + 3.7;
        q += 0.07 * sin(q.yzx * 11.0); // jagged, not neat cells
        vec2 c = crackField(q);
        // Cracks reach out from the letter's centre as uCrack rises.
        float reach = smoothstep(0.0, 0.2, uCrack * 1.7 - length(vLetter.xy * vec2(0.9, 1.1)) - c.y * 0.25);
        // A dark groove with a thin hot core reads as a fracture, not a vein.
        float groove = (1.0 - smoothstep(0.02, 0.08, c.x)) * reach;
        float core = (1.0 - smoothstep(0.004, 0.022, c.x)) * reach;
        float seam = (1.0 - smoothstep(0.006, 0.022, c.x)) * uSeam;
        csm_DiffuseColor.rgb *= 1.0 - groove * 0.8;
        csm_DiffuseColor.rgb = mix(csm_DiffuseColor.rgb, uSeamColor, seam * 0.85);
        // Above 1 reaches the bloom pass (threshold 1).
        csm_Emissive += uCrackColor * core * 8.0 + uSeamColor * seam * 1.8;
      }
    }
  }
`;

export function createTitleMaterial() {
  return new CustomShaderMaterial({
    baseMaterial: MeshPhysicalMaterial,
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCrack: { value: 0 },
      uSeam: { value: 0 },
      uMotion: { value: 1 },
      uRim: { value: new Color(TOKENS.lilac) },
      uSheen: { value: new Color(TOKENS.pearl) },
      uCrackColor: { value: new Color(TOKENS.anomaly) },
      uSeamColor: { value: new Color(TOKENS.resolve) },
    },
    color: new Color(TOKENS.pearl),
    roughness: 0.16,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 0.15,
    iridescenceIOR: 1.3,
  });
}
