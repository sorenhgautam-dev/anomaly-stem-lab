"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { useLabUi } from "../lab-ui";
import { labView, setAnchor } from "../lab-state";
import { Beaker3D } from "../kit/chem/glass";
import { Readout } from "../kit/chem/instruments";
import { Scale3D } from "../kit/chem/Scale3D";
import { Spawner } from "../kit/chem/liquid/drip";
import { LiquidFill } from "../kit/chem/liquid/Fill";
import { GhostLabel } from "../kit/chem/liquid/ghost";
import { DissolvingMolecules } from "../kit/chem/liquid/Molecules";
import { latheGeometry, shellGeometry } from "../kit/detail";
import { kitMaterial, ownMaterial } from "../kit/materials";
import { vfx } from "../kit/vfx";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Dissolving sugar, in 3D (stage "dissolve", engine/chemistry/dissolve.ts;
 * DESIGN.md §7.5, §8.1): a beaker of water and a dish of sugar share one
 * digital scale. Run: the dish tips its sugar into the water, the heap on the
 * bottom shrinks as it dissolves, a faint syrupy haze spreads and a rod stirs.
 * The scale reads the simulator's grams the whole time. "Zoom to particles"
 * fades the water into its molecules so you can watch the sugar spread out.
 */

const ON = 0.2; // the scale's platform top
const BX = -0.24; // beaker centre
const R = 0.3;
const H = 0.46;
const WATER = 0.55; // water level before the sugar, as a fraction of the beaker
const DEPTH = H * 0.96;
const LIP = 0.01; // the dish tips over this edge, just inside the beaker's rim
const TOP = ON + 0.5; // the dish rests here, above the rim
const STAND = 0.3; // the dish's pedestal, on the scale
const GHOST_AT: [number, number, number] = [0.12, 0.9, 0];

// Base at y = 0, so heaps and the haze grow up from the bottom.
const CONE = new ConeGeometry(1, 1, 24).translate(0, 0.5, 0);
const COLUMN = new CylinderGeometry(1, 1, 1, 28).translate(0, 0.5, 0);
// The sugar's weighing dish (a shallow sage dish with a real wall) and its lathed white pedestal.
const DISH = shellGeometry([[0, 0], [0.1, 0], [0.128, 0.01], [0.155, 0.042], [0.162, 0.05]], 0.006, 0.006, 40);
const PEDESTAL = latheGeometry([[0.0005, 0], [0.12, 0], [0.126, 0.008], [0.122, 0.034], [0.06, 0.046], [0.042, 0.066], [0.036, TOP - ON - 0.012], [0.05, TOP - ON - 0.002], [0.0005, TOP - ON]], 40);
const ROD = new CapsuleGeometry(0.011, 0.42, 4, 12);
/** Water reads as a faint sage tint. */
const WATER_TINT = `#${new Color(P.white).lerp(new Color(LAB.chemistry.sage), 0.5).getHexString()}`;

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

export function dissolveShots(): StageShots {
  const aim: [number, number, number] = [0, 0.16, 0.12];
  return {
    arrive: orbit(aim, 8.4, 40, 30),
    build: orbit(aim, 4.7, 24),
    predict: orbit(aim, 4.3, 22, 6),
    run: orbit([BX * 0.5, 0.22, 0.1], 3.7, 20, -16),
    // Lower and wider: the result card covers the bottom of the screen, and the scale's screen must show.
    reveal: orbit([0, -0.05, 0.12], 5.0, 16),
    particles: orbit([BX, ON + 0.15, 0], 1.5, 30, 8),
  };
}

export function DissolveStage3D() {
  const grams = useLab((s) => (typeof s.build?.settings.sugar === "number" ? s.build.settings.sugar : 20));
  const tier = useQuality((s) => s.level);
  const zoomed = useLabUi((s) => s.particles);
  const sv = useStageValues();
  const tipper = useRef<Group>(null);
  const inDish = useRef<Mesh>(null);
  const heap = useRef<Mesh>(null);
  const haze = useRef<Mesh>(null);
  const rod = useRef<Group>(null);
  const hazeMaterial = useMemo(() => ownMaterial(P.white, tier, { transparent: true, opacity: 0 }), [tier]);
  const [grains] = useState(() => new Spawner());
  const ghostEnd = sv.ghost?.readings["scale.end"] ?? null;
  const ghostText = ghostEnd !== null ? `Your idea: ${ghostEnd.toFixed(2)} g` : null;
  const realEnd = sv.outcome?.readings["scale.end"] ?? 0;
  const size = 0.6 + (grams / 50) * 0.55; // heap size follows the grams

  const level = (dissolved: number) => WATER + Math.min(0.06, (grams / 50) * 0.06 * dissolved);

  useEffect(() => {
    setAnchor("focus", new Vector3(BX * 0.6, ON + 0.3, 0.2));
    // The prediction floats where the wrong run's ghost reading goes.
    setAnchor("ghost", new Vector3(...GHOST_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  useFrame(() => {
    const v = sv.now();
    const t = sv.t();
    const dissolved = v["sugar.dissolved"] ?? 0;
    const spread = v.spread ?? 0;
    // The dish tips over the rim in the first moments of the run, then settles back.
    const tip = smooth(0, 0.45, t) - smooth(0.95, 1.4, t);
    if (tipper.current) tipper.current.rotation.z = tip * 2.1;
    const poured = smooth(0.15, 0.8, t);
    if (inDish.current) {
      inDish.current.scale.set(0.11 * size, 0.06 * size * Math.max(0.02, 1 - poured), 0.11 * size);
      inDish.current.visible = poured < 0.98;
    }
    // Grains fall from the lip into the water, as many as the sugar poured so far.
    const n = Math.min(6, grains.next(poured * (20 + grams * 1.2)));
    for (let i = 0; i < n; i++) vfx.burst({ at: [LIP - 0.03, TOP + 0.02, 0], kind: "bubble", count: 1, colors: [P.white, LAB.chemistry.bench], speed: [0.1, 0.3], dir: [-0.5, -1, 0], cone: 0.85, life: [0.32, 0.4], size: [0.009, 0.016], spread: 0.05, gravity: 3.5, drag: 0.4 });
    // On the bottom: the heap that has landed and not yet dissolved.
    const left = Math.max(0, smooth(0.4, 1, t) - dissolved);
    if (heap.current) {
      const r = 0.17 * size * (0.45 + left * 0.55);
      heap.current.scale.set(r, 0.1 * size * left, r);
      heap.current.visible = left > 0.01 && !zoomed;
    }
    // Dissolved sugar: a faint haze near the bottom that spreads up through the water.
    if (haze.current) {
      haze.current.scale.set(R * 0.86, DEPTH * level(dissolved) * (0.2 + 0.8 * spread), R * 0.86);
      (haze.current.material as MeshStandardMaterial).opacity = zoomed ? 0 : Math.min(0.45, dissolved * 0.55) * (1 - spread * 0.55);
    }
    if (rod.current) {
      rod.current.rotation.y = Math.min(9.5, Math.max(1, t)) * 4.2;
      rod.current.visible = !zoomed;
    }
  });

  return (
    <group>
      <Scale3D reading={() => sv.now()["scale.grams"] ?? 0} ghost={null} position={[0, 0, 0.05]} width={1.5} />
      <Beaker3D radius={R} height={H} level={() => 0} color={() => P.white} position={[BX, ON, 0]}>
        <LiquidFill radius={R * 0.93} height={DEPTH} level={() => level(sv.now()["sugar.dissolved"] ?? 0)} color={() => WATER_TINT} opacity={() => (zoomed ? 0.1 : 0.6)} />
        <mesh ref={haze} geometry={COLUMN} position={[0, 0.014, 0]} material={hazeMaterial} />
        <mesh ref={heap} geometry={CONE} position={[0, 0.012, 0]} material={kitMaterial("clay", tier, P.white)} />
        {/* A stirring rod leaning in the beaker, below the dish. */}
        <group ref={rod}>
          <mesh geometry={ROD} position={[0.13, 0.22, 0]} rotation={[0, 0, -0.42]} material={kitMaterial("plastic", tier)} />
        </group>
        <DissolvingMolecules on={zoomed} radius={R * 0.86} position={[0, 0.02, 0]} depth={() => DEPTH * level(sv.now()["sugar.dissolved"] ?? 0) - 0.03} sugar={() => (sv.t() > 0.7 ? grams * 1.2 : 0)} dissolved={() => sv.now()["sugar.dissolved"] ?? 0} spread={() => sv.now().spread ?? 0} />
      </Beaker3D>
      {/* The sugar's dish on a pedestal, still on the scale, tipping over the rim. */}
      <mesh geometry={PEDESTAL} position={[STAND, ON, 0]} material={kitMaterial("plastic", tier)} />
      <group ref={tipper} position={[LIP, TOP, 0]}>
        <mesh geometry={DISH} position={[0.17, 0, 0]} material={kitMaterial("satin", tier, LAB.chemistry.sage)} />
        <mesh ref={inDish} geometry={CONE} position={[0.17, 0.008, 0]} material={kitMaterial("clay", tier, P.white)} />
      </group>
      {!zoomed && <Readout text={() => `${grams} g sugar`} height={0.1} position={[STAND + 0.12, ON + 0.17, 0.26]} />}
      {ghostText !== null && <Readout text={() => `Reality: ${realEnd.toFixed(2)} g`} height={0.11} position={[GHOST_AT[0], GHOST_AT[1] + 0.15, 0]} />}
      <GhostLabel text={ghostText} position={GHOST_AT} />
    </group>
  );
}
