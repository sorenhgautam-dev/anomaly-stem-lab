"use client";

import { useMemo, type ReactNode } from "react";
import { useQuality } from "@/lib/quality";
import type { Getter } from "../chem/glass";
import { canvasTexture, decalMaterial } from "../detail";
import { kitMaterial } from "../materials";
import { Colony, dealSpots, spots } from "./Dish3D";

/*
 * A microscope's field of view, standing on the bench in 3D (the cancer
 * labs' main view): a large dark round field, a thin brushed-steel rim and a
 * soft vignette inside it, with living cells glowing in the lab's colours on
 * top. It reads like looking down a real microscope from any camera angle
 * that looks down on it. Children sit on the field (y = 0 is its surface).
 */

const FIELD = "#0d0f11";

export function Field3D({ radius = 0.6, position, children }: { radius?: number; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const vignette = useMemo(() => {
    const tex = canvasTexture("field-vignette", 256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    return decalMaterial("field-vignette", tex);
  }, []);
  return (
    <group position={position}>
      {/* The field: a low, round, dark stage the cells sit on. */}
      <mesh position={[0, 0.012, 0]} material={kitMaterial("satin", tier, FIELD)}>
        <cylinderGeometry args={[radius, radius, 0.024, 96]} />
      </mesh>
      {/* The thin steel rim round its edge. */}
      <mesh position={[0, 0.026, 0]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("steel", tier)}>
        <torusGeometry args={[radius, 0.012, 16, 128]} />
      </mesh>
      <group position={[0, 0.025, 0]}>{children}</group>
      {/* The vignette, just above the cells' feet so the edge of the field falls into shadow. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} material={vignette} renderOrder={4}>
        <circleGeometry args={[radius, 96]} />
      </mesh>
    </group>
  );
}

export interface FieldKind {
  key: string;
  color: string;
  count: Getter<number>;
  faded?: Getter<number>;
}

/** Several kinds of living cells mixed in one field: one spiral of spots dealt to the kinds in turn (as MicroscopeMix on the page). */
export function MixedCells({ kinds, room, radius, size }: { kinds: FieldKind[]; room: number; radius: number; size: number }) {
  const n = kinds.length;
  const dealt = useMemo(() => dealSpots(spots(room * n, radius), n), [room, n, radius]);
  return (
    <>
      {kinds.map((k, i) => (
        <Colony key={k.key} count={k.count} room={room} at={dealt[i]} size={size} color={k.color} faded={k.faded} y={size * 0.6} glow={0.32} />
      ))}
    </>
  );
}
