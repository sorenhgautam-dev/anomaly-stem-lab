"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { roomGeos } from "../geometry";
import { roomMats } from "../materials";
import { room } from "../room-state";
import { Glassware, type Piece } from "./Glassware";

/*
 * A few things standing at the back of the hood, in its corners: a test-tube
 * rack on the left, a ring stand holding a flask on the right. They keep
 * to the corners (the middle belongs to the experiment) and follow the hood
 * when the window changes size.
 */

const TUBES: Piece[] = [0, 1, 2, 3, 4].map((i) => ({ vessel: "tube", at: [i * 0.055 - 0.11, 0.03, 0], scale: 1.15, tint: i }));
const FLASK: Piece[] = [{ vessel: "round", at: [0, 0.36, 0], scale: 0.95, tint: 1 }];

export function HoodProps() {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const g = roomGeos();
  const m = roomMats();

  useFrame(() => {
    const inner = room.frame.right - 0.13;
    left.current?.position.set(-inner + 0.26, 0, -0.62);
    right.current?.position.set(inner - 0.22, 0, -0.6);
  });

  return (
    <>
      <group ref={left}>
        {/* Rack: a base, two uprights and a top rail with the tubes in it. */}
        <mesh geometry={g.box} material={m.darkMetal} position={[0, 0.006, 0]} scale={[0.34, 0.012, 0.08]} />
        <mesh geometry={g.box} material={m.metal} position={[0, 0.12, 0]} scale={[0.34, 0.012, 0.07]} />
        {[-0.165, 0.165].map((x) => (
          <mesh key={x} geometry={g.box} material={m.metal} position={[x, 0.065, 0]} scale={[0.012, 0.12, 0.07]} />
        ))}
        <Glassware pieces={TUBES} />
      </group>
      <group ref={right}>
        <mesh geometry={g.box} material={m.darkMetal} position={[0, 0.008, 0]} scale={[0.22, 0.016, 0.15]} />
        <mesh geometry={g.rod} material={m.chrome} position={[0.07, 0.3, -0.03]} scale={[0.012, 0.6, 0.012]} />
        <mesh geometry={g.rod} material={m.chrome} position={[0.035, 0.35, -0.03]} rotation-z={Math.PI / 2} scale={[0.008, 0.07, 0.008]} />
        <mesh geometry={g.ring} material={m.chrome} position={[0, 0.35, 0]} rotation-x={Math.PI / 2} scale={0.12} />
        <Glassware pieces={FLASK} />
      </group>
    </>
  );
}
