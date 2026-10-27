"use client";

import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { DISPLAY_HZ, PWM_HZ, SUPPLY_VOLTS } from "@/engine/robotics/pwm";
import { numberSetting } from "@/engine/robotics/settings";
import { useLab } from "@/lib/store";
import { labView, setAnchor } from "../lab-state";
import { Readout } from "../kit/chem/instruments";
import { TextBoard } from "../kit/TextBoard";
import { BatteryPack3D } from "../kit/robot/BatteryPack3D";
import { Cable3D } from "../kit/robot/Cable3D";
import { GhostNeedle3D } from "../kit/robot/GhostNeedle3D";
import { smooth } from "../kit/robot/looks";
import { BRUSHES, MotorCan3D } from "../kit/robot/MotorCan3D";
import { MotorDriver3D } from "../kit/robot/MotorDriver3D";
import { Multimeter3D } from "../kit/robot/Multimeter3D";
import { Scope3D } from "../kit/robot/Scope3D";
import { BrushSparks } from "../kit/robot/sparks";
import { Wheel3D } from "../kit/robot/Wheel3D";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Motor speed control (PWM) in 3D (stage "pwm", engine/robotics/pwm.ts;
 * DESIGN.md §7.5, §8.1): a 6 V battery pack feeds a motor driver that flicks
 * the supply on and off, a small gear motor turns a wheel, an oscilloscope
 * shows the pulse train (slowed down so it can be seen) and a multimeter
 * reads the motor's average voltage. Run: the driver's light and the cable's
 * current dots pulse with the timeline's `signal`, the wheel turns from
 * `angle` and its label follows `rpm`. After a wrong run a dashed volt
 * needle on the wheel's axle turns as the belief says (flat out, or stop and
 * start), with a dashed "Your idea" label.
 */

const WHEEL_R = 0.22;
const AXLE = WHEEL_R + 0.05;
const MOTOR: [number, number, number] = [0.32, AXLE, 0.06];
const WHEEL_Z = MOTOR[2] + 0.17;
const RAD = Math.PI / 180;

export function pwmShots(): StageShots {
  const aim: [number, number, number] = [-0.02, 0.16, 0.05];
  return {
    arrive: orbit(aim, 8.6, 38, 30),
    build: orbit(aim, 4.9, 20, -8),
    predict: orbit(aim, 4.5, 18, -4),
    run: orbit([0.1, 0.2, 0.05], 4.1, 16, -14),
    reveal: orbit([-0.02, 0.02, 0.05], 5.3, 20),
  };
}

const rpmText = (rpm: number) => `motor ${Math.round(Math.max(0, rpm)).toString().padStart(3, " ")} rpm`;

export function PwmStage3D() {
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const sv = useStageValues();
  const [sparks] = useState(() => new BrushSparks());
  const duty = Math.min(1, Math.max(0, numberSetting(def, build, "duty", 50) / 100));
  const average = sv.outcome?.readings["motor.avgVoltage"] ?? null;
  const total = sv.outcome?.timeline?.at(-1)?.t ?? 0;
  const ghostRpm = sv.ghost?.readings["motor.rpm"] ?? null;
  const stutters = (sv.ghost?.readings["motor.ripple"] ?? 0) > 0.25;
  const label = useMemo(() => {
    const board = new TextBoard("ghost", 0.085, 24);
    if (ghostRpm !== null) board.set(stutters ? "Your idea: stop, start, stop" : `Your idea: ${Math.round(ghostRpm)} rpm`);
    return board;
  }, [ghostRpm, stutters]);
  useEffect(() => () => label.dispose(), [label]);
  useEffect(() => {
    // Low at the front left, so Ano (who flies most of the way there) leaves the wheel and scope in view.
    setAnchor("focus", new Vector3(-0.95, 0.04, 0.85));
    // The prediction's label floats high behind the scope: the answers are long, and further back it fits between the HUD cards.
    setAnchor("ghost", new Vector3(0.36, 0.95, -1.0));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("focus");
    };
  }, []);

  const running = () => sv.t() > 0 && sv.t() < total;
  const pulse = () => running() && (sv.now().signal ?? 0) > 0.5;
  const brushes: [number, number, number] = [MOTOR[0] + BRUSHES[0], MOTOR[1] + BRUSHES[1], MOTOR[2] + BRUSHES[2]];
  useFrame((_, delta) => sparks.step(Math.min(delta, 1 / 30), running() && (sv.now().rpm ?? 0) > 20, brushes));

  return (
    <group>
      <BatteryPack3D cells={4} position={[-1.02, 0, 0.18]} rotation={[0, 0.35, 0]} />
      <Cable3D points={[[-0.84, 0.07, 0.02], [-0.74, 0.04, 0.0], [-0.62, 0.05, 0.1]]} flow={() => (pulse() ? 0.45 : 0)} />
      <MotorDriver3D on={pulse} position={[-0.44, 0, 0.16]} />
      <Cable3D points={[[-0.27, 0.05, 0.12], [-0.05, 0.03, 0.02], [0.2, 0.05, -0.26], [MOTOR[0] - 0.04, AXLE + 0.03, MOTOR[2] - 0.38]]} flow={() => (pulse() ? 0.45 : 0)} />
      <MotorCan3D position={MOTOR} shaft={0.12} mount={AXLE} />
      <group position={[MOTOR[0], AXLE, WHEEL_Z]} rotation={[0, -Math.PI / 2, 0]}>
        <Wheel3D radius={WHEEL_R} width={0.09} spin={() => (sv.now().angle ?? 0) * RAD} />
      </group>
      {sv.ghost && <GhostNeedle3D length={WHEEL_R + 0.1} angle={() => Math.PI / 2 + (sv.ghostNow()?.angle ?? 0) * RAD} position={[MOTOR[0], AXLE, WHEEL_Z + 0.07]} />}
      <Readout text={() => rpmText(sv.now().rpm ?? 0)} height={0.085} position={[MOTOR[0], AXLE + WHEEL_R + 0.15, WHEEL_Z]} />
      {ghostRpm !== null && <primitive object={label.sprite} position={[MOTOR[0], AXLE + WHEEL_R + 0.3, WHEEL_Z]} />}
      <Scope3D duty={duty} t={() => sv.t()} average={() => (average !== null && sv.t() > 0.25 ? average : null)} hz={PWM_HZ} displayHz={DISPLAY_HZ} supply={SUPPLY_VOLTS} position={[-0.32, 0, -0.52]} rotation={[0, 0.1, 0]} />
      <Multimeter3D reading={() => (average === null || sv.t() <= 0 ? 0 : average * smooth(sv.t() / 0.3)).toFixed(2)} unit="V" position={[0.9, 0, 0.26]} rotation={[0, -0.4, 0]} />
      <Cable3D points={[[0.84, 0.1, 0.33], [0.72, 0.03, 0.12], [0.5, 0.05, -0.2], [MOTOR[0] + 0.04, AXLE + 0.03, MOTOR[2] - 0.38]]} color="orange" radius={0.009} />
    </group>
  );
}
