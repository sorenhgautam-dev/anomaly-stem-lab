"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, RoundedBox, View } from "@react-three/drei";
import type { Group, PerspectiveCamera as Camera } from "three";
import type { LabId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { scenes } from "@/lib/scroll";
import { prefersReducedMotion } from "@/lib/motion";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { Spring } from "@/components/ano/spring";
import { Led3D } from "@/components/lab3d/kit/circuit/lamps3d";
import { Beaker3D, Flask3D } from "@/components/lab3d/kit/chem/glass";
import { Thermometer3D } from "@/components/lab3d/kit/chem/instruments";
import { kitMaterial } from "@/components/lab3d/kit/materials";
import { Gear3D } from "@/components/lab3d/kit/robot/Gear3D";
import { RobotChassis3D } from "@/components/lab3d/kit/robot/RobotChassis3D";
import { useLabEnvironment } from "@/components/lab3d/scene/lab-light";
import { FitModel } from "./FitModel";
import { pointer } from "./pointer";
import { useViewPresence } from "./frameloop";

/*
 * A lab's preview in the page layout (drawn by the site canvas): a short
 * bench in the lab's colour world with real apparatus from the lab kit on it
 * (DESIGN.md §8, §8.2), lit by the lab's own light. It drifts and turns
 * slowly, turns as its card scrolls past, leans toward the cursor, and grows
 * a little when the cursor is over its card (DESIGN.md §9.1).
 */

/** Drift, lean toward the cursor, grow when the cursor is over the card. */
class ObjectMotion {
  private yaw = new Spring(0, 40, 9);
  private pitch = new Spring(0, 40, 9);
  private scale = new Spring(1, 120, 12);
  private t = 0;
  constructor(private reduced: boolean) {}

  step(g: Group, dt: number, card: Element | null | undefined): void {
    const r = card?.getBoundingClientRect();
    this.t += this.reduced ? 0 : dt;
    let yaw = Math.sin(this.t * 0.4) * 0.35;
    let pitch = 0;
    let over = false;
    const diving = !!card?.hasAttribute("data-diving");
    // Scrolling the card past turns the object, so the page's scroll drives the 3D too (§9.1).
    if (r && !this.reduced) {
      const through = (r.top + r.height / 2) / window.innerHeight - 0.5;
      yaw -= through * 0.9;
      pitch += through * 0.18;
    }
    if (r && pointer.active) {
      yaw += ((pointer.x - (r.left + r.width / 2)) / Math.max(400, r.width)) * 0.9;
      pitch = ((pointer.y - (r.top + r.height / 2)) / Math.max(400, r.height)) * 0.5;
      over = pointer.x > r.left && pointer.x < r.right && pointer.y > r.top && pointer.y < r.bottom;
    }
    // Diving in (LabCard `dive`): the object rushes toward the camera with a quick turn.
    if (diving) yaw += 0.9;
    g.rotation.set(this.pitch.step(pitch, dt), this.yaw.step(yaw, dt), 0);
    g.position.y = Math.sin(this.t * 1.2) * 0.05;
    g.scale.setScalar(this.scale.step(diving ? 1.45 : over ? 1.08 : 1, dt));
  }
}

/** Chemistry on its beige bench: a conical flask, a beaker of sand-gold liquid and a thermometer. */
function ChemistryBench() {
  const tier = useQuality((s) => s.level);
  return (
    <group position={[0, -0.62, 0]}>
      <RoundedBox args={[2.7, 0.16, 1.1]} radius={0.06} smoothness={4} position={[0, -0.08, 0]} material={kitMaterial("satin", tier, LAB.chemistry.bench)} />
      <group position={[0.08, 0, -0.1]}>
        <FitModel width={1} height={1.25}>
          <Flask3D level={() => 0.55} color={() => LAB.chemistry.sage} />
        </FitModel>
      </group>
      <group position={[-0.78, 0, 0.18]}>
        <FitModel width={0.62} height={0.62}>
          <Beaker3D level={() => 0.62} color={() => LAB.chemistry.gold} />
        </FitModel>
      </group>
      <group position={[0.82, 0, 0.12]} rotation={[0, 0, -0.1]}>
        <FitModel width={0.3} height={0.95}>
          <Thermometer3D celsius={() => 36} height={0.8} />
        </FitModel>
      </group>
    </group>
  );
}

/** Robotics on its white bench with black trim: the little robot, a gold gear standing up and an LED. */
function RoboticsBench() {
  const tier = useQuality((s) => s.level);
  return (
    <group position={[0, -0.62, 0]}>
      <RoundedBox args={[2.7, 0.12, 1.1]} radius={0.05} smoothness={4} position={[0, -0.06, 0]} material={kitMaterial("matte", tier, LAB.robotics.bench)} />
      <RoundedBox args={[2.64, 0.06, 1.04]} radius={0.025} smoothness={3} position={[0, -0.15, 0]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
      <group position={[0.05, 0, 0.05]}>
        <FitModel width={1.15} height={0.7}>
          <RobotChassis3D track={0.5} wheelRadius={0.12} left={0} right={0} />
        </FitModel>
      </group>
      <group position={[-0.86, 0, -0.18]} rotation={[0, 0.5, 0]}>
        <FitModel width={0.72} height={0.8}>
          <Gear3D teeth={18} color="gold" angle={() => 0} />
        </FitModel>
      </group>
      <group position={[0.92, 0, 0.12]}>
        <FitModel width={0.42} height={0.5}>
          <Led3D half={0.2} flipped={false} state={{ brightness: 0.6, burnt: false }} ghost={null} powered />
        </FitModel>
      </group>
    </group>
  );
}

/** Half the bench's width with a margin for its near corners, and the camera's half field of view (30°). */
const BENCH_HALF = 1.72;
const HALF_FOV_TAN = Math.tan((15 * Math.PI) / 180);

function LabObjectScene({ lab, track, scrollScene }: { lab: LabId; track: React.RefObject<HTMLElement | null>; scrollScene: boolean }) {
  // Each lab's own light (DESIGN.md §8 colour worlds).
  useLabEnvironment(lab);
  const [motion] = useState(() => new ObjectMotion(prefersReducedMotion()));
  const group = useRef<Group>(null);
  const cam = useRef<Camera>(null);
  // The bench's shaders compile in the background as the card mounts; it springs in once they're ready, so
  // arriving on the page never stalls a frame compiling them (it cost ~56 ms on the way to lab select).
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const bench = useRef<Group>(null);
  const appear = useRef({ ready: false, k: 0 });
  useEffect(() => {
    const g = bench.current;
    if (!g) return;
    let live = true;
    g.visible = true;
    const compiled = gl.compileAsync(scene, camera);
    g.visible = false;
    void compiled.then(() => {
      if (live) appear.current.ready = true;
    });
    return () => {
      live = false;
    };
  }, [gl, scene, camera]);

  useFrame((_, delta) => {
    const show = appear.current;
    if (show.ready && show.k < 1 && bench.current) {
      show.k = prefersReducedMotion() ? 1 : Math.min(1, show.k + Math.min(delta, 1 / 30) / 0.45);
      const e = 1 + 2.2 * (show.k - 1) ** 3 + 1.2 * (show.k - 1) ** 2;
      bench.current.visible = true;
      bench.current.scale.setScalar(0.9 + 0.1 * e);
    }
    if (!group.current) return;
    const card = track.current?.closest("[data-lab-card]") ?? track.current;
    motion.step(group.current, Math.min(delta, 1 / 30), card);
    const c = cam.current;
    if (!c) return;
    // Narrow cards (phones): back off until the whole bench fits across.
    const fit = Math.max(1, BENCH_HALF / (HALF_FOV_TAN * c.aspect * 3.9));
    // On the landing, the labs section's scroll scene flies each camera in to its bench (scenes.labs, 0 → 1).
    const k = scrollScene ? 1 - (1 - scenes.labs) ** 3 : 1;
    const a = (1 - k) * (lab === "chemistry" ? -0.9 : 0.9);
    const d = (3.9 + (1 - k) * 3.4) * fit;
    c.position.set(Math.sin(a) * d, (0.5 + (1 - k) * 1.6) * fit, Math.cos(a) * d);
    c.lookAt(0, -0.08, 0);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={[0, 0.5, 3.9]} fov={30} onUpdate={(c) => c.lookAt(0, -0.08, 0)} />
      <group ref={group}>
        <group ref={bench} visible={false}>
          {lab === "chemistry" ? <ChemistryBench /> : <RoboticsBench />}
        </group>
      </group>
    </>
  );
}

export function LabObjectView({ lab, scrollScene = false, className }: { lab: LabId; scrollScene?: boolean; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <div aria-hidden className={cn("relative", className)}>
      <View ref={track} className="absolute inset-0">
        <LabObjectScene lab={lab} track={track} scrollScene={scrollScene} />
      </View>
    </div>
  );
}
