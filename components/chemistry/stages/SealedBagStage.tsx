"use client";

import { useMemo, useRef } from "react";
import { stream } from "@/lib/fx";
import { TOKENS } from "@/lib/tokens";
import type { StageProps } from "@/components/lab/stages";
import { Beaker, Bench, Bubbles, GhostReadout, Scale, ZipBag, ZipSeal, type BagHandle, type BubblesHandle, type LiquidHandle, type ValueHandle } from "../bench";
import { ParticleView, type ParticleHandle } from "../ParticleView";
import { useStageFrames } from "../useStageFrames";

/*
 * Stage "fizz" — Mass in a sealed bag. Baking soda and vinegar fizz inside a
 * zip bag on a scale. Sealed: the bag swells and the scale holds still.
 * Open: the gas drifts out and the reading drops. Readings and timeline keys
 * are documented in engine/chemistry/fizz.ts.
 */

const MAX_BAG_ML = 2800;

export function SealedBagStage({ def, build, outcome, ghost }: StageProps) {
  const scale = useRef<ValueHandle>(null);
  const bag = useRef<BagHandle>(null);
  const fizz = useRef<BubblesHandle>(null);
  const escaping = useRef<BubblesHandle>(null);
  const cup = useRef<LiquidHandle>(null);
  const particles = useRef<ParticleHandle>(null);
  const made = useRef<SVGTextElement>(null);
  const sealed = build.settings.sealed === true;
  const surface = useRef<SVGCircleElement>(null);
  const fizzFx = useMemo(() => stream("fizz"), []);

  useStageFrames(def, build, outcome, (t, v) => {
    scale.current?.set(v["scale.grams"] ?? 0);
    bag.current?.inflate((v.bagVolume ?? 0) / MAX_BAG_ML);
    fizz.current?.set(v.bubbles ?? 0, t);
    escaping.current?.set(sealed ? 0 : Math.min(1, (v.bubbles ?? 0) * 1.4), t);
    cup.current?.level(0.55);
    if (outcome) fizzFx(surface.current, v.bubbles ?? 0);
    const madeG = v["co2.made"] ?? 0;
    const escapedG = v["co2.escaped"] ?? 0;
    particles.current?.set({
      count: 0.6 + Math.min(1.6, madeG / 2),
      speed: 1,
      escape: sealed || madeG <= 0 ? 0 : Math.min(0.95, escapedG / Math.max(madeG, 1e-6)),
      mix: Math.min(0.75, madeG / 3.5),
      spread: 1,
    });
    if (made.current) made.current.textContent = `${madeG.toFixed(2)} g of CO₂ made`;
  });

  const ghostEnd = ghost?.readings["scale.end"];

  return (
    <svg viewBox="0 0 1000 600" className="size-full" role="img" aria-label={`${def.title}: a zip bag of vinegar and baking soda on a scale`}>
      <Bench y={500} />
      <Scale ref={scale} x={330} y={430} width={300} />
      <ZipBag ref={bag} x={330} y={240} w={250} h={190}>
        <Beaker ref={cup} x={330} y={330} w={92} h={96} level={0.55} color="rgba(237,235,255,0.14)">
          <Bubbles ref={fizz} x={290} y={360} w={80} h={64} />
        </Beaker>
        <path d="M 296 426 Q 330 404 364 426 Z" fill={TOKENS.pearl} fillOpacity={0.85} />
        {/* Where the fizz droplets jump from (the VFX layer measures it). */}
        <circle ref={surface} cx={330} cy={382} r={1} opacity={0} />
      </ZipBag>
      <ZipSeal x={330} y={250} w={250} sealed={sealed} />
      <Bubbles ref={escaping} x={290} y={120} w={80} h={120} color="rgba(61,123,255,0.8)" />
      <text ref={made} x={330} y={560} textAnchor="middle" className="fill-pearl/60 font-mono text-[13px]">
        —
      </text>

      <ParticleView ref={particles} x={760} y={250} r={120} colors={[TOKENS.pearl, TOKENS.signal]} label="Zoomed in: CO₂ (blue) among air" />

      {ghostEnd !== undefined && <GhostReadout x={330} y={110} text={`your idea: ${ghostEnd.toFixed(2)} g`} />}
    </svg>
  );
}
