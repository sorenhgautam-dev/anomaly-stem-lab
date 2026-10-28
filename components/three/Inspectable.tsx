"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Vector3, type Group, type Sprite } from "three";
import { prefersReducedMotion } from "@/lib/motion";
import { Spring } from "@/lib/motion-loop";
import { softClick } from "@/lib/sound";
import { TextBoard } from "@/components/lab3d/kit/TextBoard";

/*
 * Makes a 3D object you can handle (CLAUDE.md §3.6, DESIGN.md §9.1): hover
 * lifts it on a spring and tilts it toward the cursor (the soft cursor's ring
 * opens); a click pops a paper label over it with its name and live values
 * (pattern studied from Aceternity's "Animated Tooltip", our own code); a
 * drag spins it round, and it eases back home when let go. Values are read
 * every frame, so a label keeps up with the simulator. Reduced motion: no
 * lift or tilt, the label still opens.
 */

const TAP = 5;
const at = new Vector3();

export function Inspectable({ name, values, height = 0.5, children }: { name: string; values?: () => string; height?: number; children: ReactNode }) {
  const lift = useRef<Group>(null);
  const turn = useRef<Group>(null);
  const sprite = useRef<Sprite>(null);
  const [label] = useState(() => new TextBoard("glass", 0.1, 22));
  const [still] = useState(prefersReducedMotion);
  const s = useRef({ hover: false, open: false, drag: false, x0: 0, last: 0, moved: 0, yaw: new Spring(0, 60, 9), y: new Spring(0, 220, 14), tilt: new Spring(0, 160, 14), show: new Spring(0, 260, 16), aim: 0 });
  useEffect(() => () => label.dispose(), [label]);
  useEffect(
    () => () => {
      delete document.body.dataset.cursor;
    },
    [],
  );

  useFrame((_, delta) => {
    const st = s.current;
    const dt = Math.min(delta, 1 / 30);
    st.y.target = st.hover && !still ? 0.06 : 0;
    st.tilt.target = st.hover && !still ? st.aim * 0.22 : 0;
    st.show.target = st.open ? 1 : 0;
    // Let go of a drag: it eases back to where it was.
    if (!st.drag) st.yaw.target = 0;
    st.y.step(dt);
    st.tilt.step(dt);
    st.yaw.step(dt);
    st.show.step(dt);
    if (lift.current) {
      lift.current.position.y = st.y.x;
      lift.current.rotation.z = -st.tilt.x;
    }
    if (turn.current) turn.current.rotation.y = st.yaw.x;
    const k = Math.max(0, st.show.x);
    const tag = sprite.current;
    if (!tag) return;
    tag.visible = k > 0.01;
    if (tag.visible) label.set(values ? `${name}\n${values()}` : name);
    tag.material.opacity = Math.min(1, k);
    tag.position.set(0, height + 0.08 + 0.06 * k, 0);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    s.current.hover = true;
    document.body.dataset.cursor = "hover";
  };
  const out = () => {
    s.current.hover = false;
    if (!s.current.drag) delete document.body.dataset.cursor;
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    const st = s.current;
    // Which side of the object the cursor is on, for the tilt (-1 left … 1 right).
    if (lift.current) st.aim = Math.max(-1, Math.min(1, (e.point.x - lift.current.getWorldPosition(at).x) * 4));
    if (!st.drag) return;
    const dx = e.clientX - st.last;
    st.last = e.clientX;
    st.moved += Math.abs(dx);
    st.yaw.target += dx * 0.012;
    st.yaw.x += dx * 0.012;
  };
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const st = s.current;
    st.drag = true;
    st.x0 = st.last = e.clientX;
    st.moved = 0;
    (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    const st = s.current;
    if (!st.drag) return;
    st.drag = false;
    if (!st.hover) delete document.body.dataset.cursor;
    if (st.moved < TAP) {
      e.stopPropagation();
      st.open = !st.open;
      softClick();
    }
  };

  return (
    <group ref={lift}>
      <group ref={turn} onPointerOver={over} onPointerOut={out} onPointerMove={move} onPointerDown={down} onPointerUp={up}>
        {children}
      </group>
      <primitive ref={sprite} object={label.sprite} />
    </group>
  );
}
