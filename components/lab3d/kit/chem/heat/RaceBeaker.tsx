"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, MeshBasicMaterial, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import type { StageValues } from "../../../useStageValues";
import { kitMaterial, liquidMaterial } from "../../materials";
import { Beaker3D } from "../glass";
import { HotPlate3D, Readout, Thermometer3D } from "../instruments";
import { IceCubes, type Cube } from "./IceCubes";
import { bubble, Emitter, steam, waterTint } from "./tick";
import type { Snapshot } from "./useSnapshot";

/*
 * One lane of the fizzy-tablet race (stage "rate"): a beaker of water on a
 * hot plate (off for the cold one, which has ice floating in it), a
 * thermometer, and a white tablet on the bottom that shrinks as it reacts
 * while bubbles rise at the simulator's fizz strength. A glass label says
 * when it is done. After a wrong run a wire volt tablet shows where the
 * student's idea says the tablet would be.
 */

const R = 0.23;
const H = 0.44;
const DEPTH = 0.3;
/** Hot plate surface. */
const TOP = 0.13;
const WATER = new CylinderGeometry(R * 0.93, R * 0.93, DEPTH, 32).translate(0, DEPTH / 2 + 0.012, 0);
const TABLET = new CylinderGeometry(0.085, 0.085, 0.035, 28).translate(0, 0.0175, 0);
const ICE: Cube[] = [
  [-0.07, 0, 0.04, 0.075, 0.4],
  [0.06, 0, -0.05, 0.07, 1.3],
];

/** Centre `text` in a fixed 13-character line (the label font is monospaced). */
function centre(text: string): string {
  const pad = Math.max(0, 13 - text.length);
  return " ".repeat(Math.floor(pad / 2)) + text + " ".repeat(Math.ceil(pad / 2));
}

export function RaceBeaker({ side, label, celsius, x, sv, snap }: { side: "cold" | "hot"; label: string; celsius: number; x: number; sv: StageValues; snap: Snapshot }) {
  const tier = useQuality((s) => s.level);
  const tablet = useRef<Mesh>(null);
  const ghostTablet = useRef<Mesh>(null);
  const [fizz] = useState(() => new Emitter());
  const [puffs] = useState(() => new Emitter());
  const wire = useMemo(() => new MeshBasicMaterial({ color: P.volt[500], wireframe: true, transparent: true, opacity: 0.7, depthWrite: false }), []);
  useEffect(() => () => wire.dispose(), [wire]);
  const hot = side === "hot";
  const remaining = `${side}.remaining`;
  const fizzKey = `${side}.bubbles`;
  const finish = sv.outcome?.readings[`${side}.finish`] ?? 0;
  const low = tier === "low" ? 0.35 : 1;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const v = snap.now;
    const left = sv.outcome ? (v[remaining] ?? 1) : 1;
    const t = tablet.current;
    if (t) {
      t.scale.setScalar(Math.cbrt(Math.max(0, left)));
      t.visible = left > 0.004;
    }
    const g = snap.ghost;
    const gt = ghostTablet.current;
    if (gt) {
      const gl = g?.[remaining] ?? 0;
      gt.scale.setScalar(Math.cbrt(Math.max(0, gl)) * 1.04);
      gt.visible = !!g && gl > 0.004;
    }
    // Bubbles at the simulator's fizz strength, rising from the tablet.
    const strength = sv.outcome && left > 0.004 ? (v[fizzKey] ?? 0) : 0;
    for (let n = fizz.due(strength * 120 * low, dt); n > 0; n--) bubble([x, TOP + 0.05, 0], DEPTH, 0.05 + 0.03 * strength);
    if (hot) for (let n = puffs.due(((celsius - 40) / 50) * 8 * low, dt); n > 0; n--) steam([x, TOP + DEPTH + 0.04, 0], R * 0.6);
  });

  // Every state is two lines of the same width: a label that changes size would need a new texture.
  const status = () => {
    const state = !sv.outcome || sv.t() <= 0 ? "ready" : (snap.now[remaining] ?? 1) > 0.004 ? "fizzing…" : `done in ${Math.round(finish)} s`;
    return `${centre(label)}\n${centre(state)}`;
  };

  return (
    <group>
      <HotPlate3D power={() => (hot ? Math.max(0, (celsius - 30) / 70) : 0)} size={0.62} position={[x, 0, 0]}>
        <Beaker3D radius={R} height={H} level={() => 0} color={() => P.white}>
          <mesh geometry={WATER} material={liquidMaterial(waterTint(celsius), tier, 0.42)} />
          <mesh ref={tablet} geometry={TABLET} material={kitMaterial("plastic", tier)} position={[0, 0.014, 0]} />
          <mesh ref={ghostTablet} geometry={TABLET} material={wire} position={[0, 0.014, 0]} visible={false} />
          {!hot && <IceCubes cubes={ICE} left={() => 1} top={() => DEPTH + 0.012} />}
          <group position={[hot ? 0.1 : -0.1, 0.02, -0.09]} rotation={[0, 0, hot ? -0.1 : 0.1]}>
            <Thermometer3D celsius={() => celsius} min={0} max={100} height={0.56} />
          </group>
        </Beaker3D>
      </HotPlate3D>
      <Readout text={status} height={0.075} position={[x, 0.98, 0]} />
    </group>
  );
}
