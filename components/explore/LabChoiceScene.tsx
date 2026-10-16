"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Vector3, type Group } from "three";
import type { LabId } from "@/engine/types";
import { TOKENS } from "@/lib/tokens";
import { Effects } from "@/components/landing/Effects";
import { geos } from "@/components/landing/geometries";
import { mats } from "@/components/landing/materials";
import { StudioLighting } from "@/components/landing/StudioLighting";

/*
 * The 3D half of "Choose your lab" (CLAUDE.md §1.1): a flask and a small
 * robot. The hovered one tilts toward the cursor and leans forward; picking
 * one flies the camera into it before the page changes.
 */

export interface LabChoiceState {
  hovered: LabId | null;
  chosen: LabId | null;
}

// Up and in from the labels, which sit along the bottom of each half.
const SEATS: Record<LabId, [number, number, number]> = {
  robotics: [-2.1, 0.75, 0],
  chemistry: [2.1, 0.65, 0],
};

function FlaskModel() {
  const g = geos();
  const m = mats();
  const bubbles = useRef<(Group | null)[]>([]);
  useFrame((state) => {
    bubbles.current.forEach((b, i) => {
      if (!b) return;
      const t = (state.clock.elapsedTime * (0.35 + i * 0.07) + i * 0.31) % 1;
      b.position.set(Math.sin(i * 2.1 + t * 6) * 0.08, -0.45 + t * 0.35, Math.cos(i * 1.7) * 0.08);
      b.scale.setScalar(0.4 + t * 0.6);
    });
  });
  return (
    <group>
      <mesh geometry={g.flask} material={m.glass} />
      <mesh geometry={g.flaskLiquid} material={m.liquid} />
      {[0, 1, 2, 3, 4].map((i) => (
        <group
          key={i}
          ref={(el) => {
            bubbles.current[i] = el;
          }}
        >
          <mesh geometry={g.electron} material={m.glowLilac} scale={0.5} />
        </group>
      ))}
    </group>
  );
}

function RobotModel() {
  const g = geos();
  const m = mats();
  return (
    <group position={[0, -0.2, 0]}>
      <mesh geometry={g.robotBody} material={m.pearl} />
      <mesh geometry={g.robotHead} material={m.pearl} position={[0, 0.43, 0]} />
      <mesh geometry={g.robotVisor} material={m.dark} position={[0, 0.44, 0.18]} />
      <mesh geometry={g.robotEye} material={m.glowLilac} position={[-0.08, 0.44, 0.205]} />
      <mesh geometry={g.robotEye} material={m.glowLilac} position={[0.08, 0.44, 0.205]} />
      <mesh geometry={g.wheel} material={m.signal} position={[-0.31, -0.22, 0]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={g.wheel} material={m.signal} position={[0.31, -0.22, 0]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={g.antenna} material={m.chrome} position={[0, 0.67, 0]} />
      <mesh geometry={g.antennaTip} material={m.glowSignal} position={[0, 0.77, 0]} />
    </group>
  );
}

function Choice({ lab, state }: { lab: LabId; state: React.RefObject<LabChoiceState> }) {
  const group = useRef<Group>(null);
  const s = useRef({ scale: 1, lean: 0 });
  useFrame((frame, delta) => {
    const g = group.current;
    if (!g) return;
    const hovered = state.current.hovered === lab;
    const dimmed = state.current.hovered !== null && !hovered;
    const k = 1 - Math.exp(-delta * 7);
    // Tilt toward the cursor when hovered, idle sway otherwise.
    const targetY = hovered ? frame.pointer.x * 0.9 : Math.sin(frame.clock.elapsedTime * 0.4 + (lab === "robotics" ? 0 : 2)) * 0.35;
    const targetX = hovered ? -frame.pointer.y * 0.45 : 0;
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
    s.current.scale += ((hovered ? 1.1 : dimmed ? 0.92 : 1) - s.current.scale) * k;
    s.current.lean += ((hovered ? 0.6 : 0) - s.current.lean) * k;
    g.scale.setScalar(1.75 * s.current.scale);
    g.position.z = s.current.lean;
  });
  return (
    <group position={SEATS[lab]}>
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
        <group ref={group}>{lab === "chemistry" ? <FlaskModel /> : <RobotModel />}</group>
      </Float>
    </group>
  );
}

/** Flies the camera into the chosen object, then calls onArrive once. */
function CameraFlight({ state, onArrive }: { state: React.RefObject<LabChoiceState>; onArrive: () => void }) {
  const s = useRef({ t: 0, arrived: false, target: new Vector3(), look: new Vector3(0, 0, 0), aim: new Vector3() });
  useFrame((frame, delta) => {
    const chosen = state.current.chosen;
    const cam = frame.camera;
    const f = s.current;
    if (!chosen) {
      // Gentle parallax while choosing.
      cam.position.x += (frame.pointer.x * 0.35 - cam.position.x) * (1 - Math.exp(-delta * 3));
      cam.position.y += (frame.pointer.y * 0.2 + 0.2 - cam.position.y) * (1 - Math.exp(-delta * 3));
      cam.lookAt(0, 0, 0);
      return;
    }
    f.t = Math.min(1, f.t + delta / 0.9);
    const ease = f.t * f.t * (3 - 2 * f.t);
    const [x, y] = SEATS[chosen];
    f.target.set(x, y + 0.1, 1.2);
    cam.position.lerp(f.target, ease * 0.25);
    f.look.lerp(f.aim.set(x, y, 0), 0.2);
    cam.lookAt(f.look);
    if (f.t >= 1 && !f.arrived) {
      f.arrived = true;
      onArrive();
    }
  });
  return null;
}

export default function LabChoiceScene({
  state,
  onArrive,
}: {
  state: React.RefObject<LabChoiceState>;
  onArrive: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 35, near: 0.1, far: 60, position: [0, 0.2, 9] }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.transmissionResolutionScale = 0.5;
      }}
    >
      <color attach="background" args={[TOKENS.void]} />
      <fog attach="fog" args={[TOKENS.void, 10, 26]} />
      <StudioLighting />
      <Choice lab="robotics" state={state} />
      <Choice lab="chemistry" state={state} />
      <CameraFlight state={state} onArrive={onArrive} />
      <Effects high />
    </Canvas>
  );
}
