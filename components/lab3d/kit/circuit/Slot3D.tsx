"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { MeshBasicMaterial, Vector3, type Group } from "three";
import type { BoardSlot } from "@/engine/types";
import { softClick } from "@/lib/sound";
import { LAB } from "@/lib/tokens";
import { Spring } from "@/components/ano/spring";
import { hoverCursor, setAnchor } from "../../lab-state";
import { TextBoard } from "../TextBoard";
import { vfx } from "../vfx";
import { BOARD_TOP, slotFrame } from "./space";
import { InspectLabel } from "./InspectLabel";

/*
 * One slot on the board (DESIGN.md §8.1 "Build"): a glowing dashed outline
 * with its label while empty (brighter and pulsing when the picked-up part
 * fits), or the placed part. New parts fly in from the tray in front of the
 * board and snap down with a spring and a soft click. Clicking a slot places
 * the picked-up part or selects it for the inspector.
 */

/** Where new parts fly in from: the tray at the front of the board (world). */
export const TRAY_AT = new Vector3(0, 0.55, 1.65);

function outline(w: number, d: number, r: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (const [cx, cz, a0] of [
    [w / 2 - r, -d / 2 + r, -Math.PI / 2],
    [w / 2 - r, d / 2 - r, 0],
    [-w / 2 + r, d / 2 - r, Math.PI / 2],
    [-w / 2 + r, -d / 2 + r, Math.PI],
  ]) {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r]);
    }
  }
  pts.push(pts[0]);
  return pts;
}

/** The fly-in from the tray: an eased arc, then a springy squash on landing and a soft click. */
class FlyIn {
  private t = 0;
  private landed = false;
  private done = false;
  private squash = new Spring(0, 160, 15);

  step(group: Group, from: Vector3, dt: number) {
    if (this.done) return;
    this.t = Math.min(1, this.t + dt / 0.42);
    const e = 1 - (1 - this.t) ** 3;
    group.position.set(from.x * (1 - e), from.y * (1 - e) + Math.sin(e * Math.PI) * 0.35, from.z * (1 - e));
    if (this.t >= 1 && !this.landed) {
      this.landed = true;
      this.squash.v = -3.2;
      softClick();
    }
    if (!this.landed) return;
    const k = Math.max(0.5, 1 + this.squash.step(0, dt));
    group.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
    if (Math.abs(this.squash.x) < 0.001 && Math.abs(this.squash.v) < 0.01) {
      this.done = true;
      group.scale.setScalar(1);
    }
  }
}

/** Plays the fly-in once, when a newly placed part mounts. */
function PartMount({ from, children }: { from: Vector3; children: ReactNode }) {
  const g = useRef<Group>(null);
  const [fly] = useState(() => new FlyIn());
  useFrame((_, delta) => {
    if (g.current) fly.step(g.current, from, Math.min(delta, 1 / 30));
  });
  return <group ref={g}>{children}</group>;
}

export function Slot3D({ slot, occupied, accepts, selected, showOutline, partKey, flyIn, inspect, idea = null, onActivate, children }: { slot: BoardSlot; occupied: boolean; accepts: boolean; selected: boolean; showOutline: boolean; partKey: string | null; flyIn: boolean; inspect: string | null; idea?: string | null; onActivate: () => void; children: ReactNode }) {
  const frame = useMemo(() => slotFrame(slot), [slot]);
  const pts = useMemo(() => outline(frame.half * 2 + 0.12, 0.26, 0.08), [frame.half]);
  const label = useMemo(() => new TextBoard("glass", 0.13, 24), []);
  const hit = useMemo(() => new MeshBasicMaterial({ visible: false }), []);
  const pulse = useRef<Group>(null);
  const from = useMemo(() => TRAY_AT.clone().sub(frame.centre).applyAxisAngle(new Vector3(0, 1, 0), -frame.yaw), [frame.centre, frame.yaw]);
  useEffect(() => label.set(slot.label), [label, slot.label]);
  useEffect(() => () => label.dispose(), [label]);
  useEffect(() => setAnchor(slot.id, frame.centre.clone().setY(BOARD_TOP + 0.2)), [slot.id, frame.centre]);
  useFrame((state) => {
    // Empty slots glow softly; the one the held part fits pulses harder.
    if (pulse.current) pulse.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * (accepts ? 6 : 2.4)) * (accepts ? 0.045 : 0.015));
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (accepts) vfx.ring({ at: [frame.centre.x, BOARD_TOP + 0.01, frame.centre.z], color: LAB.robotics.gold, from: 0.05, to: 0.32, life: 0.45 });
    onActivate();
  };

  return (
    <group position={frame.centre} rotation={[0, frame.yaw, 0]}>
      <mesh
        material={hit}
        position={[0, 0.12, 0]}
        onClick={click}
        onPointerOver={(e) => {
          e.stopPropagation();
          hoverCursor(true);
        }}
        onPointerOut={() => hoverCursor(false)}
      >
        <boxGeometry args={[frame.half * 2 + 0.16, 0.26, 0.32]} />
      </mesh>
      {/* Selected: a gold ring round the slot (a filled plane read as a glow on the board). */}
      {selected && occupied && !accepts && <Line points={pts} position={[0, 0.006, 0]} color={LAB.robotics.gold} lineWidth={2.5} />}
      {accepts && (
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[frame.half * 2 + 0.12, 0.26]} />
          <meshBasicMaterial color={LAB.robotics.gold} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      )}
      {!occupied && (showOutline || accepts) && (
        <group ref={pulse} position={[0, 0.006, 0]}>
          <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[frame.half * 2 + 0.12, 0.26]} />
            <meshBasicMaterial color={accepts ? LAB.robotics.gold : LAB.robotics.trim} transparent opacity={accepts ? 0.4 : 0.06} depthWrite={false} />
          </mesh>
          <Line points={pts} color={accepts ? LAB.robotics.gold : LAB.robotics.trim} lineWidth={accepts ? 3 : 2} dashed dashSize={0.045} gapSize={0.03} />
          <primitive object={label.sprite} position={[0, 0.16, 0]} />
        </group>
      )}
      {selected && occupied && inspect && <InspectLabel slot={slot.id} title={inspect} idea={idea} />}
      {occupied && partKey && (flyIn ? <PartMount key={partKey} from={from}>{children}</PartMount> : <group key={partKey}>{children}</group>)}
    </group>
  );
}
