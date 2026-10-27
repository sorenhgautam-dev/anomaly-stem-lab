"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { useLab } from "@/lib/store";
import { PALETTE as P } from "@/lib/tokens";
import { useLabUi } from "../lab-ui";
import { labView, setAnchor } from "../lab-state";
import { Beaker3D, Flask3D } from "../kit/chem/glass";
import { HotPlate3D, Readout, Thermometer3D } from "../kit/chem/instruments";
import { Balloon3D } from "../kit/chem/heat/Balloon3D";
import { ParticleSwarm } from "../kit/chem/heat/ParticleSwarm";
import { amp } from "../kit/chem/heat/swarm";
import { Ease, Emitter, steam, waterTint } from "../kit/chem/heat/tick";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Gas particles and heat, in 3D (stage "heat", engine/chemistry/heat.ts): a
 * sealed balloon on a flask, standing in a water bath on a hot plate, with
 * the air particles bouncing inside the see-through balloon (DESIGN.md §7.5,
 * §8.1 "gas as particles bouncing inside containers"). Run: the bath warms,
 * the balloon swells and the particles speed up (trails show their speed);
 * they never grow or multiply. After a wrong run a ghost balloon (pale volt,
 * wire outline) floats beside it with the student's idea: bigger particles,
 * or more of them. "Zoom to particles" moves in close.
 */

const PX = -0.25;
const TOP = 0.13;
const FLASK = 0.5;
/** The flask's neck, where the balloon sits. */
const NECK: [number, number, number] = [PX, TOP + 0.012 + 1.05 * FLASK, 0];
const R = 0.24;
const GHOST_X = 0.58;
const LABEL_Y = 1.38;
const GHOST_AT: [number, number, number] = [GHOST_X, LABEL_Y, 0];
const BASE_COUNT = 32;

/** Balloon scale for a volume ratio: true to the cube root, the change drawn a little larger so it reads. */
const swellFor = (volume: number) => 1 + (Math.cbrt(volume) - 1) * 1.6;

function ideaText(readings: Record<string, number> | undefined): string {
  const size = readings?.["particles.sizeRatio"] ?? 1;
  const count = readings?.["particles.countRatio"] ?? 1;
  if (size > 1.001) return `Your idea: bigger\nsize ×${size.toFixed(2)}`;
  if (count > 1.001) return `Your idea: more\ncount ×${count.toFixed(2)}`;
  return "Your idea: no different";
}

export function gasHeatShots(): StageShots {
  const aim: [number, number, number] = [0.1, 0.5, 0];
  return {
    arrive: orbit(aim, 8.6, 40, 30),
    build: orbit(aim, 4.8, 16),
    predict: orbit(aim, 4.6, 14, 6),
    run: orbit([0.05, 0.62, 0], 4.5, 12, -10),
    reveal: orbit([0.14, 0.52, 0], 5.3, 16),
    particles: orbit([PX, NECK[1] + 0.24, 0], 1.9, 6, 0),
  };
}

export function GasHeatStage3D() {
  const raw = useLab((s) => s.build?.settings.temperature);
  const target = typeof raw === "number" ? raw : 80;
  const zoomed = useLabUi((s) => s.particles);
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const [zoom] = useState(() => new Ease());
  const [puffs] = useState(() => new Emitter());
  const labels = useRef<Group>(null);
  const ghostText = sv.ghost ? ideaText(sv.ghost.readings) : null;

  useEffect(() => {
    // In front of the bath, low: Ano parks there without hiding the particles.
    setAnchor("focus", new Vector3(0.15, 0.25, 0.45));
    // The prediction floats where the ghost balloon will appear.
    setAnchor("ghost", new Vector3(...GHOST_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  const temp = () => snap.now.temperature ?? 20;
  const g = (key: string, fallback: number) => snap.ghost?.[key] ?? fallback;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    // The labels step aside inside the particle dive (they would sit at the top edge).
    if (labels.current) labels.current.visible = zoom.to(zoomed ? 1 : 0, dt) < 0.5;
    for (let n = puffs.due(((temp() - 45) / 45) * 5, dt); n > 0; n--) steam([PX, TOP + 0.24, 0], 0.26);
  });

  return (
    <group>
      <HotPlate3D power={() => (sv.t() > 0 ? (target - 20) / 80 : 0)} size={0.9} position={[PX, 0, 0]}>
        <Beaker3D radius={0.38} height={0.34} level={() => 0.62} color={() => waterTint(temp())}>
          <Flask3D scale={FLASK} level={() => 0} color={() => P.white} position={[0, 0.012, 0]} />
          <group position={[0.25, 0.02, 0.12]} rotation={[0, 0, -0.24]}>
            <Thermometer3D celsius={temp} min={0} max={100} height={0.62} />
          </group>
        </Beaker3D>
      </HotPlate3D>
      <Balloon3D radius={R} swell={() => swellFor(snap.now.volume ?? 1)} fade={() => 1 - 0.55 * zoom.value} position={NECK}>
        <ParticleSwarm
          max={60}
          trail={2}
          seed={11}
          color={P.apricot[600]}
          count={() => BASE_COUNT * amp(snap.now.count ?? 1)}
          speed={() => 0.45 * amp(snap.now.speed ?? 1)}
          size={() => 0.022 * amp(snap.now.size ?? 1)}
          radius={() => R * 0.98 * swellFor(snap.now.volume ?? 1)}
        />
      </Balloon3D>
      <group ref={labels}>
        <Readout text={() => `Air particles\nspeed ×${(snap.now.speed ?? 1).toFixed(2)}`} height={0.085} position={[PX, LABEL_Y, 0]} />
        {ghostText && <Readout text={() => ghostText} style="ghost" height={0.085} position={GHOST_AT} />}
      </group>
      {ghostText && (
        <Balloon3D radius={R} ghost swell={() => swellFor(g("volume", 1))} position={[GHOST_X, NECK[1], 0]}>
          <ParticleSwarm
            max={60}
            trail={2}
            seed={23}
            ghost
            color={P.volt[500]}
            count={() => BASE_COUNT * amp(g("count", 1))}
            speed={() => 0.45 * amp(g("speed", 1))}
            size={() => 0.022 * amp(g("size", 1))}
            radius={() => R * 0.98 * swellFor(g("volume", 1))}
          />
        </Balloon3D>
      )}
    </group>
  );
}
