import { CatmullRomCurve3, Line3, PerspectiveCamera, Vector3 } from "three";
import { CAMERA_KEYS, TITLE_CENTER, TITLE_SCALE } from "./layout";
import { mulberry32 } from "./random";
import type { ObjectKind } from "./science-objects";

/*
 * Where the floating science objects live. Pure maths with a fixed seed, so
 * the composition is the same on every visit and can be tested without a
 * renderer. Objects frame the copy and the title instead of covering them.
 */

export interface Spec {
  kind: ObjectKind;
  home: Vector3;
  rotation: [number, number, number];
  scale: number;
  seed: number;
}

const KINDS: ObjectKind[] = ["atom", "gear", "beaker", "robot", "flask", "bulb"];

const ZONES = [
  // Around the hero experiment
  { share: 0.38, x: [-5.2, 5.2], y: [-0.6, 2.8], z: [-3.6, 0.6], hero: true },
  // The corridor the camera flies down
  { share: 0.3, x: [-5.5, 6.5], y: [-0.5, 3.6], z: [-7, -3] },
  // Around the title, and the overflow from the zones above
  { share: 0.32, x: [-7.5, 7.5], y: [-0.6, 3.4], z: [-14, -7] },
] as const;

const HERO_CAM = new Vector3(...CAMERA_KEYS[0].pos);
const TAN_HALF_FOV = Math.tan((35 / 2) * (Math.PI / 180));

/** True if p would sit over the balls or where they land, seen from the hero camera at 16:10. */
function overHeroBalls(p: Vector3): boolean {
  const depth = HERO_CAM.z - p.z;
  if (depth <= 0.5) return true;
  const sx = (p.x - HERO_CAM.x) / (depth * TAN_HALF_FOV * 1.6);
  const sy = (p.y - CAMERA_KEYS[0].look[1]) / (depth * TAN_HALF_FOV);
  return Math.abs(sx) < 0.5 && sy > -0.8 && sy < 0.85;
}

/** The camera's path through the chapters (the same curve CameraRail follows). */
const RAIL = new CatmullRomCurve3(
  CAMERA_KEYS.map((k) => new Vector3(...k.pos)),
  false,
  "centripetal",
);

/** Segments from the camera, all along its path after the hero, to points along the title. */
const SIGHTLINES: Line3[] = Array.from({ length: 25 }, (_, i) => RAIL.getPoint(0.25 + i / 32)).flatMap((eye) =>
  [-3, -2, -1, 0, 1, 2, 3].map(
    (x) => new Line3(eye, new Vector3(TITLE_CENTER[0] + x * TITLE_SCALE * 1.6, TITLE_CENTER[1], TITLE_CENTER[2])),
  ),
);

/** True if p would block the camera's view of the title anywhere on its path. */
function blocksTitle(p: Vector3): boolean {
  const closest = new Vector3();
  return SIGHTLINES.some((line) => line.closestPointToPoint(p, true, closest).distanceTo(p) < 1.1);
}

interface Rect {
  x: readonly [number, number];
  y: readonly [number, number];
}

/**
 * Where the copy sits on screen in each camera view (the hero, then one per
 * chapter), in normalised device coordinates (x and y from −1 to 1, y up),
 * measured from the overlay at 1280–1920 px wide.
 */
export const COPY_REGIONS: Rect[] = [
  // Hero: the question, its setup and the guess buttons.
  { x: [-1, -0.05], y: [-0.9, 0.22] },
  // Predict, Diagnose and Break: centred on the left.
  { x: [-1, -0.1], y: [-0.32, 0.32] },
  { x: [-1, -0.1], y: [-0.32, 0.32] },
  { x: [-1, -0.1], y: [-0.32, 0.32] },
  // Rebuild: low on the left, with its button.
  { x: [-1, -0.1], y: [-0.8, -0.05] },
];

/** Rough bounding radius of a science object (they are about unit size). */
export const boundingRadius = (scale: number) => 0.65 * scale;

/**
 * Nearer than this to a camera, an object is big and bright enough to matter:
 * it must stay clear of the chapter copy and not crowd the hero view. Further
 * away the fog and the copy's scrim take over. The hero question, the first
 * thing anyone reads, is kept clear at every depth.
 */
export const NEAR_DEPTH = 12;

/** How far an object strays from home: its slow wander plus knocks from the cursor and Ano. */
const DRIFT = 0.35;

/** Screen shapes the text check covers, 3:2 through 16:9. */
const ASPECTS = [1.5, 16 / 9];

function viewCamera(key: (typeof CAMERA_KEYS)[number], aspect: number) {
  const camera = new PerspectiveCamera(35, aspect, 0.1, 80);
  camera.position.set(...key.pos);
  camera.lookAt(new Vector3(...key.look));
  camera.updateMatrixWorld();
  return camera;
}

interface Circle {
  x: number;
  y: number;
  /** Vertical radius in NDC; the horizontal one is ry / aspect. */
  ry: number;
  depth: number;
}

/** Where a sphere of this radius at p lands on screen, or null if it's behind the camera. */
function project(p: Vector3, radius: number, camera: PerspectiveCamera): Circle | null {
  const forward = camera.getWorldDirection(new Vector3());
  const depth = p.clone().sub(camera.position).dot(forward);
  if (depth < 0.1) return null;
  const ndc = p.clone().project(camera);
  return { x: ndc.x, y: ndc.y, ry: radius / (depth * TAN_HALF_FOV), depth };
}

const VIEWS = CAMERA_KEYS.flatMap((key, view) =>
  ASPECTS.map((aspect) => ({ camera: viewCamera(key, aspect), aspect, region: COPY_REGIONS[view], hero: view === 0 })),
);

/** True if an object of this radius at p would show behind the copy: any object for the hero, near ones for chapters. */
function behindCopy(p: Vector3, radius: number): boolean {
  return VIEWS.some(({ camera, aspect, region: { x, y }, hero }) => {
    const c = project(p, radius, camera);
    if (!c || (!hero && c.depth >= NEAR_DEPTH)) return false;
    const rx = c.ry / aspect;
    const qx = Math.min(x[1], Math.max(x[0], c.x));
    const qy = Math.min(y[1], Math.max(y[0], c.y));
    return ((c.x - qx) / rx) ** 2 + ((c.y - qy) / c.ry) ** 2 < 1;
  });
}

const HERO_VIEW = viewCamera(CAMERA_KEYS[0], 1.6);

function nearInHeroView(c: Circle | null): c is Circle {
  return c !== null && c.depth < NEAR_DEPTH && Math.abs(c.x) < 1 && Math.abs(c.y) < 1;
}

/** True if an object at p would overlap, on the hero screen, a near object already placed. */
function crowdsHero(p: Vector3, radius: number, placed: Spec[]): boolean {
  const a = project(p, radius, HERO_VIEW);
  if (!nearInHeroView(a)) return false;
  return placed.some((spec) => {
    const b = project(spec.home, boundingRadius(spec.scale), HERO_VIEW);
    return nearInHeroView(b) && Math.hypot((a.x - b.x) * 1.6, a.y - b.y) < a.ry + b.ry;
  });
}

export function makeLayout(count: number): Spec[] {
  const rand = mulberry32(7);
  const between = ([lo, hi]: readonly [number, number]) => lo + rand() * (hi - lo);
  const rail = RAIL.getSpacedPoints(90);

  const specs: Spec[] = [];
  let placed = 0;
  ZONES.forEach((zone, zi) => {
    const n = zi === ZONES.length - 1 ? count - placed : Math.round(count * zone.share);
    let made = 0;
    for (let tries = 0; made < n && tries < 4000; tries++) {
      const p = new Vector3(between(zone.x), between(zone.y), between(zone.z));
      // Keep the hero balls and where they land clear.
      if (overHeroBalls(p)) continue;
      // Keep clear of the title and the camera's view of it.
      if (Math.abs(p.x) < 4.3 && p.y > -0.5 && p.y < 1.7 && p.z < -6.6 && p.z > -10.4) continue;
      if (blocksTitle(p)) continue;
      // Keep near objects clear of the copy, so text never sits over a big, bright object.
      const kind = KINDS[(specs.length + zi) % KINDS.length];
      const radius = boundingRadius(kind === "atom" ? 1.25 : 1.15);
      if (behindCopy(p, radius + DRIFT)) continue;
      // Spread out on the hero screen rather than piling up.
      if (crowdsHero(p, radius, specs)) continue;
      // Keep clear of the camera rail and of each other.
      if (rail.some((r) => r.distanceTo(p) < 1.45)) continue;
      if (specs.some((s) => s.home.distanceTo(p) < 1.25)) continue;
      specs.push({
        kind,
        home: p,
        rotation: [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2],
        scale: kind === "atom" ? 0.95 + rand() * 0.3 : 0.75 + rand() * 0.4,
        seed: rand(),
      });
      made++;
    }
    placed += made;
  });
  return specs;
}
