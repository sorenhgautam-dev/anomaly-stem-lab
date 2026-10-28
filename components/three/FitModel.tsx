"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Box3, InstancedMesh, Matrix4, Mesh, Sprite, Vector3, type Group, type Object3D } from "three";

/*
 * Fits a kit model into a box `width` wide and `height` tall, centred on x
 * and z and standing on y = 0, measured once its meshes exist (the first
 * frame after mount). Kit models are drawn at lab scale with their own
 * origins; this lets a page show any of them at a chosen size. Floating
 * labels and glows (sprites) are hidden: they belong to the lab. Particle
 * clouds (instanced meshes) are left out of the measuring.
 */

/** The visible meshes' box in `frame`'s own space (sprites and particle clouds don't count). */
function meshBox(root: Object3D, frame: Object3D): Box3 {
  const box = new Box3();
  const part = new Box3();
  frame.updateWorldMatrix(true, true);
  root.traverseVisible((o) => {
    if (!(o instanceof Mesh) || o instanceof Sprite || o instanceof InstancedMesh) return;
    const g = o.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    if (g.boundingBox) box.union(part.copy(g.boundingBox).applyMatrix4(o.matrixWorld));
  });
  return box.isEmpty() ? box : box.applyMatrix4(new Matrix4().copy(frame.matrixWorld).invert());
}

export function FitModel({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const fitted = useRef(false);
  useFrame(() => {
    const o = outer.current;
    const i = inner.current;
    if (fitted.current || !o || !i) return;
    i.scale.setScalar(1);
    i.position.set(0, 0, 0);
    const box = meshBox(i, o);
    if (box.isEmpty()) return;
    const size = box.getSize(new Vector3());
    const k = Math.min(height / Math.max(size.y, 0.01), width / Math.max(size.x, size.z, 0.01));
    const centre = box.getCenter(new Vector3());
    i.scale.setScalar(k);
    i.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);
    i.traverse((obj) => {
      if (obj instanceof Sprite) obj.visible = false;
    });
    fitted.current = true;
  });
  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  );
}
