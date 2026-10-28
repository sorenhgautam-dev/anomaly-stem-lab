"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshBasicMaterial, type Mesh } from "three";
import type { LabId } from "@/engine/types";
import { prefersReducedMotion } from "@/lib/motion";
import { useLab, verdictShown } from "@/lib/store";
import { PALETTE as P } from "@/lib/tokens";
import { BENCH } from "./set/bench-size";
import { LOOK } from "./set/look";

/*
 * Life in the bright studio (DESIGN.md §8.1, CLAUDE.md §3.6 "more life and
 * detail, never clutter"): the band under the bench's edge glows in the
 * lab's gold, and two status lights on the cabinet breathe while you build,
 * blink gold while it runs and settle green or red with the verdict. The
 * experiment on the bench stays the focus: everything here is small or soft.
 * (Tried and dropped: big floating shapes, as on the landing, which landed in
 * the HUD's corners; and dust motes, which drifted across the walls with no
 * beam to sit in and read as twinkle, DESIGN.md §0.)
 */

/** The bench's lit front edge and two status lights that follow the run. */
function BenchLights({ lab, still }: { lab: LabId; still: boolean }) {
  const phase = useLab((s) => s.phase);
  const verdict = useLab(verdictShown);
  const tint = LOOK[lab].accent;
  const mats = useMemo(() => ({ strip: new MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.55, toneMapped: false }), a: new MeshBasicMaterial({ color: P.verify[500], toneMapped: false }), b: new MeshBasicMaterial({ color: P.verify[500], toneMapped: false }) }), [tint]);
  const strip = useRef<Mesh>(null);
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useFrame(({ clock }) => {
    if (!a.current || !b.current || !strip.current) return;
    const t = clock.elapsedTime;
    const color = phase === "running" ? tint : verdict === "wrong" ? P.anomaly[500] : P.verify[500];
    const rate = phase === "running" ? 9 : 1.6;
    // Reduced motion: a steady glow in the phase's colour, no blinking.
    const glow = still ? 0.8 : phase === "running" ? (Math.sin(t * rate) > 0 ? 1 : 0.25) : 0.55 + Math.sin(t * rate) * 0.45;
    (a.current.material as MeshBasicMaterial).color.set(color).multiplyScalar(0.4 + glow * 0.9);
    (b.current.material as MeshBasicMaterial).color.set(color).multiplyScalar(0.4 + (phase === "running" && !still ? 1.25 - glow : glow) * 0.9);
    (strip.current.material as MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 0.8) * 0.08;
    a.current.scale.setScalar(0.9 + glow * 0.2);
  });
  return (
    <group>
      {/* The strip runs along the band under the worktop's edge; the lights sit on the panel right of the doors. */}
      <mesh ref={strip} position={[0, BENCH.band.at[1], BENCH.band.at[2] + BENCH.band.size[2] / 2 + 0.004]} material={mats.strip}>
        <boxGeometry args={[5.9, 0.024, 0.012]} />
      </mesh>
      <mesh ref={a} position={[2.25, -0.62, BENCH.front + 0.02]} material={mats.a}>
        <sphereGeometry args={[0.034, 16, 12]} />
      </mesh>
      <mesh ref={b} position={[2.42, -0.62, BENCH.front + 0.02]} material={mats.b}>
        <sphereGeometry args={[0.034, 16, 12]} />
      </mesh>
    </group>
  );
}

export function StudioLife({ lab }: { lab: LabId }) {
  const [still] = useState(prefersReducedMotion);
  return <BenchLights lab={lab} still={still} />;
}
