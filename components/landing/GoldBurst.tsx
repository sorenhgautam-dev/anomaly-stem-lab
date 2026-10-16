"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  type Points,
} from "three";
import { TOKENS } from "@/lib/tokens";
import { mulberry32 } from "./random";

/*
 * Gold burst for a correct prediction (CLAUDE.md §3.5): sparks fountain up
 * from where the balls landed, drift, twinkle and fade. Bright enough to
 * bloom. Motion is computed in the vertex shader from the burst's age.
 */

const vertexShader = /* glsl */ `
  uniform float uAge;
  uniform float uPixelRatio;
  attribute vec3 aVelocity;
  attribute float aSeed;
  varying float vAlpha;

  void main() {
    float age = max(0.0, uAge - aSeed * 0.25);
    vec3 p = position + aVelocity * age + vec3(0.0, -0.9, 0.0) * age * age * 0.5;
    p.x += sin(age * 3.0 + aSeed * 20.0) * 0.06;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (50.0 + aSeed * 70.0) * uPixelRatio / -mv.z;
    float life = 1.0 - smoothstep(1.2, 2.8, age);
    float twinkle = 0.6 + 0.4 * sin(age * 18.0 + aSeed * 40.0);
    vAlpha = life * twinkle * step(0.001, age);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * (0.6 + core * 2.4), core * vAlpha);
  }
`;

export function GoldBurst({ position, count = 140 }: { position: [number, number, number]; count?: number }) {
  const points = useRef<Points>(null);
  const started = useRef<number | null>(null);

  const geometry = useMemo(() => {
    const rand = mulberry32(9);
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() * 2 - 1) * 1.3;
      pos[i * 3 + 1] = rand() * 0.2;
      pos[i * 3 + 2] = (rand() * 2 - 1) * 0.5;
      vel[i * 3] = (rand() * 2 - 1) * 0.8;
      vel[i * 3 + 1] = 1.2 + rand() * 2.2;
      vel[i * 3 + 2] = (rand() * 2 - 1) * 0.8;
      seeds[i] = rand();
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aVelocity", new BufferAttribute(vel, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uAge: { value: 0 },
          uPixelRatio: { value: 1 },
          uColor: { value: new Color(TOKENS.resolve) },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const shader = points.current?.material;
    if (!(shader instanceof ShaderMaterial)) return;
    started.current ??= state.clock.elapsedTime;
    shader.uniforms.uAge.value = state.clock.elapsedTime - started.current;
    shader.uniforms.uPixelRatio.value = state.viewport.dpr;
  });

  return (
    <points ref={points} geometry={geometry} material={material} position={position} frustumCulled={false} />
  );
}
