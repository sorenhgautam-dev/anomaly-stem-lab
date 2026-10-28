"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera, RoundedBox, View } from "@react-three/drei";
import { MeshBasicMaterial, Vector3, type Group, type PerspectiveCamera as Camera } from "three";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { Inspectable } from "@/components/three/Inspectable";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { useViewPresence } from "@/components/three/frameloop";
import { pointer } from "@/components/three/pointer";
import { Led3D } from "@/components/lab3d/kit/circuit/lamps3d";
import { Battery3D, Jumper3D, Resistor3D } from "@/components/lab3d/kit/circuit/parts3d";
import { canvasTexture } from "@/components/lab3d/kit/detail";
import { kitMaterial } from "@/components/lab3d/kit/materials";
import { Cable3D } from "@/components/lab3d/kit/robot/Cable3D";
import { Multimeter3D } from "@/components/lab3d/kit/robot/Multimeter3D";
import type { HowBench } from "./how-sequence";
import { Puffs } from "./stage/particles";

/*
 * How it works' bench in 3D (DESIGN.md §7.1 item 1, §8.2): the real Light the
 * LED circuit from the lab kit (battery, the resistor's slot, the LED, a loop
 * wire and a multimeter) on a white bench strip in Robotics' graphite, in the
 * state the engine gave this step (how-sequence.ts). When the scroll brings a
 * step with a run, its power comes up over a second: the LED ramps to the
 * simulator's brightness (or stays dark, or burns), current flows round the
 * wire at a speed set by the real milliamps, and the meter counts to them.
 * The belief's ghost LED glows teal beside the real one. The camera glides to
 * a new shot for each step, and the bench leans toward the cursor. Reduced
 * motion: each state and shot shows at once.
 */

const HALF = 0.3;
/**
 * The camera's shot for each step, as an orbit round the bench: from the
 * front and high for the guess, round to the LED side for its ghost, round to
 * the swapped slot, then low on the lit result with its meter. How far away
 * it sits is worked out from the view's shape, so the whole bench always
 * fits (a bench cut off at the view's edge read as a hard seam).
 */
const SHOTS: { az: number; el: number; look: [number, number, number] }[] = [
  { az: 0, el: 0.44, look: [0, 0.1, 0] },
  { az: 0.4, el: 0.32, look: [0.18, 0.16, 0] },
  { az: -0.34, el: 0.36, look: [-0.05, 0.12, 0] },
  { az: 0.22, el: 0.26, look: [0.12, 0.16, 0] },
];
/** Half the bench's width with room for its meter and the lean toward the cursor; the bench's half depth. */
const FIT_HALF = 1.26;
const FIT_DEPTH = 0.4;
const HALF_FOV_TAN = Math.tan((15 * Math.PI) / 180);
const aim = new Vector3();

/** Where the camera sits for a shot in a view of this shape. */
function shotPosition(shot: (typeof SHOTS)[number], aspect: number, out: Vector3): Vector3 {
  const across = Math.min(HALF_FOV_TAN * aspect, HALF_FOV_TAN * 1.9);
  const d = (FIT_HALF + Math.abs(shot.look[0])) / across + FIT_DEPTH;
  return out.set(shot.look[0] + Math.sin(shot.az) * Math.cos(shot.el) * d, shot.look[1] + Math.sin(shot.el) * d, Math.cos(shot.az) * Math.cos(shot.el) * d);
}

let floorMat: MeshBasicMaterial | null = null;
function floorMaterial() {
  floorMat ??= new MeshBasicMaterial({ map: floorTexture(), transparent: true, depthWrite: false, toneMapped: false });
  return floorMat;
}

const Y = 0.07;
const LOOP: [number, number, number][] = [[0.92, Y, 0.12], [1.0, Y, -0.22], [-1.0, Y, -0.22], [-0.92, Y, 0.12]];

/** A soft radial pool for the floor under the bench: the graphite lifted a little, fading out. */
function floorTexture() {
  return canvasTexture("how-floor", 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(46,48,54,0.95)");
    g.addColorStop(0.55, "rgba(32,34,38,0.6)");
    g.addColorStop(1, "rgba(20,21,24,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

function Bench({ bench, stepKey }: { bench: HowBench; stepKey: number }) {
  useStudioEnvironment(1.15, "robotics");
  const tier = useQuality((s) => s.level);
  const [still] = useState(prefersReducedMotion);
  // Power comes up from 0 each time the step changes (a run starting).
  const power = useRef({ key: -1, k: 0 });
  const tilt = useRef<Group>(null);
  const cam = useRef<Camera>(null);
  const look = useRef(new Vector3(...SHOTS[0].look));
  useFrame((_, delta) => {
    // Glide to this step's shot (a weighted lerp; reduced motion cuts straight to it).
    const c = cam.current;
    const shot = SHOTS[Math.min(stepKey, SHOTS.length - 1)];
    if (c) {
      const t = still ? 1 : 1 - Math.exp(-Math.min(delta, 1 / 30) * 3.2);
      c.position.lerp(shotPosition(shot, c.aspect, aim), t);
      look.current.lerp(aim.set(...shot.look), t);
      c.lookAt(look.current);
    }
    const pw = power.current;
    if (pw.key !== stepKey) {
      pw.key = stepKey;
      pw.k = still ? 1 : 0;
    }
    pw.k = Math.min(1, pw.k + Math.min(delta, 1 / 30) / 0.9);
    const g = tilt.current;
    if (g) {
      const x = pointer.active ? pointer.x / window.innerWidth - 0.5 : 0;
      const y = pointer.active ? pointer.y / window.innerHeight - 0.5 : 0;
      g.rotation.y += (x * 0.35 - g.rotation.y) * 0.06;
      g.rotation.x += (y * 0.12 - g.rotation.x) * 0.06;
    }
  });
  const k = () => power.current.k * power.current.k * (3 - 2 * power.current.k);

  // Each step's beat, once as it arrives: Diagnose glitches (the ANOMALY language), Break's ghost burns out in a teal puff (only the belief does: the real LED stays dark), Rebuild lights the LED as the power comes up.
  const puffs = useRef<{ fire: (x: number) => void } | null>(null);
  useEffect(() => {
    if (still) return;
    if (stepKey === 1) {
      const root = document.documentElement;
      root.dataset.glitch = "";
      const id = window.setTimeout(() => delete root.dataset.glitch, 360);
      return () => {
        window.clearTimeout(id);
        delete root.dataset.glitch;
      };
    }
    if (stepKey === 2 && bench.ghost?.burnt) {
      const id = window.setTimeout(() => puffs.current?.fire(0.62), 350);
      return () => window.clearTimeout(id);
    }
  }, [stepKey, still, bench.ghost?.burnt]);
  const run = bench.run;
  const mA = run?.mA ?? 0;
  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={shotPosition(SHOTS[0], 16 / 9, new Vector3()).toArray()} fov={30} onUpdate={(c) => c.lookAt(...SHOTS[0].look)} />
      {/* A floor pool and a dark backdrop, so the bench sits in a room rather than a void. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, -0.13, 0]} material={floorMaterial()}>
        <circleGeometry args={[1.75, 64]} />
      </mesh>
      <group ref={tilt}>
        <RoundedBox args={[2.3, 0.12, 1.0]} radius={0.04} smoothness={3} position={[0, 0.01, 0]} material={kitMaterial("matte", tier, LAB.robotics.bench)} />
        <RoundedBox args={[2.36, 0.07, 1.06]} radius={0.03} smoothness={3} position={[0, -0.075, 0]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
        <group position={[-0.62, 0, 0.12]}>
          <Inspectable name="Battery" values={() => "2 × AA · 3.0 V"} height={0.2}>
            <Battery3D half={HALF} volts={3} />
          </Inspectable>
        </group>
        <group position={[0, 0, 0.12]}>
          {bench.slot === "resistor" && (
            <Inspectable name="Resistor" values={() => "220 Ω"} height={0.2}>
              <Resistor3D half={HALF} ohms={220} />
            </Inspectable>
          )}
          {bench.slot === "wire" && (
            <Inspectable name="Plain wire" values={() => "about 0 Ω"} height={0.2}>
              <Jumper3D half={HALF} />
            </Inspectable>
          )}
        </group>
        <group position={[0.62, 0, 0.12]}>
          <Inspectable name={bench.flipped ? "LED, backwards" : "LED"} values={() => `${run?.burnt ? "burnt out" : run?.lit ? "glowing" : "dark"} · ${(mA * k()).toFixed(1)} mA`} height={0.4}>
            <Led3D half={HALF} flipped={bench.flipped} state={{ brightness: run?.lit ? 1 : 0, burnt: Boolean(run?.burnt) }} ghost={bench.ghost ? { brightness: bench.ghost.lit ? 1 : 0, burnt: bench.ghost.burnt } : null} powered={Boolean(run)} power={k} />
          </Inspectable>
        </group>
        <Cable3D points={LOOP} flow={() => (mA > 0 ? (0.25 + Math.min(1, mA / 12)) * k() : 0)} />
        {/* The meter stands at the far end from the LED, so the LED's "Your idea" label never lands on it. */}
        <group position={[-0.98, 0.06, -0.3]} rotation={[0, 0.5, 0]} scale={0.85}>
          <Inspectable name="Multimeter" values={() => `${(mA * k()).toFixed(1)} mA`} height={0.6}>
            <Multimeter3D reading={() => (mA * k()).toFixed(1)} unit="mA" />
          </Inspectable>
        </group>
        <ContactShadows frames={1} position={[0, 0.072, 0]} scale={[2.4, 1.1]} far={0.6} blur={2} opacity={0.4} color={LAB.robotics.deep} resolution={256} />
        <Puffs ref={puffs} y={0.32} color={LAB.robotics.teal} />
      </group>
    </>
  );
}

export function HowBench3D({ bench, stepKey, label, bare = false, className }: { bench: HowBench; stepKey: number; label: string; bare?: boolean; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <div role="img" aria-label={label} className={cn("relative aspect-[16/9] overflow-hidden rounded-card", !bare && "bg-stage-led", className)}>
      <View ref={track} className="absolute inset-0">
        <Bench bench={bench} stepKey={stepKey} />
      </View>
    </div>
  );
}
