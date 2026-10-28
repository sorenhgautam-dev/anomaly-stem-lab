import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { BackSide, BoxGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, type Texture, type WebGLRenderer } from "three";
import { LAB, PALETTE as P } from "@/lib/tokens";

/*
 * Studio lighting (DESIGN.md §8): a room, a soft key overhead, a fill in
 * front, a bounce on both sides and a rim behind. The site's studios are in
 * one hue (apricot, or volt; never both: a volt rim on apricot objects reads
 * as an iridescent lilac edge, which §0 bans); each lab has its own (RIGS).
 * Baked once per renderer and rig into a PMREM environment map, so every
 * view gets real reflections for the cost of one texture (no extra lights,
 * no HDRI download).
 */

export type Bounce = "apricot" | "volt" | "chemistry" | "robotics";

const cache = new WeakMap<WebGLRenderer, Partial<Record<Bounce, Texture>>>();

function panel(scene: Scene, color: string, intensity: number, size: [number, number], position: [number, number, number], lookAt: [number, number, number] = [0, 0, 0]) {
  const material = new MeshBasicMaterial({ color, toneMapped: false });
  material.color.multiplyScalar(intensity);
  const mesh = new Mesh(new PlaneGeometry(...size), material);
  mesh.position.set(...position);
  mesh.lookAt(...lookAt);
  scene.add(mesh);
}

/** One studio: the room's colour, the key, and the left bounce, right bounce and rim behind (colour, strength). */
interface Rig {
  room: [string, number];
  key: [string, number];
  left: [string, number];
  right: [string, number];
  rim: [string, number];
}

/*
 * The site's studios use one hue each (apricot or volt). The labs (DESIGN.md
 * §8 colour worlds) reflect their own rooms: Chemistry a teal room with a
 * sand-gold and a sage bounce; Robotics a graphite room with a teal and a
 * gold bounce. Both labs get a strong white rim behind, so apparatus edges
 * separate from the walls, and a clean white key, so whites stay white.
 */
const RIGS: Record<Bounce, Rig> = {
  apricot: { room: [P.cream[200], 0.55], key: ["#fff4e6", 5.5], left: [P.apricot[400], 2.6], right: [P.apricot[300], 1.8], rim: ["#fff0dc", 3.2] },
  volt: { room: [P.volt[100], 0.55], key: [P.white, 5.5], left: [P.volt[400], 2.6], right: [P.volt[300], 1.8], rim: [P.volt[400], 3.2] },
  chemistry: { room: [LAB.chemistry.wall, 0.6], key: ["#fff8ee", 5.8], left: [LAB.chemistry.gold, 1.7], right: [LAB.chemistry.sage, 1.5], rim: ["#fffaf2", 5.2] },
  robotics: { room: [LAB.robotics.wall, 0.8], key: [P.white, 6.4], left: [LAB.robotics.teal, 1.3], right: [LAB.robotics.gold, 1.1], rim: [P.white, 5.6] },
};

export function studioEnvironment(gl: WebGLRenderer, bounce: Bounce = "apricot"): Texture {
  const hit = cache.get(gl)?.[bounce];
  if (hit) return hit;
  const rig = RIGS[bounce];
  const scene = new Scene();
  const room = new MeshBasicMaterial({ color: rig.room[0], side: BackSide, toneMapped: false });
  room.color.multiplyScalar(rig.room[1]);
  scene.add(new Mesh(new BoxGeometry(14, 10, 14), room));
  // Key: a big softbox overhead and in front.
  panel(scene, rig.key[0], rig.key[1], [7, 4], [0, 4.6, 3]);
  // Fill: a soft white card low in front.
  panel(scene, "#ffffff", 1.6, [8, 2.4], [0, -1.6, 6.4]);
  // Bounces, stronger on the left.
  panel(scene, rig.left[0], rig.left[1], [3, 6], [-6.4, 0.4, 0.6]);
  panel(scene, rig.right[0], rig.right[1], [3, 6], [6.4, 0.2, 0.4]);
  // Rim: a strip behind.
  panel(scene, rig.rim[0], rig.rim[1], [9, 1.6], [0, 2.4, -6.4]);
  const pmrem = new PMREMGenerator(gl);
  const texture = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as MeshBasicMaterial).dispose();
    }
  });
  cache.set(gl, { ...cache.get(gl), [bounce]: texture });
  return texture;
}

const visorCache = new WeakMap<WebGLRenderer, Texture>();

/**
 * Ano's visor reflects its own small studio (DESIGN.md §6): a dark room and
 * one wide softbox above and in front, with a faint warm card to one side.
 * On the visor's curve that reads as one clean highlight sweeping across its
 * top, never as bars across the face (the main studio's strips would).
 */
export function visorEnvironment(gl: WebGLRenderer): Texture {
  const hit = visorCache.get(gl);
  if (hit) return hit;
  const scene = new Scene();
  const room = new MeshBasicMaterial({ color: "#050505", side: BackSide, toneMapped: false });
  scene.add(new Mesh(new BoxGeometry(14, 10, 14), room));
  panel(scene, "#ffffff", 3.4, [9, 2.2], [0, 4.4, 3.6]);
  panel(scene, P.apricot[300], 0.7, [2, 5], [-6.4, 0.2, 2]);
  const pmrem = new PMREMGenerator(gl);
  const texture = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as MeshBasicMaterial).dispose();
    }
  });
  visorCache.set(gl, texture);
  return texture;
}

/** Light the current view's scene with the studio environment. */
export function useStudioEnvironment(intensity = 1, bounce: Bounce = "apricot"): void {
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    // Read through get(): inside a <View> this is the view's own scene.
    const { gl, scene } = get();
    scene.environment = studioEnvironment(gl, bounce);
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
    };
  }, [get, intensity, bounce]);
}
