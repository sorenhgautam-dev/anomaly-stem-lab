"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  type Points,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector3,
} from "three";
import { TOKENS } from "@/lib/tokens";
import { live } from "./live";
import { mulberry32 } from "./random";

/*
 * Drifting dust: thousands of points moved entirely in the vertex shader
 * (noise-driven drift, pushed away from the cursor). No per-frame CPU work.
 */

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCursor;
  uniform float uPixelRatio;
  uniform float uSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float t = uTime * 0.07 + aSeed * 6.2831;
    p += vec3(
      sin(t + p.y * 0.35) + sin(t * 0.6 + p.z * 0.2) * 0.5,
      cos(t * 0.9 + p.x * 0.3) * 0.8,
      sin(t * 1.1 + p.x * 0.25)
    ) * 0.45;

    vec3 away = p - uCursor;
    float d = length(away);
    p += normalize(away + 1e-4) * smoothstep(1.8, 0.0, d) * 1.1;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = uSize * uPixelRatio * (0.35 + aSeed * 0.9) / depth;
    vAlpha = smoothstep(34.0, 7.0, depth) * smoothstep(0.4, 1.6, depth) * (0.25 + 0.75 * aSeed);
    vColor = aColor;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

export function Dust({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(42);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const palette = [new Color(TOKENS.pearl), new Color(TOKENS.lilac), new Color(TOKENS.signal)];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() * 2 - 1) * 13;
      positions[i * 3 + 1] = -1.2 + rand() * 8;
      positions[i * 3 + 2] = -22 + rand() * 32;
      seeds[i] = rand();
      const pick = rand();
      const c = palette[pick < 0.6 ? 0 : pick < 0.88 ? 1 : 2];
      // A few motes are bright enough to bloom.
      const boost = rand() > 0.97 ? 2.6 : 0.85;
      colors[i * 3] = c.r * boost;
      colors[i * 3 + 1] = c.g * boost;
      colors[i * 3 + 2] = c.b * boost;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geo.setAttribute("aColor", new BufferAttribute(colors, 3));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uCursor: { value: new Vector3(0, 0, 1000) },
          uPixelRatio: { value: 1 },
          uSize: { value: 26 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const points = useRef<Points>(null);
  useFrame((state) => {
    const shader = points.current?.material;
    if (!(shader instanceof ShaderMaterial)) return;
    shader.uniforms.uTime.value = state.clock.elapsedTime;
    (shader.uniforms.uCursor.value as Vector3).copy(live.cursor);
    shader.uniforms.uPixelRatio.value = state.viewport.dpr;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
