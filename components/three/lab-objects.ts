import {
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETTE as P } from "@/lib/tokens";

/*
 * The two lab objects (DESIGN.md §7.1 "Two labs", §7.3): a glass flask of
 * glossy coloured liquid with rising bubbles for Chemistry, and a little
 * Ano-style rover for Robotics. Built from primitives; each returns its group
 * and a per-frame update. The glass is faked with gloss and transparency
 * (real transmission is kept for one object per screen, CLAUDE.md §9).
 */

export interface LabObject {
  root: Group;
  update: (t: number, dt: number) => void;
}

/** Erlenmeyer flask outline, bottom to rim (radius, height). */
const FLASK: [number, number][] = [
  [0.001, -0.66],
  [0.5, -0.66],
  [0.64, -0.6],
  [0.68, -0.5],
  [0.2, 0.42],
  [0.17, 0.5],
  [0.17, 1.02],
  [0.2, 1.06],
];
const LIQUID_TOP = -0.05;

function radiusAt(y: number): number {
  for (let i = 1; i < FLASK.length; i++) {
    const [r0, y0] = FLASK[i - 1];
    const [r1, y1] = FLASK[i];
    if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
  }
  return 0.17;
}

export function createFlask(): LabObject {
  const root = new Group();
  const glass = new MeshPhysicalMaterial({ color: P.white, transparent: true, opacity: 0.28, roughness: 0.04, clearcoat: 1, iridescence: 0.5, iridescenceIOR: 1.3, side: DoubleSide, depthWrite: false });
  const liquidMat = new MeshPhysicalMaterial({ color: P.flame[400], emissive: P.apricot[500], emissiveIntensity: 0.25, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.92 });
  root.add(new Mesh(new LatheGeometry(FLASK.map(([r, y]) => new Vector2(r, y)), 56), glass));
  const rim = new Mesh(new TorusGeometry(0.19, 0.025, 10, 40).rotateX(Math.PI / 2), glass);
  rim.position.y = 1.06;
  root.add(rim);
  // The liquid: the flask's lower part, a little inside the glass.
  const inner = FLASK.filter(([, y]) => y <= LIQUID_TOP).map(([r, y]) => new Vector2(Math.max(0.001, r * 0.95), y + 0.025));
  inner.push(new Vector2(radiusAt(LIQUID_TOP) * 0.95, LIQUID_TOP));
  const liquid = new Group();
  liquid.add(new Mesh(new LatheGeometry(inner, 56), liquidMat));
  const surface = new Mesh(new CircleGeometry(radiusAt(LIQUID_TOP) * 0.95, 48).rotateX(-Math.PI / 2), liquidMat);
  surface.position.y = LIQUID_TOP;
  liquid.add(surface);
  root.add(liquid);
  // Bubbles rising through the liquid, recycled.
  const bubbles = new InstancedMesh(new SphereGeometry(0.035, 10, 8), new MeshStandardMaterial({ color: P.white, transparent: true, opacity: 0.7, roughness: 0.1 }), 10);
  root.add(bubbles);
  const seeds = Array.from({ length: 10 }, (_, i) => ({ x: Math.sin(i * 2.4) * 0.3, z: Math.cos(i * 1.7) * 0.25, speed: 0.25 + (i % 4) * 0.08, offset: i * 0.37 }));
  const o = new Object3D();
  return {
    root,
    update: (t) => {
      // A gentle slosh: the surface tilts against the flask's sway.
      surface.rotation.z = Math.sin(t * 1.3) * 0.05;
      seeds.forEach((b, i) => {
        const span = LIQUID_TOP + 0.6;
        const y = -0.6 + ((t * b.speed + b.offset) % 1) * span;
        o.position.set(b.x * (radiusAt(y) / 0.68), y, b.z * (radiusAt(y) / 0.68));
        o.scale.setScalar(0.6 + ((t * b.speed + b.offset) % 1) * 0.8);
        o.updateMatrix();
        bubbles.setMatrixAt(i, o.matrix);
      });
      bubbles.instanceMatrix.needsUpdate = true;
    },
  };
}

export function createRover(): LabObject {
  const root = new Group();
  const white = new MeshPhysicalMaterial({ color: P.white, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
  const volt = new MeshPhysicalMaterial({ color: P.volt[500], roughness: 0.35, clearcoat: 0.5 });
  const dark = new MeshPhysicalMaterial({ color: "#1b1b22", roughness: 0.5 });
  const eye = new MeshStandardMaterial({ color: "#0f1020", emissive: P.volt[300], emissiveIntensity: 1.6 });
  const body = new Mesh(new RoundedBoxGeometry(1.25, 0.62, 0.95, 5, 0.2), white);
  body.position.y = 0;
  root.add(body);
  const stripe = new Mesh(new RoundedBoxGeometry(1.27, 0.12, 0.97, 3, 0.05), volt);
  stripe.position.y = -0.05;
  root.add(stripe);
  const head = new Group();
  head.position.set(0, 0.5, 0.05);
  root.add(head);
  head.add(new Mesh(new SphereGeometry(0.34, 32, 24), white));
  const visor = new Mesh(new RoundedBoxGeometry(0.46, 0.2, 0.08, 3, 0.06), eye);
  visor.position.set(0, 0.02, 0.31);
  head.add(visor);
  const antenna = new Mesh(new CylinderGeometry(0.015, 0.02, 0.26, 10), white);
  antenna.position.set(0.12, 0.42, 0);
  head.add(antenna);
  const tip = new Mesh(new SphereGeometry(0.055, 16, 12), new MeshPhysicalMaterial({ color: P.grape[500], roughness: 0.3, clearcoat: 0.6 }));
  tip.position.set(0.12, 0.56, 0);
  head.add(tip);
  const wheels: Mesh[] = [];
  for (const x of [-0.5, 0.5]) {
    for (const z of [-0.36, 0.36]) {
      const w = new Mesh(new CylinderGeometry(0.2, 0.2, 0.14, 24).rotateZ(Math.PI / 2), dark);
      w.position.set(x * 1.06, -0.32, z);
      const hub = new Mesh(new CylinderGeometry(0.08, 0.08, 0.15, 16).rotateZ(Math.PI / 2), volt);
      w.add(hub);
      root.add(w);
      wheels.push(w);
    }
  }
  return {
    root,
    update: (t, dt) => {
      for (const w of wheels) w.rotation.x += dt * 2.2;
      body.position.y = Math.sin(t * 6) * 0.008;
      head.rotation.z = Math.sin(t * 1.1) * 0.08;
    },
  };
}
