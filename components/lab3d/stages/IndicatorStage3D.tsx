"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Color, Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Beaker3D } from "../kit/chem/glass";
import { Readout } from "../kit/chem/instruments";
import { ColourChart, type ChartRow } from "../kit/chem/liquid/ColourChart";
import { CABBAGE_FAMILIES, cabbageColour, cabbageName } from "../kit/chem/liquid/colours";
import { drip, Spawner } from "../kit/chem/liquid/drip";
import { Dropper3D } from "../kit/chem/liquid/Dropper";
import { GhostLabel } from "../kit/chem/liquid/ghost";
import { kitMaterial, ownMaterial } from "../kit/materials";
import { IndicatorBottle3D } from "../kit/chem/liquid/Bottle";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Indicator colours, in 3D (stage "indicator", engine/chemistry/indicator.ts;
 * DESIGN.md §7.5, §8.1 "colour-change swirls in liquids"): a beaker of one
 * household liquid, a bottle of red cabbage indicator and a colour chart.
 * Run: the dropper lifts out of the bottle, lets four drops fall, a purple
 * slick spreads on the surface and the whole liquid turns the simulator's
 * colour. A label names the colour (and the pH once mixed), and the chart's
 * pointer moves to acid, neutral or base; a wrong run's idea gets a ghost pointer.
 */

const BX = -0.06; // beaker
const R = 0.27;
const H = 0.5;
const LEVEL = 0.62;
const SURFACE = 0.012 + LEVEL * H * 0.96;
const TIP: [number, number, number] = [BX - 0.05, H + 0.07, 0]; // the dropper's tip over the beaker
const BOTTLE: [number, number, number] = [-0.68, 0, -0.04];
const CHART_X = 0.62;
const GHOST_AT: [number, number, number] = [0.4, 0.78, 0];
// The picked option floats here before the run; it's wide, so it sits nearer the middle.
const IDEA_AT: [number, number, number] = [0.15, 0.8, 0];

/** The liquid's own look before the indicator goes in: pale lemon, faintly tinted water, clear or milky white. */
const tinted = (c: string, k: number) => `#${new Color(P.white).lerp(new Color(c), k).getHexString()}`;
const TINT: Record<string, string> = { lemon: tinted(LAB.chemistry.gold, 0.55), vinegar: tinted(LAB.chemistry.gold, 0.18), water: tinted(LAB.chemistry.sage, 0.4), "baking-soda": P.white, soap: P.white };

// The chart's chips are red cabbage's real colours: data, so they keep them in Chemistry's palette.
const ROWS: ChartRow[] = [
  { colours: [P.flame[500], P.flame[300]], label: "acid" },
  { colours: [P.grape[500]], label: "neutral" },
  { colours: [P.volt[500], P.verify[500]], label: "base" },
];

/** Text centred in a fixed width (Martian Mono), so a label's board keeps one size as it changes. */
const fit = (text: string, width: number) => {
  const pad = Math.max(0, width - text.length);
  return " ".repeat(Math.floor(pad / 2)) + text + " ".repeat(Math.ceil(pad / 2));
};
const family = (hue: number) => (hue >= 300 ? 0 : hue >= 250 ? 1 : 2);
const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const base = new Color();
const dye = new Color();

export function indicatorShots(): StageShots {
  const aim: [number, number, number] = [0.06, 0.06, 0.12];
  return {
    arrive: orbit(aim, 8.2, 40, 30),
    build: orbit(aim, 4.4, 22),
    predict: orbit(aim, 4.0, 20, 6),
    run: orbit([BX + 0.04, 0.22, 0.1], 3.9, 16, -14),
    reveal: orbit([0.06, -0.04, 0.12], 4.3, 24),
  };
}

export function IndicatorStage3D() {
  const def = useLab((s) => s.def)!;
  const liquid = useLab((s) => (typeof s.build?.settings.liquid === "string" ? s.build.settings.liquid : "soap"));
  const tier = useQuality((s) => s.level);
  const sv = useStageValues();
  const dropper = useRef<Group>(null);
  const slick = useRef<Mesh>(null);
  const slickMaterial = useMemo(() => ownMaterial(P.grape[500], tier, { transparent: true, opacity: 0 }), [tier]);
  const [drops] = useState(() => new Spawner());
  const control = def.controls?.find((c) => c.id === "liquid");
  const options = control?.type === "choice" ? control.options : [];
  const name = options.find((o) => o.value === liquid)?.label ?? liquid;
  const ghostFamily = sv.ghost ? CABBAGE_FAMILIES[sv.ghost.readings["indicator.category"] ?? 1] : null;
  const ghostText = ghostFamily ? `Your idea: ${ghostFamily.name.toLowerCase()}` : null;

  useEffect(() => {
    setAnchor("focus", new Vector3(BX, 0.35, 0.1));
    setAnchor("ghost", new Vector3(...IDEA_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  // The liquid's colour now: its own tint, blended into the indicator's colour as it mixes in.
  const colour = () => {
    const v = sv.now();
    cabbageColour(v.hue ?? 270, dye);
    return `#${base.set(TINT[liquid] ?? P.white).lerp(dye, v.mix ?? 0).getHexString()}`;
  };

  useFrame(() => {
    const t = sv.t();
    // The dropper lifts out of the bottle, arcs over the beaker, lets four drops go and goes back.
    const k = smooth(0, 0.35, t) - smooth(1.3, 1.9, t);
    const g = dropper.current;
    if (g) g.position.set(BOTTLE[0] + (TIP[0] - BOTTLE[0]) * k, 0.08 + (TIP[1] - 0.08) * k + Math.sin(k * Math.PI) * 0.25, BOTTLE[2] * (1 - k));
    const n = Math.min(4, drops.next(Math.max(0, Math.min(4, (t - 0.1) / 0.18))));
    for (let i = 0; i < n; i++) drip([TIP[0], TIP[1] - 0.01, TIP[2]], TIP[1] - 0.01 - SURFACE, P.grape[500], P.grape[300]);
    // A purple slick spreads on the surface where the drops land, then mixes in.
    const s = slick.current;
    if (s) {
      const spread = smooth(0.65, 2.2, t);
      s.visible = t > 0.6 && t < 3.6;
      s.scale.set(0.04 + spread * R * 0.85, 0.012, 0.04 + spread * R * 0.85);
      const m = s.material as MeshStandardMaterial;
      cabbageColour(sv.now().hue ?? 270, m.color);
      m.opacity = 0.85 * (1 - smooth(1.2, 3.5, t));
    }
  });

  // The liquid's name, then the colour's name, and its pH once mixed in: one board size for every liquid.
  const width = Math.max(16, ...options.map((o) => o.label.length));
  const label = () => {
    const v = sv.now();
    const mix = v.mix ?? 0;
    const hue = v.hue ?? 270;
    const line = !sv.outcome || mix < 0.05 ? "" : mix < 0.99 ? cabbageName(hue) : `${cabbageName(hue)} · pH ${(v.ph ?? 7).toFixed(1)}`;
    return `${fit(name, width)}\n${fit(line, width)}`;
  };

  return (
    <group>
      <Beaker3D radius={R} height={H} level={() => LEVEL} color={colour} position={[BX, 0, 0]}>
        <mesh ref={slick} position={[0, SURFACE, 0]} material={slickMaterial} renderOrder={3}>
          <sphereGeometry args={[1, 24, 12]} />
        </mesh>
      </Beaker3D>
      <Readout text={label} height={0.085} position={[BX, 0.1, R + 0.16]} />
      {/* The indicator: a little bottle of red cabbage juice, and its dropper. */}
      <IndicatorBottle3D color={P.grape[500]} position={BOTTLE} />
      <group ref={dropper} position={[BOTTLE[0], 0.08, BOTTLE[2]]}>
        <Dropper3D color={P.grape[500]} squeeze={() => {
          const t = sv.t() - 0.1;
          return t > 0 && t < 0.72 ? 0.5 - 0.5 * Math.cos((t / 0.18) * Math.PI * 2) : 0;
        }} />
      </group>
      <Readout text={() => "Red cabbage"} height={0.08} position={[BOTTLE[0], 0.06, BOTTLE[2] + 0.2]} />
      <RoundedBox args={[0.5, 0.05, 0.16]} radius={0.02} smoothness={3} position={[CHART_X, 0.025, -0.06]} material={kitMaterial("plastic", tier)} />
      <ColourChart rows={ROWS} rowHeight={0.15} side={-1} at={() => (sv.outcome && (sv.now().mix ?? 0) > 0.3 ? family(sv.now().hue ?? 270) : null)} ghostAt={sv.ghost?.readings["indicator.category"] ?? null} position={[CHART_X, 0.33, -0.06]} />
      <GhostLabel text={ghostText} position={GHOST_AT} />
    </group>
  );
}
