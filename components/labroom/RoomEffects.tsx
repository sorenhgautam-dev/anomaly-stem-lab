"use client";

import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

/*
 * Post-processing for the labs (CLAUDE.md §9): one composer, multisampling
 * off. Bloom picks up only the emissive strips, screens and LEDs; a vignette
 * pulls the eye to the experiment; a whisper of grain. Low quality skips it.
 */

export function RoomEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.3} intensity={0.9} radius={0.72} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.28} darkness={0.62} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.06} />
    </EffectComposer>
  );
}
