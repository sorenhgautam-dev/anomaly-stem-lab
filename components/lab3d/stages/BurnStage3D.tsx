"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, Vector3 } from "three";
import { useLab } from "@/lib/store";
import { PALETTE as P } from "@/lib/tokens";
import { useLabUi } from "../lab-ui";
import { labView, setAnchor } from "../lab-state";
import { Battery9V3D, Jar3D, JAR, SteelWool3D } from "../kit/chem/react/burn-parts";
import { GhostLabel } from "../kit/chem/react/GhostLabel";
import { MoleculeCloud, O2_SHAPE } from "../kit/chem/react/molecules";
import { Readout } from "../kit/chem/instruments";
import { Scale3D } from "../kit/chem/Scale3D";
import { vfx } from "../kit/vfx";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Burning in open vs sealed containers, in 3D (stage "burn",
 * engine/chemistry/burn.ts; DESIGN.md §7.5, §8.1): a glass jar of steel
 * wool on a digital scale, a 9 V battery's leads reaching in. Run: a spark,
 * then the wool glows orange and throws sparks at the model's burn rate and
 * turns black. Open: air drifts in through the mouth and the reading
 * climbs. Sealed: the jar's own oxygen molecules thin out and the reading
 * holds. After a wrong run a dashed ghost of the guess sits by the screen.
 */

const SCALE_AT: [number, number, number] = [-0.12, 0, 0.1];
const JAR_AT: [number, number, number] = [SCALE_AT[0], 0.2, SCALE_AT[2] - 0.02];
const WOOL_AT: [number, number, number] = [JAR_AT[0], JAR_AT[1] + 0.11, JAR_AT[2]];
const MOUTH_Y = JAR_AT[1] + JAR.neck;
/** Beside the scale's screen, so the guess and the reading sit side by side. */
const GHOST_AT: [number, number, number] = [0.58, 0.3, SCALE_AT[2] + 0.56];
/** g of oxygen in the jar's litre of air at 20 °C (as in engine/chemistry/burn.ts). */
const JAR_AIR_O2_G = 0.279;
const IGNITE_AT = 0.5;
const O2_IN_JAR = 34;

// The leads run down the back of the jar to the wool's edge, clear of the view.
const CONTACT: [number, number, number] = [WOOL_AT[0] + 0.1, WOOL_AT[1] + 0.03, WOOL_AT[2] - 0.08];
const lead = (dz: number, dx: number): [number, number, number][] => [
  [0.84 + dx, 0.3, 0.17],
  [0.82 + dx, 0.62, 0.16 + dz],
  [0.5, 1.02, 0.1 + dz],
  [JAR_AT[0] + 0.22, 1.0, JAR_AT[2] - 0.06 + dz],
  [JAR_AT[0] + 0.14 + dx * 0.5, MOUTH_Y, JAR_AT[2] - 0.1 + dz],
  [CONTACT[0] + dx * 0.5, CONTACT[1], CONTACT[2] + dz],
];
const LEADS: [[number, number, number][], [number, number, number][]] = [lead(0.035, -0.04), lead(-0.035, 0.04)];

export function burnShots(): StageShots {
  // The aim sits under the jar so it frames high, clear of the dock.
  const aim: [number, number, number] = [0.1, 0.06, 0.1];
  return {
    arrive: orbit(aim, 8.4, 42, 30),
    build: orbit(aim, 5.0, 24),
    predict: orbit(aim, 4.6, 22, 6),
    run: orbit([0.02, 0.22, 0.1], 4.1, 20, -18),
    reveal: orbit([0.1, -0.08, 0.1], 5.9, 26),
    particles: orbit([JAR_AT[0], 0.44, JAR_AT[2]], 1.4, 18, 8),
  };
}

export function BurnStage3D() {
  const sealed = useLab((s) => s.build?.settings.sealed === true);
  const grams = useLab((s) => (typeof s.build?.settings.wool === "number" ? s.build.settings.wool : 2));
  const zoomed = useLabUi((s) => s.particles);
  const sv = useStageValues();
  const spawn = useRef({ sparks: 0, smoke: 0, air: 0, lastT: 0 });
  const o2 = useMemo(() => new MeshStandardMaterial({ color: P.volt[300], roughness: 0.3, emissive: P.volt[100], emissiveIntensity: 0.2 }), []);
  useEffect(() => () => o2.dispose(), [o2]);
  const ghostEnd = sv.ghost?.readings["scale.end"] ?? null;
  const usedEnd = sv.outcome?.readings["oxygen.used"] ?? 0;
  const oxideEnd = sv.outcome?.timeline?.at(-1)?.values.oxide ?? 0;

  useEffect(() => {
    setAnchor("focus", new Vector3(JAR_AT[0], 0.5, JAR_AT[2]));
    // The prediction's ghost floats where the wrong run's ghost reading goes.
    setAnchor("ghost", new Vector3(...GHOST_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const v = sv.now();
    const t = sv.t();
    const glow = v.glow ?? 0;
    const s = spawn.current;
    // The battery's touch: one bright spark as the run reaches ignition.
    if (s.lastT < IGNITE_AT && t >= IGNITE_AT) vfx.burst({ at: CONTACT, kind: "spark", count: 22, colors: [P.apricot[300], P.white, P.apricot[500]], speed: [0.5, 1.3], life: [0.2, 0.45], size: [0.008, 0.014], gravity: 1.5, drag: 1.5 });
    s.lastT = t;
    // Burning: sparks off the wool at the model's rate.
    s.sparks += glow * 55 * dt;
    while (s.sparks >= 1) {
      s.sparks -= 1;
      vfx.burst({ at: WOOL_AT, kind: "spark", count: 1, colors: [P.apricot[400], P.apricot[500], P.flame[400], P.apricot[200]], speed: [0.3, 0.9], dir: [0, 1, 0], cone: 0.3, life: [0.25, 0.6], size: [0.01, 0.018], spread: 0.1, gravity: 1.4, drag: 1.2 });
    }
    // Smoke: out of the mouth when open, a short-lived haze trapped inside when sealed.
    s.smoke += glow * (sealed ? 5 : 8) * dt;
    while (s.smoke >= 1) {
      s.smoke -= 1;
      if (sealed) vfx.burst({ at: [WOOL_AT[0], WOOL_AT[1] + 0.12, WOOL_AT[2]], kind: "smoke", count: 1, colors: [P.grape[300], P.ink[300]], speed: [0.04, 0.12], dir: [0, 1, 0], cone: 0.6, life: [0.8, 1.3], size: [0.08, 0.14], spread: 0.08, grow: 0.08, drag: 1.5 });
      else vfx.burst({ at: [JAR_AT[0], MOUTH_Y - 0.05, JAR_AT[2]], kind: "smoke", count: 1, colors: [P.grape[300], P.ink[300]], speed: [0.2, 0.4], dir: [0, 1, 0], cone: 0.85, life: [1.4, 2.2], size: [0.1, 0.16], spread: 0.1, grow: 0.12, drag: 0.6 });
    }
    // Open jar: fresh air (oxygen) drifts in from the room while it burns.
    if (!sealed) s.air += glow * 18 * dt;
    while (s.air >= 1) {
      s.air -= 1;
      vfx.burst({ at: [JAR_AT[0], MOUTH_Y + 0.32, JAR_AT[2]], kind: "glow", count: 1, colors: [P.volt[300], P.volt[400]], speed: [0.3, 0.5], dir: [0, -1, 0], cone: 0.92, life: [0.9, 1.3], size: [0.03, 0.05], spread: 0.16, drag: 0.3 });
    }
  });

  // Oxygen molecules left in the jar: the sealed jar's own air is used up as the iron oxidises.
  const o2Left = () => {
    if (!sealed || oxideEnd <= 0) return 1;
    const used = usedEnd * ((sv.now().oxide ?? 0) / oxideEnd);
    return Math.max(0, 1 - used / JAR_AIR_O2_G);
  };

  return (
    <group>
      <Scale3D reading={() => sv.now()["scale.grams"] ?? 0} ghost={null} position={SCALE_AT} />
      <GhostLabel text={ghostEnd === null ? null : `Your idea: ${ghostEnd.toFixed(2)} g`} position={GHOST_AT} />
      <Jar3D sealed={sealed} position={JAR_AT}>
        <MoleculeCloud shape={O2_SHAPE} material={o2} count={() => O2_IN_JAR * o2Left()} radius={JAR.radius} height={JAR.height - 0.06} size={zoomed ? 0.018 : 0.011} speed={zoomed ? 0.6 : 1} max={O2_IN_JAR} position={[0, 0.04, 0]} />
      </Jar3D>
      {/* The wad grows with the grams of wool (2 g is the model's default). */}
      <group position={WOOL_AT} scale={Math.cbrt(grams / 2)}>
        <SteelWool3D oxide={() => sv.now().oxide ?? 0} glow={() => sv.now().glow ?? 0} />
      </group>
      <Battery9V3D position={[0.84, 0, 0.17]} leads={LEADS} />
      <Readout key={sealed ? "sealed" : "open"} text={() => (sealed ? "Lid on: sealed" : "Open to the room")} height={0.1} position={[JAR_AT[0], MOUTH_Y + (sealed ? 0.24 : 0.2), JAR_AT[2]]} />
    </group>
  );
}
