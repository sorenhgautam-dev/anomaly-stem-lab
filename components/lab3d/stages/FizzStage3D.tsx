"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group, type Mesh } from "three";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { useLabUi } from "../lab-ui";
import { labView, setAnchor } from "../lab-state";
import { GasCloud, ZipBag3D } from "../kit/chem/bag";
import { Beaker3D } from "../kit/chem/glass";
import { Scale3D, scaleGhostAt } from "../kit/chem/Scale3D";
import { Graph3D } from "../kit/Graph3D";
import { kitMaterial, liquidMaterial } from "../kit/materials";
import { vfx } from "../kit/vfx";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Mass in a sealed bag, in 3D (stage "fizz", engine/chemistry/fizz.ts): a zip
 * bag on a digital scale, a cup of vinegar and a heap of baking soda inside.
 * Run: the cup tips, the vinegar spreads and fizzes, CO₂ fills the bag
 * (sealed: it puffs up and the scale holds) or drifts out of the open zip
 * (the reading drops). A live graph of the mass floats above the bench.
 * "Zoom to particles" dives in to watch the molecules.
 */

const MAX_BAG_ML = 2800;
const ON_SCALE = 0.2;

// The bag stands tall on the scale, so it gets its own, wider shots: the
// aim sits just under the bag so it frames in the clear middle above the dock.
export function fizzShots(): StageShots {
  const aim: [number, number, number] = [0, 0.12, 0.1];
  return {
    arrive: orbit(aim, 8.6, 44, 32),
    build: orbit(aim, 5.5, 32),
    predict: orbit(aim, 5.1, 31, 6),
    run: orbit([0, 0.2, 0.1], 4.6, 28, -16),
    reveal: orbit(aim, 5.8, 34),
    particles: orbit([0, 0.42, 0], 1.25, 22, 12),
  };
}

/** Where the balance stands on the bench. */
const SCALE_AT: [number, number, number] = [0, 0, 0.1];

export function FizzStage3D() {
  const sealed = useLab((s) => s.build?.settings.sealed === true);
  const tier = useQuality((s) => s.level);
  const zoomed = useLabUi((s) => s.particles);
  const sv = useStageValues();
  const cup = useRef<Group>(null);
  const puddle = useRef<Mesh>(null);
  const soda = useRef<Mesh>(null);
  const spawn = useRef({ bubbles: 0, gas: 0, lastEscaped: 0 });
  const ghostEnd = sv.ghost?.readings["scale.end"] ?? null;

  useEffect(() => {
    setAnchor("focus", new Vector3(0, 0.5, 0.05));
    // The prediction's ghost floats where the wrong run's ghost label goes: in front of the balance (Scale3D), not over the bag.
    setAnchor("ghost", scaleGhostAt(SCALE_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const v = sv.now();
    const t = sv.t();
    // The cup tips over in the first moments of the run, then the puddle spreads.
    const tip = Math.min(1, t / 0.4);
    if (cup.current) cup.current.rotation.z = (1 - (1 - tip) ** 3) * 1.65;
    if (puddle.current) puddle.current.scale.set(0.05 + tip * 0.95, 1, 0.05 + tip * 0.95);
    const made = v["co2.made"] ?? 0;
    const madeMax = sv.outcome?.readings["co2.made"] ?? 1;
    if (soda.current) soda.current.scale.setScalar(0.08 * Math.max(0.15, 1 - (made / Math.max(madeMax, 1e-6)) * 0.85));
    // Fizz: bubbles from the puddle at the simulator's rate.
    const s = spawn.current;
    s.bubbles += (v.bubbles ?? 0) * 70 * dt;
    while (s.bubbles >= 1) {
      s.bubbles -= 1;
      vfx.burst({ at: [0.02, ON_SCALE + 0.05, 0.02], kind: "bubble", count: 1, colors: [LAB.chemistry.sage, LAB.chemistry.wall], speed: [0.15, 0.4], dir: [0, 1, 0], cone: 0.8, life: [0.5, 1], size: [0.012, 0.028], spread: 0.18, gravity: -0.3, drag: 2 });
    }
    // Open bag: escaping gas drifts out of the open zip on the front seam, at the rate the model loses it.
    const escaped = v["co2.escaped"] ?? 0;
    s.gas += Math.max(0, escaped - s.lastEscaped) * 30;
    s.lastEscaped = t === 0 ? 0 : escaped;
    while (s.gas >= 1) {
      s.gas -= 1;
      vfx.burst({ at: [0, ON_SCALE + 0.06, 0.48], kind: "smoke", count: 1, colors: [LAB.chemistry.sage, P.white], speed: [0.25, 0.55], dir: [0, 1, 0.3], cone: 0.85, life: [1, 1.8], size: [0.05, 0.09], spread: 0.3, drag: 0.6 });
    }
  });

  return (
    <group>
      <Scale3D reading={() => sv.now()["scale.grams"] ?? 0} ghost={ghostEnd} position={SCALE_AT} />
      {!zoomed && <Graph3D value="scale.grams" label="Mass" unit="g" digits={2} width={0.86} position={[0, 0.9, -0.35]} />}
      <ZipBag3D inflate={() => (sv.now().bagVolume ?? 0) / MAX_BAG_ML} sealed={sealed} position={[0, ON_SCALE, 0]}>
        {/* The cup of vinegar tips over (around its front edge). */}
        <group ref={cup} position={[-0.28, 0.02, 0.05]}>
          <group position={[0.13, 0, 0]}>
            <Beaker3D radius={0.12} height={0.2} level={() => 0.7 * (1 - Math.min(1, sv.t() / 0.4))} color={() => LAB.chemistry.sage} />
          </group>
        </group>
        <mesh ref={puddle} position={[0.02, 0.008, 0.02]} material={liquidMaterial(LAB.chemistry.sage, tier, 0.7)}>
          <cylinderGeometry args={[0.3, 0.3, 0.012, 40]} />
        </mesh>
        <mesh ref={soda} position={[0.22, 0.03, -0.08]} scale={0.08} material={kitMaterial("plastic", tier)}>
          <sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <GasCloud
          position={[0, 0.22, 0]}
          size={zoomed ? 0.035 : 0.022}
          speed={zoomed ? 0.7 : 1}
          count={() => {
            const v = sv.now();
            const inBag = (v["co2.made"] ?? 0) - (v["co2.escaped"] ?? 0);
            return Math.min(70, inBag * 18);
          }}
          radii={() => {
            const k = Math.min(1, (sv.now().bagVolume ?? 0) / MAX_BAG_ML);
            // Inside the pillow at every size: the dome rises from 0.3 to 0.84 as the bag fills.
            return [0.46, 0.06 + k * 0.2, 0.3];
          }}
        />
      </ZipBag3D>
    </group>
  );
}
