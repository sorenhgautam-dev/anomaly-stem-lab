"use client";

import { useRef } from "react";
import { TOKENS } from "@/lib/tokens";
import type { StageProps } from "@/components/lab/stages";
import { sample } from "@/components/lab/playback";
import { Bench, GLASS, GLASS_FILL, Thermometer, type ValueHandle } from "../bench";
import { ParticleView, type ParticleHandle } from "../ParticleView";
import { useStageFrames } from "../useStageFrames";

/*
 * Stage "heat" — Gas particles and heat. A sealed balloon of air on a flask
 * is warmed on a hot plate. The zoomed view shows what the particles do:
 * they speed up; they don't grow or multiply. After a wrong verdict a second,
 * dashed view shows the student's belief. Keys: engine/chemistry/heat.ts.
 */

export function GasHeatStage({ def, build, outcome, ghost }: StageProps) {
  const thermo = useRef<ValueHandle>(null);
  const balloon = useRef<SVGEllipseElement>(null);
  const plate = useRef<SVGRectElement>(null);
  const real = useRef<ParticleHandle>(null);
  const belief = useRef<ParticleHandle>(null);
  const target = typeof build.settings.temperature === "number" ? build.settings.temperature : 80;

  useStageFrames(def, build, outcome, (t, v) => {
    const temp = v.temperature ?? 20;
    thermo.current?.set(temp);
    const volume = v.volume ?? 1;
    const s = Math.cbrt(volume);
    balloon.current?.setAttribute("rx", String(58 * s));
    balloon.current?.setAttribute("ry", String(66 * s));
    balloon.current?.setAttribute("cy", String(206 - 66 * (s - 1)));
    plate.current?.setAttribute("opacity", String(outcome ? Math.min(1, (target - 20) / 70) : 0));
    real.current?.set({ speed: v.speed ?? 1, size: v.size ?? 1, count: v.count ?? 1 });
    if (ghost) {
      const g = sample(ghost.timeline, t);
      belief.current?.set({ speed: g.speed ?? 1, size: g.size ?? 1, count: g.count ?? 1 });
    }
  });

  return (
    <svg viewBox="0 0 1000 600" className="size-full" role="img" aria-label={`${def.title}: a balloon of air on a flask over a hot plate`}>
      <Bench y={500} />
      {/* Hot plate */}
      <rect x={200} y={470} width={240} height={30} rx={8} fill="rgba(237,235,255,0.1)" stroke="rgba(237,235,255,0.25)" />
      <rect ref={plate} x={214} y={462} width={212} height={10} rx={5} fill={TOKENS.anomaly} opacity={0} style={{ filter: "blur(2px)" }} />
      {/* Flask */}
      <path d="M 280 462 L 360 462 L 342 330 L 342 278 L 298 278 L 298 330 Z" fill={GLASS_FILL} stroke={GLASS} strokeWidth={2} strokeLinejoin="round" />
      {/* Balloon on the neck */}
      <ellipse ref={balloon} cx={320} cy={206} rx={58} ry={66} fill="rgba(184,166,255,0.18)" stroke={TOKENS.lilac} strokeWidth={2} />
      <path d="M 306 274 L 334 274 L 328 286 L 312 286 Z" fill="rgba(184,166,255,0.4)" />
      <Thermometer ref={thermo} x={130} y={210} height={250} min={0} max={100} />

      <ParticleView ref={real} x={ghost ? 640 : 730} y={260} r={ghost ? 104 : 124} colors={[TOKENS.signal, TOKENS.signal]} label="Zoomed in: the air particles" />
      {ghost && <ParticleView ref={belief} x={870} y={260} r={104} colors={[TOKENS.lilac, TOKENS.lilac]} label="Your idea" ghost />}
    </svg>
  );
}
