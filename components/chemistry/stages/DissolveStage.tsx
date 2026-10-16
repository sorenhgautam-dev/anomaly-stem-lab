"use client";

import { useRef } from "react";
import { TOKENS } from "@/lib/tokens";
import type { StageProps } from "@/components/lab/stages";
import { Beaker, Bench, GhostReadout, Scale, type LiquidHandle, type ValueHandle } from "../bench";
import { ParticleView, type ParticleHandle } from "../ParticleView";
import { useStageFrames } from "../useStageFrames";

/*
 * Stage "dissolve" — Where does the sugar go? A beaker of water and a dish of
 * sugar share one scale; the sugar is poured in and dissolves. The reading
 * never moves; the zoomed view shows the sugar particles spreading out among
 * the water's. Keys: engine/chemistry/dissolve.ts.
 */

export function DissolveStage({ def, build, outcome, ghost }: StageProps) {
  const scale = useRef<ValueHandle>(null);
  const water = useRef<LiquidHandle>(null);
  const pile = useRef<SVGPathElement>(null);
  const dish = useRef<SVGPathElement>(null);
  const cloud = useRef<SVGEllipseElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const grams = typeof build.settings.sugar === "number" ? build.settings.sugar : 20;

  useStageFrames(def, build, outcome, (t, v) => {
    scale.current?.set(v["scale.grams"] ?? 0);
    const dissolved = v["sugar.dissolved"] ?? 0;
    const poured = outcome ? Math.min(1, t / 1) : 0;
    // Sugar leaves the dish as it's poured, sits on the bottom, then fades as it dissolves.
    dish.current?.setAttribute("opacity", String(1 - poured));
    const heap = (1 - dissolved) * poured;
    pile.current?.setAttribute("opacity", String(heap > 0.01 ? 0.9 : 0));
    pile.current?.setAttribute("transform", `translate(0 ${(1 - heap) * 14}) scale(1 ${Math.max(0.05, heap)})`);
    cloud.current?.setAttribute("opacity", String(Math.min(0.55, dissolved * 0.6) * (1 - (v.spread ?? 0) * 0.5)));
    water.current?.level(0.46 + Math.min(0.06, (grams / 50) * 0.06 * dissolved));
    particles.current?.set({ mix: Math.min(0.45, grams / 110), spread: outcome ? (v.spread ?? 0) : 0, speed: 0.8 });
  });

  const ghostEnd = ghost?.readings["scale.end"];

  return (
    <svg viewBox="0 0 1000 600" className="size-full" role="img" aria-label={`${def.title}: water and sugar on one scale`}>
      <Bench y={500} />
      <Scale ref={scale} x={340} y={430} width={420} />
      <Beaker ref={water} x={270} y={240} w={170} h={190} level={0.46}>
        <ellipse ref={cloud} cx={270} cy={390} rx={70} ry={34} fill={TOKENS.pearl} opacity={0} style={{ filter: "blur(10px)" }} />
        <path ref={pile} d="M 230 428 Q 270 404 310 428 Z" fill={TOKENS.pearl} opacity={0} style={{ transformBox: "fill-box", transformOrigin: "bottom" }} />
      </Beaker>
      {/* The sugar dish */}
      <path d="M 410 420 Q 460 436 510 420 L 504 430 Q 460 444 416 430 Z" fill="rgba(237,235,255,0.18)" stroke="rgba(237,235,255,0.4)" />
      <path ref={dish} d="M 425 422 Q 460 400 495 422 Z" fill={TOKENS.pearl} fillOpacity={0.9} />
      <text x={460} y={460} textAnchor="middle" className="fill-pearl/55 text-[13px]">
        {grams} g sugar
      </text>

      <ParticleView ref={particles} x={760} y={250} r={120} colors={[TOKENS.signal, TOKENS.pearl]} label="Zoomed in: water (blue) and sugar (white)" />
      {ghostEnd !== undefined && <GhostReadout x={340} y={150} text={`your idea: ${ghostEnd.toFixed(2)} g`} />}
    </svg>
  );
}
