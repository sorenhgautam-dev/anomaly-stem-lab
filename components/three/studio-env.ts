import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { BackSide, BoxGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, type Texture, type WebGLRenderer } from "three";
import { PALETTE as P } from "@/lib/tokens";

/*
 * Studio lighting for a light theme (DESIGN.md §8): a warm cream room with a
 * soft warm key overhead, a cool volt rim behind, apricot bounce on one side
 * and flame on the other. Baked once per renderer into a PMREM environment
 * map, so every view gets real reflections for the cost of one texture
 * (no extra lights, no HDRI download).
 */

const cache = new WeakMap<WebGLRenderer, Texture>();

function panel(scene: Scene, color: string, intensity: number, size: [number, number], position: [number, number, number], lookAt: [number, number, number] = [0, 0, 0]) {
  const material = new MeshBasicMaterial({ color, toneMapped: false });
  material.color.multiplyScalar(intensity);
  const mesh = new Mesh(new PlaneGeometry(...size), material);
  mesh.position.set(...position);
  mesh.lookAt(...lookAt);
  scene.add(mesh);
}

export function studioEnvironment(gl: WebGLRenderer): Texture {
  const hit = cache.get(gl);
  if (hit) return hit;
  const scene = new Scene();
  const room = new MeshBasicMaterial({ color: P.cream[200], side: BackSide, toneMapped: false });
  room.color.multiplyScalar(0.55);
  scene.add(new Mesh(new BoxGeometry(14, 10, 14), room));
  // Key: a big warm softbox overhead and in front.
  panel(scene, "#fff4e6", 5.5, [7, 4], [0, 4.6, 3]);
  // Fill: a soft white card low in front.
  panel(scene, "#ffffff", 1.6, [8, 2.4], [0, -1.6, 6.4]);
  // Bounce: apricot left, flame right.
  panel(scene, P.apricot[400], 2.6, [3, 6], [-6.4, 0.4, 0.6]);
  panel(scene, P.flame[400], 1.8, [3, 6], [6.4, 0.2, 0.4]);
  // Rim: a cool volt strip behind.
  panel(scene, P.volt[400], 3.2, [9, 1.6], [0, 2.4, -6.4]);
  const pmrem = new PMREMGenerator(gl);
  const texture = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as MeshBasicMaterial).dispose();
    }
  });
  cache.set(gl, texture);
  return texture;
}

/** Light the current view's scene with the studio environment. */
export function useStudioEnvironment(intensity = 1): void {
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    // Read through get(): inside a <View> this is the view's own scene.
    const { gl, scene } = get();
    scene.environment = studioEnvironment(gl);
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
    };
  }, [get, intensity]);
}
