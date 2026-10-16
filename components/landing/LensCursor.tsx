"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MeshPhysicalMaterial, Raycaster, Vector3, type Mesh } from "three";
import { TOKENS } from "@/lib/tokens";
import { geos } from "./geometries";
import { live } from "./live";

/*
 * The system cursor is hidden and replaced by a small glass sphere that
 * refracts whatever is behind it (CLAUDE.md §3.1.1). It grows over buttons.
 *
 * It uses the built-in physical transmission, which shares the one
 * transmission pass the glassware already needs. drei's
 * MeshTransmissionMaterial re-rendered the whole scene for the lens alone and
 * halved the frame rate on Retina screens.
 */

const DEPTH = 3;
const RADIUS = 0.1;

export function LensCursor() {
  const mesh = useRef<Mesh>(null);
  const frame = useRef({ ray: new Raycaster(), target: new Vector3(), pos: new Vector3(), scale: 0, placed: false });
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color(TOKENS.pearl),
        transmission: 1,
        thickness: 0.55,
        roughness: 0,
        ior: 1.5,
        attenuationColor: new Color(TOKENS.lilac),
        attenuationDistance: 3,
        clearcoat: 1,
        clearcoatRoughness: 0,
        iridescence: 0.35,
        iridescenceIOR: 1.3,
        envMapIntensity: 1.4,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const lens = mesh.current;
    const s = frame.current;
    if (!lens) return;
    s.ray.setFromCamera(state.pointer, state.camera);
    s.target.copy(s.ray.ray.origin).addScaledVector(s.ray.ray.direction, DEPTH);
    if (!s.placed) {
      s.pos.copy(s.target);
      s.placed = true;
    } else {
      s.pos.lerp(s.target, 1 - Math.exp(-delta * 18));
    }
    lens.position.copy(s.pos);
    const goal = live.pointerActive ? (live.lensHover ? 1.9 : 1) : 0;
    s.scale += (goal - s.scale) * (1 - Math.exp(-delta * 10));
    lens.scale.setScalar(Math.max(s.scale, 1e-4) * RADIUS);
    lens.visible = s.scale > 0.02;
  });

  return <mesh ref={mesh} geometry={geos().ball} material={material} renderOrder={10} />;
}
