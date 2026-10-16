"use client";

import { useRef } from "react";
import { TOKENS } from "@/lib/tokens";
import type { StageProps } from "@/components/lab/stages";
import { Bench, GLASS, GLASS_FILL, GhostReadout, Scale, type ValueHandle } from "../bench";
import { ParticleView, type ParticleHandle } from "../ParticleView";
import { useStageFrames } from "../useStageFrames";

/*
 * Stage "burn" — Burning in open vs sealed containers. Steel wool burns in a
 * jar on a scale. Open: oxygen from the room joins the iron and the reading
 * goes up. Sealed: the oxygen was inside all along, so it can't change.
 * Keys: engine/chemistry/burn.ts.
 */

export function BurnStage({ def, build, outcome, ghost }: StageProps) {
  const scale = useRef<ValueHandle>(null);
  const glow = useRef<SVGEllipseElement>(null);
  const wool = useRef<SVGPathElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const sealed = build.settings.sealed === true;

  useStageFrames(def, build, outcome, (_t, v) => {
    scale.current?.set(v["scale.grams"] ?? 0);
    const g = outcome ? (v.glow ?? 0) : 0;
    glow.current?.setAttribute("opacity", String(Math.min(1, g * 1.2)));
    const oxide = v.oxide ?? 0;
    wool.current?.setAttribute("stroke", oxide > 0.05 ? "rgba(140,140,150,0.95)" : "rgba(237,235,255,0.75)");
    particles.current?.set({ mix: Math.min(0.6, oxide * 1.2), spread: 1, speed: 1 + g * 0.8, count: sealed ? 1 : 1.2 });
  });

  const ghostEnd = ghost?.readings["scale.end"];
  // A tangle of steel wool, drawn as a loose scribble.
  const tangle = "M 300 410 c 20 -30 50 10 30 -20 s -40 -10 -10 -25 s 50 15 25 25 s -35 15 5 20 s 40 -25 20 -30 s -50 5 -20 15";

  return (
    <svg viewBox="0 0 1000 600" className="size-full" role="img" aria-label={`${def.title}: steel wool burning in a jar on a scale`}>
      <Bench y={500} />
      <Scale ref={scale} x={330} y={430} width={320} />
      {/* Jar */}
      <rect x={235} y={250} width={190} height={180} rx={20} fill={GLASS_FILL} stroke={GLASS} strokeWidth={2} />
      {sealed ? (
        <rect x={228} y={236} width={204} height={22} rx={8} fill="rgba(61,123,255,0.35)" stroke={TOKENS.signal} />
      ) : (
        <text x={330} y={232} textAnchor="middle" className="fill-pearl/50 text-[13px]">
          Open to the room
        </text>
      )}
      <ellipse ref={glow} cx={330} cy={392} rx={70} ry={40} fill={TOKENS.resolve} opacity={0} style={{ filter: "blur(14px)" }} />
      <path ref={wool} d={tangle} fill="none" stroke="rgba(237,235,255,0.75)" strokeWidth={2.2} strokeLinecap="round" />

      <ParticleView ref={particles} x={760} y={250} r={120} colors={[TOKENS.pearl, TOKENS.signal]} label="Zoomed in: oxygen (white) joining iron (blue)" />
      {ghostEnd !== undefined && <GhostReadout x={330} y={170} text={`your idea: ${ghostEnd.toFixed(2)} g`} />}
    </svg>
  );
}
