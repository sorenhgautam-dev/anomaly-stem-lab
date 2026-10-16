"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type ChromaticAberrationEffect } from "postprocessing";
import { Vector2 } from "three";
import { live } from "./live";

/*
 * Post-processing (CLAUDE.md §3.1.8, §9): bloom on emissive parts and hot
 * highlights only (threshold 1 on a half-float buffer), AgX tone mapping,
 * chromatic aberration stronger toward the screen edges, and film grain. The aberration spikes for the ANOMALY moment and swells during
 * the Break chapter.
 */

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function Effects({ high }: { high: boolean }) {
  const ca = useRef<ChromaticAberrationEffect>(null);
  const offset = useMemo(() => new Vector2(0.0009, 0.0006), []);


  useFrame((_, delta) => {
    live.pulse = Math.max(0, live.pulse - delta * 1.1);
    const effect = ca.current;
    if (!effect) return;
    const breakAmount = 1 - smoothstep(0.04, 0.12, Math.abs(live.progress - 0.75));
    const pulse = live.reducedMotion ? 0 : live.pulse;
    const amount = (high ? 0.0009 : 0) + breakAmount * 0.0022 + pulse * pulse * 0.014;
    effect.offset.set(amount, amount * 0.7);
  });

  return (
    // One composer, multisampling off: bloom, light chromatic aberration and
    // grain only (CLAUDE.md §9). Tone mapping is colour management, not a look.
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.85} radius={0.75} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <ChromaticAberration ref={ca} offset={offset} radialModulation modulationOffset={0.2} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.16} />
    </EffectComposer>
  );
}
