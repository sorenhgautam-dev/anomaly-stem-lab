"use client";

import { useEffect, useMemo } from "react";
import { Vector3 } from "three";
import { LAB } from "@/lib/tokens";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { useLabUi } from "../lab-ui";
import { labView, setAnchor } from "../lab-state";
import { PistonGas } from "../kit/chem/gas/PistonGas";
import { PressureGauge3D } from "../kit/chem/gas/PressureGauge";
import { ML, Syringe3D } from "../kit/chem/gas/Syringe";
import { postGeometry, saddleGeometry, sleeveGeometry } from "../kit/chem/gas/stand";
import { TONE } from "../kit/chem/heat/tones";
import { Readout } from "../kit/chem/instruments";
import { GhostLabel } from "../kit/chem/liquid/ghost";
import { kitMaterial, liquidMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Gas laws, in 3D (stage "gaslaw", engine/chemistry/gaslaw.ts; DESIGN.md
 * §7.5, §8.1 "gas as particles bouncing inside containers"): a sealed
 * syringe of air on two sage saddles, its nozzle sleeved into the side port
 * of a round pressure gauge on a stand. A sand-gold ring marks how far it
 * will be squeezed. Run: the plunger pushes in
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
  const rig = useMemo(
    () => ({
      saddles: saddleGeometry(Y, R, [TIP[0] - 0.14, TIP[0] - 0.62], GAUGE[0]),
      post: postGeometry(GAUGE[0], Y),
      // From the nozzle's end over the gauge's nipple (gauge radius 0.24, nipple out to 0.066 beyond it).
      sleeve: sleeveGeometry(TIP[0] + 0.06, GAUGE[0] - 0.24 - 0.03, Y),
    }),
    [],
  );
  useEffect(() => () => Object.values(rig).forEach((g) => g.dispose()), [rig]);

  return (
    <group>
      <group position={TIP}>
        <Syringe3D volume={volume} radius={R} />
        {/* How far the plunger will go: the "Squeeze to" setting. */}
        <mesh position={[-target * ML, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={kitMaterial("sand", tier)}>
          <torusGeometry args={[R + 0.006, 0.006, 10, 48]} />
        </mesh>
        {zoomed && <Readout text={() => `wall hits ×${(sv.now().hits ?? 1).toFixed(1)}`} height={0.07} position={[-0.1, 0.38, 0]} />}
      </group>
      <PistonGas plunger={() => -volume() * ML} end={-0.02} radius={R * 0.92} zoomed={zoomed} at={TIP} />
      {/* Two saddles under the barrel and the gauge's base, its post, and the sleeve from the nozzle into the gauge. */}
      <mesh geometry={rig.saddles} material={kitMaterial("satin", tier, LAB.chemistry.sage)} />
      <mesh geometry={rig.post} material={kitMaterial("steel", tier)} />
      <mesh geometry={rig.sleeve} material={liquidMaterial(TONE.paleSage, tier, 0.7)} />
      <PressureGauge3D kpa={() => sv.now().pressure ?? 101.325} ghost={ghostKpa} position={GAUGE} />
      <GhostLabel text={ghostText} position={GHOST_AT} />
    </group>
  );
}
