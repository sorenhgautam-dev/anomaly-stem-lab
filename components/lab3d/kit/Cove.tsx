"use client";

import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, MeshStandardMaterial } from "three";

/*
 * A curved backdrop with no join (a photo studio's "cove", DESIGN.md §8 "lab
 * sets"): the floor sweeps up into the back wall with no edge, in the lab's
 * colour, so a small scene sits in a place rather than floating in empty
 * space. Built as one grid: floor, a quarter-circle bend, then the wall.
 */

function coveGeometry(width: number, depth: number, height: number, bend: number, columns = 2, rows = 40): BufferGeometry {
  // The profile in (z, y): from the front of the floor, back to the bend, round it, up the wall.
  const profile: [number, number][] = [];
  const floorEnd = -depth / 2 + bend;
  const steps = rows;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const floorLen = depth - bend;
    const arcLen = (Math.PI / 2) * bend;
    const wallLen = height - bend;
    const total = floorLen + arcLen + wallLen;
    const d = k * total;
    if (d <= floorLen) profile.push([depth / 2 - d, 0]);
    else if (d <= floorLen + arcLen) {
      const a = (d - floorLen) / bend;
      profile.push([floorEnd - Math.sin(a) * bend, bend - Math.cos(a) * bend]);
    } else profile.push([-depth / 2, bend + (d - floorLen - arcLen)]);
  }
  const positions: number[] = [];
  const index: number[] = [];
  for (let c = 0; c <= columns; c++) {
    const x = -width / 2 + (c / columns) * width;
    for (const [z, y] of profile) positions.push(x, y, z);
  }
  const per = profile.length;
  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < per - 1; r++) {
      const a = c * per + r;
      const b = (c + 1) * per + r;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

export function Cove({ color, width = 7, depth = 3, height = 3, bend = 0.9, y = 0 }: { color: string; width?: number; depth?: number; height?: number; bend?: number; y?: number }) {
  const geometry = useMemo(() => coveGeometry(width, depth, height, bend), [width, depth, height, bend]);
  const material = useMemo(() => new MeshStandardMaterial({ color, roughness: 0.92 }), [color]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <mesh geometry={geometry} material={material} position={[0, y, -0.4]} />;
}
