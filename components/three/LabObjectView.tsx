"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import type { Group } from "three";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion";
import { Spring } from "@/components/ano/spring";
import { createFlask, createRover, type LabObject } from "./lab-objects";
import { pointer } from "./pointer";
import { useStudioEnvironment } from "./studio-env";
import { useViewPresence } from "./frameloop";

/*
 * A lab's 3D object in the page layout (drawn by the site canvas): it drifts
 * and turns slowly, leans toward the cursor, and grows a little when the
 * cursor is over its card (DESIGN.md §9.1).
 */

/** Drift, lean toward the cursor, grow when the cursor is over the card. */
class ObjectMotion {
  private yaw = new Spring(0, 40, 9);
  private pitch = new Spring(0, 40, 9);
  private scale = new Spring(1, 120, 12);
  private t = 0;
  constructor(
    private object: LabObject,
    private reduced: boolean,
  ) {}

  step(g: Group, dt: number, r: DOMRect | undefined): void {
    this.t += this.reduced ? 0 : dt;
    this.object.update(this.t, this.reduced ? 0 : dt);
    let yaw = Math.sin(this.t * 0.4) * 0.35;
    let pitch = 0;
    let over = false;
    if (r && pointer.active) {
      yaw += ((pointer.x - (r.left + r.width / 2)) / Math.max(400, r.width)) * 0.9;
      pitch = ((pointer.y - (r.top + r.height / 2)) / Math.max(400, r.height)) * 0.5;
      over = pointer.x > r.left && pointer.x < r.right && pointer.y > r.top && pointer.y < r.bottom;
    }
    g.rotation.set(this.pitch.step(pitch, dt), this.yaw.step(yaw, dt), 0);
    g.position.y = Math.sin(this.t * 1.2) * 0.05;
    g.scale.setScalar(this.scale.step(over ? 1.08 : 1, dt));
  }
}

function LabObjectScene({ kind, track }: { kind: "flask" | "robot"; track: React.RefObject<HTMLElement | null> }) {
  useStudioEnvironment(1.15);
  const [object] = useState<LabObject>(() => (kind === "flask" ? createFlask() : createRover()));
  // Canvas-only (never server-rendered), so reading the media query here is safe.
  const [motion] = useState(() => new ObjectMotion(object, prefersReducedMotion()));
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    const card = track.current?.closest("[data-lab-card]") ?? track.current;
    motion.step(group.current, Math.min(delta, 1 / 30), card?.getBoundingClientRect());
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.35, 4.6]} fov={30} onUpdate={(c) => c.lookAt(0, kind === "flask" ? 0.18 : 0.1, 0)} />
      <group ref={group}>
        <primitive object={object.root} />
      </group>
    </>
  );
}

export function LabObjectView({ kind, className }: { kind: "flask" | "robot"; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <div aria-hidden className={cn("relative", className)}>
      <View ref={track} className="absolute inset-0">
        <LabObjectScene kind={kind} track={track} />
      </View>
    </div>
  );
}
