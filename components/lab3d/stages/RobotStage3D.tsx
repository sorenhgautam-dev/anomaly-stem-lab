"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { DRIVE_SECONDS, MAX_WHEEL_SPEED, WHEELBASE } from "@/engine/robotics/kinematics";
import { numberSetting } from "@/engine/robotics/settings";
import type { Outcome } from "@/engine/types";
import { useLab } from "@/lib/store";
import { PALETTE as P } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Readout } from "../kit/chem/instruments";
import { TextBoard } from "../kit/TextBoard";
import { Arena3D } from "../kit/robot/Arena3D";
import { GhostRobot3D, RobotChassis3D } from "../kit/robot/RobotChassis3D";
import { ARENA_SCALE, arenaToWorld, MAT_TOP, matFrame, placeOnArena, START_Z } from "../kit/robot/space";
import { GhostTrail3D, Trail3D } from "../kit/robot/Trail3D";
import { vfx } from "../kit/vfx";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Turning robot in 3D (stage "robot", engine/robotics/kinematics.ts; DESIGN.md
 * §7.5, §8.1): a toy two-wheeled robot on a raised arena mat. Arrows at its
 * wheels show each wheel's speed. Run: it drives the simulator's timeline
 * (x, y, heading), each wheel rolling at its own speed, and lays a glowing
 * trail along the outcome's path. After a wrong run a translucent volt ghost
 * robot drives the believed path in step, leaving dashes, with a dashed
 * "Your idea" label where it stops.
 */

const WHEEL_R_CM = 3.3;
const TRACK = WHEELBASE * ARENA_SCALE;
const WHEEL_R = WHEEL_R_CM * ARENA_SCALE;

// Build and predict frame the robot and its wheel arrows up close; the run
// and the reveal pull back over the whole mat, so any path fits.
export function robotShots(): StageShots {
  const { cz } = matFrame();
  const robot: [number, number, number] = [0, 0, START_Z - 0.22];
  // The result card covers the bottom, so the reveal aims in front of the start to lift the paths.
  const paths: [number, number, number] = [0, -0.05, START_Z + 0.05];
  return {
    arrive: orbit([0, 0, cz], 9.5, 62, 30),
    build: orbit(robot, 3.7, 50),
    predict: orbit(robot, 3.3, 46, 6),
    run: orbit(paths, 5.0, 60, -10),
    reveal: orbit([paths[0], paths[1], paths[2] + 0.05], 5.8, 62),
  };
}

/** Fixed length (monospace), so the label's canvas never changes size mid-run. */
function turnText(heading: number): string {
  const d = Math.round(Math.abs(heading));
  return `turn ${String(d).padStart(3, " ")}° ${d === 0 ? "ahead" : heading > 0 ? "left " : "right"}`;
}

const answerOf = (o: Outcome) => (o.result.type === "choice" ? o.result.value : String(o.result.value));
const at = new Vector3();
const SIDES = [-1, 1] as const;
/** The focus sits behind where the robot stops, so Ano doesn't hide it. */
const BEHIND = new Vector3(0, 0.1, -0.5);

/** Per-run effects state: wheel dust and the ring where the robot stops. */
class RunFx {
  private dust = 0;
  private ringed = false;
  step(t: number, total: number, dt: number, moving: boolean, robot: Group | null) {
    if (!robot || t <= 0) return;
    if (t < total - 0.1) this.ringed = false;
    if (moving && t < total) {
      this.dust += dt;
      if (this.dust > 0.22) {
        this.dust = 0;
        for (const side of SIDES) {
          robot.localToWorld(at.set((side * TRACK) / 2, 0.01, 0.02));
          vfx.burst({ at: [at.x, at.y, at.z], kind: "smoke", count: 1, colors: [P.cream[300], P.ink[300]], speed: [0.02, 0.08], dir: [0, 1, 0], cone: 0.6, life: [0.5, 0.9], size: [0.025, 0.04], grow: 0.06, drag: 2 });
        }
      }
    }
    if (t >= total - 1e-3 && !this.ringed) {
      this.ringed = true;
      robot.getWorldPosition(at);
      vfx.ring({ at: [at.x, at.y + 0.004, at.z], color: P.apricot[500], from: 0.05, to: 0.5, life: 0.8 });
    }
  }
}

export function RobotStage3D() {
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const left = numberSetting(def, build, "left", 0) / 100;
  const right = numberSetting(def, build, "right", 0) / 100;
  const sv = useStageValues();
  const robot = useRef<Group>(null);
  const ghostBot = useRef<Group>(null);
  const tag = useRef<Group>(null);
  const [fx] = useState(() => new RunFx());
  const timeline = sv.outcome?.timeline;
  const total = timeline && timeline.length > 1 ? timeline[timeline.length - 1].t : DRIVE_SECONDS;
  const believed = sv.ghost?.path ?? null;
  const believedEnd = believed?.[believed.length - 1] ?? { x: 0, y: 0 };
  const idea = sv.ghost ? answerOf(sv.ghost) : null;
  // A new board per text: a label's canvas must not change size once uploaded.
  const label = useMemo(() => {
    const board = new TextBoard("ghost", 0.12, 24);
    if (idea) board.set(`Your idea: ${idea}`);
    return board;
  }, [idea]);
  useEffect(() => () => label.dispose(), [label]);
  // Ano and the verdict burst go where the robot stops (the start before a
  // run); the prediction's label floats in front of the start.
  useEffect(() => {
    const path = sv.outcome?.path;
    setAnchor("focus", arenaToWorld(path?.[path.length - 1] ?? { x: 0, y: 0 }, new Vector3(), 0.3).add(BEHIND));
  }, [sv.outcome]);
  useEffect(() => {
    setAnchor("ghost", new Vector3(0, MAT_TOP + 0.2, START_Z + 0.36));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("focus");
    };
  }, []);

  useFrame((_, delta) => {
    const v = sv.now();
    const t = sv.t();
    if (robot.current) placeOnArena(robot.current, v.x ?? 0, v.y ?? 0, v.heading ?? 0);
    // The turn readout rides above and just behind the robot, without turning with it.
    if (tag.current) placeOnArena(tag.current, v.x ?? 0, (v.y ?? 0) + 7, 0);
    const g = sv.ghostNow();
    if (ghostBot.current && g) placeOnArena(ghostBot.current, g.x ?? 0, g.y ?? 0, g.heading ?? 0);
    fx.step(t, total, Math.min(delta, 1 / 30), left + right > 0, robot.current);
  });

  const reveal = () => sv.t() / total;
  return (
    <group>
      <Arena3D />
      <Trail3D points={sv.outcome?.path ?? null} reveal={reveal} />
      {sv.ghost && <GhostTrail3D points={believed} reveal={reveal} />}
      <group ref={robot}>
        <RobotChassis3D
          track={TRACK}
          wheelRadius={WHEEL_R}
          left={left}
          right={right}
          spinLeft={() => -(left * MAX_WHEEL_SPEED * sv.t()) / WHEEL_R_CM}
          spinRight={() => -(right * MAX_WHEEL_SPEED * sv.t()) / WHEEL_R_CM}
          running={() => sv.t() > 0 && sv.t() < total}
        />
      </group>
      <group ref={tag}>{sv.outcome && <Readout text={() => turnText(sv.now().heading ?? 0)} height={0.1} position={[0, 0.34, 0]} />}</group>
      {sv.ghost && (
        <group ref={ghostBot}>
          <GhostRobot3D track={TRACK} wheelRadius={WHEEL_R} />
        </group>
      )}
      {idea && <primitive object={label.sprite} position={arenaToWorld(believedEnd, new Vector3(), 0.34)} />}
    </group>
  );
}
