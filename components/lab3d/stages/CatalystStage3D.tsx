"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Flask3D } from "../kit/chem/glass";
import { Readout } from "../kit/chem/instruments";
import { GhostLabel } from "../kit/chem/react/GhostLabel";
import { ClearFlaskLiquid, heapRadius, PowderHeap3D, Vial3D } from "../kit/chem/react/powder";
import { GasSyringe3D } from "../kit/chem/react/syringe";
import { latheGeometry } from "../kit/detail";
import { kitMaterial } from "../kit/materials";
import { vfx } from "../kit/vfx";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Activation energy and catalysts, in 3D (stage "catalyst",
 * engine/chemistry/catalyst.ts; DESIGN.md §7.5, §8.1): a stoppered flask of
 * hydrogen peroxide with a small vial of black manganese dioxide standing
 * in it, and a gas syringe on a stand. Run: the vial tips over, the powder
 * heaps on the bottom and the peroxide fizzes at the model's rate while the
 * syringe's plunger slides out with the oxygen. The heap and its label show
 * the catalyst left; after a wrong run a teal wireframe heap and a dashed
 * label show the guess beside it.
 */

const FLASK_AT: [number, number, number] = [-0.42, 0, -0.02];
const FLASK_SCALE = 0.8;
const FLOOR = 0.014;
// The vial stands at the back and tips to the right; the powder heaps at its mouth, the
// ghost heap sits front-right of it (Ano comes in from the left on an ANOMALY).
const VIAL_AT: [number, number, number] = [FLASK_AT[0] - 0.17, FLOOR, FLASK_AT[2] - 0.05];
const HEAP_AT: [number, number, number] = [FLASK_AT[0] + 0.05, FLOOR, FLASK_AT[2] - 0.03];
const GHOST_HEAP_AT: [number, number, number] = [FLASK_AT[0] + 0.08, FLOOR, FLASK_AT[2] + 0.15];
const SURFACE_Y = 0.16;
const NECK_Y = 1.05 * FLASK_SCALE;
const SYRINGE_AT: [number, number, number] = [0.02, 0.58, FLASK_AT[2]];
// The catalyst's label (and the guess under it) sit right of the flask, under the syringe:
// Ano comes in from the left on an ANOMALY.
const LABEL_AT: [number, number, number] = [0.32, 0.36, FLASK_AT[2] + 0.22];
const GHOST_AT: [number, number, number] = [LABEL_AT[0], LABEL_AT[1] - 0.16, LABEL_AT[2]];

const TUBE = new CatmullRomCurve3(
  ([
    [FLASK_AT[0], NECK_Y + 0.04, FLASK_AT[2]],
    [FLASK_AT[0], NECK_Y + 0.16, FLASK_AT[2]],
    [FLASK_AT[0] + 0.2, NECK_Y + 0.22, FLASK_AT[2]],
    [SYRINGE_AT[0] - 0.16, SYRINGE_AT[1] + 0.12, SYRINGE_AT[2]],
    [SYRINGE_AT[0] - 0.08, SYRINGE_AT[1], SYRINGE_AT[2]],
  ] as [number, number, number][]).map((p) => new Vector3(...p)),
);

// A tapered rubber stopper with a rounded top edge, bored through the middle for the tube.
const STOPPER = latheGeometry([[0.0005, -0.05], [0.102, -0.05], [0.106, -0.045], [0.127, 0.042], [0.122, 0.05], [0.026, 0.05], [0.021, 0.03], [0.0005, 0.03]], 40);

/** How far the powder has poured out of the vial, 0..1, at run time t. */
const poured = (t: number) => Math.max(0, Math.min(1, (t - 0.12) / 0.3));

export function catalystShots(): StageShots {
  // Aim under the middle of the rig, so flask and syringe frame high, clear of the dock.
  const aim: [number, number, number] = [0.18, 0.05, 0.05];
  return {
    arrive: orbit(aim, 8.4, 42, 30),
    build: orbit(aim, 5.0, 22),
    predict: orbit(aim, 4.4, 20, 6),
    run: orbit([0.05, 0.28, 0.05], 4.0, 18, -14),
    reveal: orbit([0.18, -0.06, 0.05], 5.4, 24),
  };
}

export function CatalystStage3D() {
  const tier = useQuality((s) => s.level);
  const sv = useStageValues();
  const spawn = useRef({ bubbles: 0, foam: 0 });
  const tube = useMemo(() => new TubeGeometry(TUBE, 48, 0.016, 8), []);
  useEffect(() => () => tube.dispose(), [tube]);
  const ghostEnd = sv.ghost?.readings["catalyst.end"] ?? null;

  useEffect(() => {
    setAnchor("focus", new Vector3(HEAP_AT[0], 0.18, HEAP_AT[2]));
    setAnchor("ghost", new Vector3(...GHOST_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const v = sv.now();
    const k = poured(sv.t());
    const rate = (v.rate ?? 0) * k;
    const s = spawn.current;
    // Oxygen bubbles off the powder at the model's rate, and foam at the surface.
    s.bubbles += Math.min(90, rate * 11) * dt;
    s.foam += Math.min(40, rate * 4) * dt;
    const r = heapRadius(v.catalyst ?? 0);
    while (s.bubbles >= 1) {
      s.bubbles -= 1;
      vfx.burst({ at: [HEAP_AT[0], FLOOR + r * 0.4, HEAP_AT[2]], kind: "bubble", count: 1, colors: [P.white, LAB.chemistry.sage, P.white], speed: [0.15, 0.35], dir: [0, 1, 0], cone: 0.85, life: [0.45, 0.75], size: [0.014, 0.03], spread: Math.max(0.03, r * 0.8), drag: 1.5 });
    }
    while (s.foam >= 1) {
      s.foam -= 1;
      vfx.burst({ at: [FLASK_AT[0], SURFACE_Y, FLASK_AT[2]], kind: "bubble", count: 1, colors: [P.white, LAB.chemistry.bench], speed: [0.02, 0.08], dir: [0, 1, 0], cone: 0.5, life: [0.6, 1.1], size: [0.016, 0.032], spread: 0.18, drag: 3 });
    }
  });

  const grams = () => (sv.now().catalyst ?? 0) * poured(sv.t());
  const ghostGrams = () => (sv.ghostNow()?.catalyst ?? 0) * poured(sv.t());

  return (
    <group>
      {/* Flask3D's own liquid stays empty: a clearer one shows the powder on the bottom. */}
      <Flask3D position={FLASK_AT} scale={FLASK_SCALE} level={() => 0} color={() => LAB.chemistry.sage}>
        <ClearFlaskLiquid level={0.48} color={LAB.chemistry.sage} />
      </Flask3D>
      <Vial3D position={VIAL_AT} tip={() => sv.t() / 0.4} grams={() => sv.now().catalyst ?? 0} />
      <PowderHeap3D position={HEAP_AT} grams={grams} />
      {ghostEnd !== null && <PowderHeap3D position={GHOST_HEAP_AT} grams={ghostGrams} ghost />}
      {/* The stopper and the rubber tube to the syringe. */}
      <mesh geometry={STOPPER} position={[FLASK_AT[0], NECK_Y - 0.005, FLASK_AT[2]]} material={kitMaterial("rubber", tier)} />
      <mesh geometry={tube} material={kitMaterial("rubber", tier)} />
      <GasSyringe3D position={SYRINGE_AT} ml={() => sv.now().o2 ?? 0} />
      <Readout text={() => `MnO₂ ${(sv.now().catalyst ?? 0).toFixed(2)} g`} height={0.1} position={LABEL_AT} />
      <GhostLabel text={ghostEnd === null ? null : `Your idea: ${ghostEnd.toFixed(2)} g left`} position={GHOST_AT} />
    </group>
  );
}
