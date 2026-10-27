"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { useLabUi } from "../lab-ui";
import { labView, setAnchor } from "../lab-state";
import { Beaker3D } from "../kit/chem/glass";
import { HotPlate3D, Readout, Thermometer3D } from "../kit/chem/instruments";
import type { ChartSpec } from "../kit/chem/heat/chart";
import { HeatChart } from "../kit/chem/heat/HeatChart";
import { IceCubes, type Cube } from "../kit/chem/heat/IceCubes";
import { ParticleSwarm } from "../kit/chem/heat/ParticleSwarm";
import { amp, lattice } from "../kit/chem/heat/swarm";
import { Ease, Emitter, steam } from "../kit/chem/heat/tick";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { ownMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Melting and particles, in 3D (stage "melt", engine/chemistry/melt.ts): a
 * beaker of ice on a hot plate with a thermometer in it, and the heating
 * curve drawing itself on a live graph beside it (DESIGN.md §7.5, §8.1).
 * Run: the plate glows, the thermometer climbs to 0 °C and holds there while
 * the cubes shrink and the water rises (the shaded band), then climbs again.
 * After a wrong run the belief is a dashed volt line on the graph. "Zoom to
 * particles" dives into the beaker: the lattice breaks up from the outside
 * in while the ice melts, and the free particles jostle faster as it warms.
 */

const PLATE_X = -0.42;
/** Hot plate surface (the beaker stands on it). */
const TOP = 0.13;
const R = 0.28;
/** Depth of the water once all 100 g has melted. */
const WATER_DEPTH = 0.22;
const WATER = new CylinderGeometry(R * 0.93, R * 0.93, 1, 32).translate(0, 0.5, 0);
const HOMES = lattice(4, 4, 4, 0.075, 0.05);
const CUBES: Cube[] = [
  [-0.09, 0.014, -0.07, 0.13, 0.3],
  [0.09, 0.014, -0.06, 0.12, 1.1],
  [-0.07, 0.014, 0.09, 0.12, 0.7],
  [0.08, 0.014, 0.09, 0.13, 2.1],
  [-0.01, 0.13, 0.0, 0.12, 0.5],
  [0.05, 0.13, -0.08, 0.11, 1.6],
];
const CHART_AT: [number, number, number] = [0.62, 0.62, 0];
const GHOST_AT: [number, number, number] = [0.62, 1.05, 0];
const CHART: ChartSpec = { title: "Thermometer, °C", yKey: "temperature", yMin: -20, yMax: 100, yTicks: [-20, 0, 20, 40, 60, 80, 100], mark: 0, clockKey: "clock", clockStep: 100, bandKey: "solid", bandLabel: "ice melting", ghostLabel: "your idea" };

export function meltShots(): StageShots {
  const aim: [number, number, number] = [0.17, 0.22, 0];
  return {
    arrive: orbit(aim, 8.6, 40, 30),
    build: orbit(aim, 4.8, 22),
    predict: orbit(aim, 4.5, 20, 6),
    run: orbit([0.14, 0.4, 0], 4.5, 16, -12),
    reveal: orbit([0.17, 0.3, 0], 4.8, 22),
    particles: orbit([PLATE_X, 0.2, 0], 2.2, 16, 10),
  };
}

export function MeltStage3D() {
  const raw = useLab((s) => s.build?.settings.power);
  const power = typeof raw === "number" ? raw : 150;
  const tier = useQuality((s) => s.level);
  const zoomed = useLabUi((s) => s.particles);
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const water = useRef<Mesh>(null);
  const boards = useRef<Group>(null);
  const waterMat = useMemo(() => ownMaterial(P.volt[300], tier, { transparent: true, opacity: 0.5 }), [tier]);
  const [zoom] = useState(() => new Ease());
  const [puffs] = useState(() => new Emitter());

  useEffect(() => {
    setAnchor("focus", new Vector3(PLATE_X - 0.08, 0.95, 0));
    // The prediction's ghost label floats over the graph, where the dashed line appears.
    setAnchor("ghost", new Vector3(...GHOST_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  const depth = () => (1 - (snap.now.solid ?? 1)) * WATER_DEPTH;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const z = zoom.to(zoomed ? 1 : 0, dt);
    // The graph and labels step aside inside the particle dive.
    if (boards.current) boards.current.visible = z < 0.5;
    const d = depth();
    const w = water.current;
    if (w) {
      w.visible = d > 0.002;
      w.scale.set(1, Math.max(0.001, d), 1);
      (w.material as MeshStandardMaterial).opacity = 0.5 * (1 - 0.75 * z);
    }
    // Steam once the water is hot.
    const temp = snap.now.temperature ?? -10;
    for (let n = puffs.due(((temp - 50) / 40) * 6, dt); n > 0; n--) steam([PLATE_X, TOP + 0.03 + d, 0], R * 0.6);
  });

  return (
    <group>
      <HotPlate3D power={() => (sv.t() > 0 ? power / 220 : 0)} size={0.78} position={[PLATE_X, 0, 0]}>
        <Beaker3D radius={R} height={0.52} level={() => 0} color={() => P.white}>
          <mesh ref={water} geometry={WATER} material={waterMat} position={[0, 0.012, 0]} />
          <IceCubes cubes={CUBES} left={() => snap.now.solid ?? 1} top={() => 0.012 + depth()} fade={() => 1 - 0.85 * zoom.value} />
          <ParticleSwarm
            max={64}
            homes={HOMES}
            seed={7}
            wander={2.5}
            color={P.volt[500]}
            count={() => 64}
            speed={() => 0.12 * amp(snap.now.speed ?? 1)}
            size={() => 0.034}
            radius={() => R * 0.75}
            height={() => Math.max(0.27, depth() + 0.06)}
            order={() => snap.now.order ?? 1}
            show={() => zoom.value}
            position={[0, 0.012, 0]}
          />
          <group position={[0.13, 0.02, -0.08]} rotation={[0, 0, 0.18]}>
            <Thermometer3D celsius={() => snap.now.temperature ?? -10} min={-20} max={100} height={0.8} />
          </group>
        </Beaker3D>
      </HotPlate3D>
      <group ref={boards}>
        <Readout text={() => `heater ${power} W`} style="screen" height={0.075} position={[PLATE_X, 0.06, 0.43]} />
        <HeatChart spec={CHART} real={sv.outcome?.timeline ?? null} ghost={sv.ghost?.timeline ?? null} t={() => sv.t()} now={() => snap.now.temperature ?? -10} position={CHART_AT} height={0.7} />
        {sv.ghost && <Readout text={() => "Your idea: it keeps rising"} style="ghost" height={0.1} position={GHOST_AT} />}
      </group>
    </group>
  );
}
