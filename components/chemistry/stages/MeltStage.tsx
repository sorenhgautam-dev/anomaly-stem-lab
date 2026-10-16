"use client";

import { useRef } from "react";
import { TOKENS } from "@/lib/tokens";
import type { StageProps } from "@/components/lab/stages";
import { Beaker, Bench, Thermometer, type LiquidHandle, type ValueHandle } from "../bench";
import { LiveChart, type ChartHandle } from "../LiveChart";
import { ParticleView, type ParticleHandle } from "../ParticleView";
import { useStageFrames } from "../useStageFrames";

/*
 * Stage "melt" — Melting and particles. Ice in a beaker on a hot plate. The
 * heating curve draws itself as it runs, so the 0 °C plateau is plain to
 * see; the student's belief (a steady climb) is dashed beside it. The zoomed
 * view shows the lattice breaking up. Keys: engine/chemistry/melt.ts.
 */

const CUBES = [
  { x: 205, y: 404 },
  { x: 245, y: 412 },
  { x: 228, y: 380 },
  { x: 268, y: 392 },
];

export function MeltStage({ def, build, outcome, ghost }: StageProps) {
  const thermo = useRef<ValueHandle>(null);
  const water = useRef<LiquidHandle>(null);
  const cubes = useRef<(SVGRectElement | null)[]>([]);
  const chart = useRef<ChartHandle>(null);
  const particles = useRef<ParticleHandle>(null);
  const plate = useRef<SVGRectElement>(null);
  const power = typeof build.settings.power === "number" ? build.settings.power : 150;

  useStageFrames(def, build, outcome, (t, v) => {
    thermo.current?.set(v.temperature ?? -10);
    const solid = v.solid ?? 1;
    water.current?.level(0.12 + (1 - solid) * 0.38);
    cubes.current.forEach((c) => {
      const size = 30 * Math.max(0.15, solid);
      c?.setAttribute("width", String(size));
      c?.setAttribute("height", String(size));
      c?.setAttribute("opacity", String(solid > 0.02 ? 0.85 : 0));
    });
    chart.current?.set(outcome ? t : 0);
    particles.current?.set({ order: v.order ?? 1, speed: v.speed ?? 1 });
    plate.current?.setAttribute("opacity", String(outcome ? Math.min(1, (power - 80) / 140) : 0));
  });

  return (
    <svg viewBox="0 0 1000 600" className="size-full" role="img" aria-label={`${def.title}: ice in a beaker on a hot plate, with a thermometer`}>
      <Bench y={500} />
      <rect x={130} y={470} width={240} height={30} rx={8} fill="rgba(237,235,255,0.1)" stroke="rgba(237,235,255,0.25)" />
      <rect ref={plate} x={144} y={462} width={212} height={10} rx={5} fill={TOKENS.anomaly} opacity={0} style={{ filter: "blur(2px)" }} />
      <Beaker ref={water} x={250} y={270} w={170} h={192} level={0.12}>
        {CUBES.map((c, i) => (
          <rect
            key={i}
            ref={(el) => {
              cubes.current[i] = el;
            }}
            x={c.x}
            y={c.y}
            width={30}
            height={30}
            rx={5}
            fill="rgba(237,235,255,0.55)"
            stroke="rgba(237,235,255,0.8)"
          />
        ))}
      </Beaker>
      <Thermometer ref={thermo} x={80} y={200} height={260} min={-20} max={60} />

      <LiveChart
        ref={chart}
        x={470}
        y={90}
        w={300}
        h={200}
        timeline={outcome?.timeline}
        ghost={ghost?.timeline}
        yKey="temperature"
        yMin={-15}
        yMax={60}
        yTicks={[-10, 0, 20, 40, 60]}
        xLabel="time →"
        yLabel="Temperature (°C)"
      />
      <ParticleView ref={particles} x={880} y={190} r={88} colors={[TOKENS.signal, TOKENS.signal]} label="Zoomed in: water particles" />
    </svg>
  );
}
