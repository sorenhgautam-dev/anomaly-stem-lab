"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { TOKENS } from "@/lib/tokens";

/*
 * A studio built from Lightformers, rendered once into the environment map
 * (no HDRI download, so it works offline). Softboxes in pearl plus strips in
 * lilac and signal give every glossy surface brand-coloured highlights. The
 * environment rotates with the pointer, so highlights sweep across the
 * objects as the cursor moves (CLAUDE.md §3.1.4).
 */

export function StudioLighting() {
  useFrame((state, delta) => {
    const rot = state.scene.environmentRotation;
    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 2.5);
    rot.y += (state.pointer.x * 0.9 + state.clock.elapsedTime * 0.02 - rot.y) * k;
    rot.x += (-state.pointer.y * 0.25 - rot.x) * k;
  });

  return (
    <>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={[TOKENS.void]} />
        <Lightformer form="rect" intensity={3.2} color={TOKENS.pearl} position={[0, 6, -1]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={2.6} color={TOKENS.lilac} position={[-7, 1.5, 1]} rotation-y={Math.PI / 2} scale={[9, 1.6, 1]} />
        <Lightformer form="rect" intensity={2.4} color={TOKENS.signal} position={[7, 0.5, -1]} rotation-y={-Math.PI / 2} scale={[9, 1, 1]} />
        <Lightformer form="ring" intensity={2.4} color={TOKENS.pearl} position={[0, 1.5, 9]} scale={3.5} />
        <Lightformer form="rect" intensity={1.2} color={TOKENS.pearl} position={[0, 2, -9]} scale={[14, 2, 1]} />
        {/* Broad, dim front fill so polished metal reads as metal, not black. */}
        <Lightformer form="rect" intensity={0.55} color={TOKENS.pearl} position={[0, 0, 10]} scale={[30, 12, 1]} />
        <Lightformer form="rect" intensity={0.35} color={TOKENS.lilac} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
      </Environment>
      <directionalLight position={[4, 6, 5]} intensity={1.1} color={TOKENS.pearl} />
    </>
  );
}
