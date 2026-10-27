"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { LabId } from "@/engine/types";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../kit/materials";

/*
 * The bright studio lab (DESIGN.md §8): a seamless studio (a cream floor that
 * fades into a gradient backdrop, so there's no horizon line), lit by soft
 * lab-tinted glows (warm apricot and flame for Chemistry, cool volt and grape
 * for Robotics), a rounded clay bench, and a contact shadow under the
 * apparatus baked when the build changes rather than every frame.
 */

/** The backdrop: a soft vertical gradient lit by two lab-tinted glows (a screen-space background, so it has no seams). */
function backdrop(lab: LabId) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const [top, a, b] = lab === "chemistry" ? [P.flame[200], P.apricot[300], P.flame[300]] : [P.volt[100], P.volt[300], P.grape[300]];
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(0.55, P.cream[50]);
  g.addColorStop(1, P.cream[100]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  const blob = (x: number, y: number, r: number, color: string, alpha: number) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`);
    rg.addColorStop(1, `${color}00`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 256, 512);
  };
  blob(40, 120, 190, a, 0.55);
  blob(230, 60, 170, b, 0.5);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The floor: cream at the centre, fading out at the edge into the backdrop. */
function floorTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `${P.cream[100]}ff`);
  g.addColorStop(0.6, `${P.cream[100]}ee`);
  g.addColorStop(1, `${P.cream[100]}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function Studio({ lab, shadowKey }: { lab: LabId; shadowKey: string }) {
  const tier = useQuality((s) => s.level);
  const get = useThree((s) => s.get);
  const floor = useMemo(() => floorTexture(), []);
  useEffect(() => {
    // The view's own scene gets the backdrop (drawn behind everything in its rectangle).
    const scene = get().scene;
    const bg = backdrop(lab);
    scene.background = bg;
    return () => {
      scene.background = null;
      bg.dispose();
    };
  }, [get, lab]);
  const benchTint = lab === "chemistry" ? P.apricot[100] : P.volt[100];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.28, 0]}>
        <circleGeometry args={[11, 64]} />
        <meshBasicMaterial map={floor} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* The bench: a rounded clay slab on a plinth. */}
      <RoundedBox args={[6.4, 0.32, 3.2]} radius={0.16} smoothness={4} position={[0, -0.16, 0.2]} material={kitMaterial("clay", tier, benchTint)} />
      <RoundedBox args={[5.6, 0.95, 2.6]} radius={0.2} smoothness={3} position={[0, -0.8, 0.15]} material={kitMaterial("clay", tier, lab === "chemistry" ? P.apricot[200] : P.volt[300])} />
      <ContactShadows key={shadowKey} frames={tier === "low" ? 1 : 2} position={[0, 0.002, 0.2]} scale={7} far={1.6} blur={2.4} opacity={0.38} resolution={tier === "low" ? 256 : 512} color="#7a4a26" />
    </group>
  );
}
