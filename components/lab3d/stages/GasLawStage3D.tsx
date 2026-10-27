"use client";

import { useEffect } from "react";
import { RoundedBox } from "@react-three/drei";
import { Vector3 } from "three";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { useLabUi } from "../lab-ui";
import { labView, setAnchor } from "../lab-state";
import { PistonGas } from "../kit/chem/gas/PistonGas";
import { PressureGauge3D } from "../kit/chem/gas/PressureGauge";
import { ML, Syringe3D } from "../kit/chem/gas/Syringe";
import { Readout } from "../kit/chem/instruments";
import { GhostLabel } from "../kit/chem/liquid/ghost";
import { kitMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Gas laws, in 3D (stage "gaslaw", engine/chemistry/gaslaw.ts; DESIGN.md
 * §7.5, §8.1 "gas as particles bouncing inside containers"): a sealed
 * syringe of air on two cradles, piped into a round pressure gauge. An
 * orange ring marks how far it will be squeezed. Run: the plunger pushes in
 * to the simulator's volume, the needle and the screen follow its kPa, and
 * the same air molecules, crowded into less space, hit the plunger more
 * often. After a wrong run a ghost needle and a dashed label show the
 * pressure the student expected. "Zoom to particles" moves in on the air.
 */

const Y = 0.3; // syringe axis height
const R = 0.14; // barrel radius
const TIP: [number, number, number] = [0.3, Y, 0]; // the syringe's sealed end
const GAUGE: [number, number, number] = [0.67, Y, 0];
const GHOST_AT: [number, number, number] = [0.6, 0.8, 0];
// The picked option floats here before the run; it's wide, so it sits nearer the middle.
const IDEA_AT: [number, number, number] = [0.1, 0.86, 0];

export function gasLawShots(): StageShots {
  const aim: [number, number, number] = [-0.08, 0.18, 0.1];
  return {
    arrive: orbit(aim, 8.6, 38, 30),
    build: orbit(aim, 5.0, 18),
    predict: orbit(aim, 4.6, 16, 4),
    run: orbit([-0.05, 0.24, 0.1], 4.3, 14, -10),
    reveal: orbit([-0.08, 0.08, 0.1], 5.2, 14),
    particles: orbit([TIP[0] - 0.22, Y, 0], 1.75, 12, 0),
  };
}

export function GasLawStage3D() {
  const target = useLab((s) => (typeof s.build?.settings.volume === "number" ? s.build.settings.volume : 30));
  const tier = useQuality((s) => s.level);
  const zoomed = useLabUi((s) => s.particles);
  const sv = useStageValues();
  const ghostKpa = sv.ghost?.readings["pressure.end"] ?? null;
  const ghostText = ghostKpa !== null ? `Your idea: ${ghostKpa.toFixed(1)} kPa` : null;

  useEffect(() => {
    // Over the gauge: Ano stops short of the focus, so a higher one keeps him off the barrel.
    setAnchor("focus", new Vector3(GAUGE[0], Y + 0.55, 0.1));
    setAnchor("ghost", new Vector3(...IDEA_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  const volume = () => sv.now().volume ?? 60;

  return (
    <group>
      <group position={TIP}>
        <Syringe3D volume={volume} radius={R} />
        {/* How far the plunger will go: the "Squeeze to" setting. */}
        <mesh position={[-target * ML, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={kitMaterial("orange", tier)}>
          <torusGeometry args={[R + 0.006, 0.006, 8, 40]} />
        </mesh>
        {zoomed && <Readout text={() => `wall hits ×${(sv.now().hits ?? 1).toFixed(1)}`} height={0.07} position={[-0.1, 0.38, 0]} />}
      </group>
      <PistonGas plunger={() => -volume() * ML} end={-0.02} radius={R * 0.92} zoomed={zoomed} at={TIP} />
      {/* Two cradles under the barrel, and the pipe from the sealed tip into the gauge. */}
      {[TIP[0] - 0.14, TIP[0] - 0.62].map((x) => (
        <RoundedBox key={x} args={[0.1, Y - R + 0.03, 0.26]} radius={0.02} smoothness={3} position={[x, (Y - R + 0.03) / 2, 0]} material={kitMaterial("plastic", tier)} />
      ))}
      <mesh position={[(TIP[0] + 0.06 + GAUGE[0] - 0.22) / 2, Y, 0]} rotation={[0, 0, Math.PI / 2]} material={kitMaterial("metal", tier)}>
        <cylinderGeometry args={[0.018, 0.018, GAUGE[0] - 0.22 - TIP[0] - 0.06 + 0.02, 12]} />
      </mesh>
      <RoundedBox args={[0.3, Y - 0.2, 0.16]} radius={0.02} smoothness={3} position={[GAUGE[0], (Y - 0.2) / 2, -0.02]} material={kitMaterial("plastic", tier)} />
      <PressureGauge3D kpa={() => sv.now().pressure ?? 101.325} ghost={ghostKpa} position={GAUGE} />
      <GhostLabel text={ghostText} position={GHOST_AT} />
    </group>
  );
}
