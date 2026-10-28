"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Color, Vector3 } from "three";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Flask3D } from "../kit/chem/glass";
import { Readout } from "../kit/chem/instruments";
import { Burette3D } from "../kit/chem/liquid/Burette";
import { ColourChart, type ChartRow } from "../kit/chem/liquid/ColourChart";
import { universalAtPh, universalColour, universalName } from "../kit/chem/liquid/colours";
import { drip, Spawner } from "../kit/chem/liquid/drip";
import { GhostLabel } from "../kit/chem/liquid/ghost";
import { PhMeter3D } from "../kit/chem/liquid/PhMeter";
import { kitMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Neutralisation and pH, in 3D (stage "neutralise", engine/chemistry/
 * neutralise.ts; DESIGN.md §7.5, §8.1): a flask of hydrochloric acid with
 * universal indicator under a burette of sodium hydroxide, a pH meter with
 * its probe in the flask, and a universal indicator chart. Run: the tap
 * turns, drops fall at the simulator's rate (none for 0 mL), the burette
 * empties as the flask fills, and the liquid's colour, the meter and the
 * chart's pointer all follow the simulator's pH. After a wrong run a ghost
 * pointer and a dashed label show the pH the student expected.
 */

const FX = -0.28; // flask (and the burette above it)
const FLASK = 0.52; // flask scale
const TIP: [number, number, number] = [FX, 0.6, 0];
const BURETTE_ML = 50;
const METER: [number, number, number] = [0.2, 0, 0.06];
const CHART: [number, number, number] = [0.74, 0.37, -0.05];
const GHOST_AT: [number, number, number] = [0.56, 0.86, 0];
// The picked option floats here before the run; it's wide, so it sits nearer the middle.
const IDEA_AT: [number, number, number] = [0.3, 0.86, 0];

/** pH 1 (bottom) to 14 (top), each chip the universal indicator's colour. */
const ROWS: ChartRow[] = Array.from({ length: 14 }, (_, i) => {
  const ph = i + 1;
  const label = ph === 1 ? "1 acid" : ph === 7 ? "7 neutral" : ph === 14 ? "14 base" : undefined;
  return { colours: [`#${universalAtPh(ph, new Color()).getHexString()}`], label };
});

const flaskLevel = (ml: number) => 0.5 + 0.4 * Math.min(1, ml / 40);
const tint = new Color();

export function neutraliseShots(): StageShots {
  // A titration reads best from the side, at bench height.
  const aim: [number, number, number] = [0.08, 0.4, 0.1];
  return {
    arrive: orbit(aim, 8.8, 34, 30),
    build: orbit(aim, 4.6, 14),
    predict: orbit(aim, 4.3, 12, 6),
    run: orbit([-0.08, 0.5, 0.1], 3.9, 10, -12),
    // The result card covers the bottom of the screen: keep the flask, meter and chart above it.
    reveal: orbit([0.1, 0.02, 0.1], 4.8, 10),
  };
}

export function NeutraliseStage3D() {
  const base = useLab((s) => (typeof s.build?.settings.base === "number" ? s.build.settings.base : 10));
  const tier = useQuality((s) => s.level);
  const sv = useStageValues();
  const [drops] = useState(() => new Spawner());
  const ghostPh = sv.ghost?.readings.ph ?? null;
  const ghostText = ghostPh !== null ? `Your idea: pH ${ghostPh.toFixed(1)}` : null;

  useEffect(() => {
    // Above the flask's neck: Ano stops short of the focus, so a higher one keeps him off the flask.
    setAnchor("focus", new Vector3(FX + 0.1, 0.75, 0.1));
    setAnchor("ghost", new Vector3(...IDEA_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  const colour = () => `#${universalColour(sv.now().hue ?? 0, tint).getHexString()}`;

  useFrame(() => {
    const v = sv.now();
    const added = v.base ?? 0;
    // A drop for every ~0.8 mL the burette lets out, falling to the flask's surface.
    const n = Math.min(3, drops.next(added * 1.25));
    if (n > 0) {
      const surface = FLASK * (0.015 + 0.36 * 1.1 * flaskLevel(added));
      const splash = colour();
      for (let i = 0; i < n; i++) drip([TIP[0], TIP[1] - 0.005, TIP[2]], TIP[1] - surface, P.white, splash, 0.016);
    }
  });

  const dripping = () => {
    const t = sv.t();
    return base > 0 && t > 0.4 && t < 8.6 ? 1 : 0;
  };

  return (
    <group>
      <Flask3D scale={FLASK} level={() => flaskLevel(sv.now().base ?? 0)} color={colour} position={[FX, 0, 0]} />
      <Burette3D position={TIP} bench={TIP[1]} standX={-0.36} level={() => 0.92 - ((sv.now().base ?? 0) / BURETTE_ML) * 0.85} open={dripping} />
      <Readout text={() => `${Math.round(sv.now().base ?? 0).toString().padStart(2)} mL NaOH`} height={0.075} position={[FX + 0.25, TIP[1] + 0.36, 0]} />
      <Readout text={() => `Flask: ${universalName(sv.now().hue ?? 0).padEnd(6)}`} height={0.075} position={[FX, 0.06, 0.34]} />
      <PhMeter3D ph={() => sv.now().ph ?? 1} position={METER} probe={[FX + 0.045 - METER[0], 0.66, -METER[2]]} depth={0.52} />
      {/* The chart stands in a foot on the bench, like the indicator's. */}
      <RoundedBox args={[0.58, 0.05, 0.16]} radius={0.02} smoothness={3} position={[CHART[0], 0.025, CHART[2]]} material={kitMaterial("plastic", tier)} />
      <ColourChart rows={ROWS} rowHeight={0.042} chipWidth={0.14} labelWidth={0.3} side={-1} at={() => (sv.now().ph ?? 1) - 1} ghostAt={ghostPh !== null ? ghostPh - 1 : null} position={CHART} />
      <GhostLabel text={ghostText} position={GHOST_AT} />
    </group>
  );
}
