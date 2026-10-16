import { describe, expect, it } from "vitest";
import { CatmullRomCurve3, Line3, PerspectiveCamera, Vector3 } from "three";
import { CAMERA_KEYS, TITLE_CENTER, TITLE_SCALE } from "./layout";
import { boundingRadius, COPY_REGIONS, makeLayout, NEAR_DEPTH, type Spec } from "./object-layout";

const VIEWS = ["hero", "Predict", "Diagnose", "Break", "Rebuild"];
const TAN_HALF_FOV = Math.tan((35 / 2) * (Math.PI / 180));

function viewCamera(view: number, aspect: number) {
  const key = CAMERA_KEYS[view];
  const camera = new PerspectiveCamera(35, aspect, 0.1, 80);
  camera.position.set(...key.pos);
  camera.lookAt(new Vector3(...key.look));
  camera.updateMatrixWorld();
  return camera;
}

/** The object's circle on screen: centre in NDC and radii, or null if behind the camera. */
function onScreen(spec: Spec, camera: PerspectiveCamera, aspect: number) {
  const depth = spec.home.clone().sub(camera.position).dot(camera.getWorldDirection(new Vector3()));
  if (depth < 0.1) return null;
  const ndc = spec.home.clone().project(camera);
  const ry = boundingRadius(spec.scale) / (depth * TAN_HALF_FOV);
  return { x: ndc.x, y: ndc.y, rx: ry / aspect, ry, depth };
}

/** True if the object's on-screen circle overlaps the view's copy (any depth for the hero, near ones for chapters). */
function coversCopy(spec: Spec, view: number, aspect: number): boolean {
  const c = onScreen(spec, viewCamera(view, aspect), aspect);
  if (!c || (view > 0 && c.depth >= NEAR_DEPTH)) return false;
  const { x, y } = COPY_REGIONS[view];
  const qx = Math.min(x[1], Math.max(x[0], c.x));
  const qy = Math.min(y[1], Math.max(y[0], c.y));
  return ((c.x - qx) / c.rx) ** 2 + ((c.y - qy) / c.ry) ** 2 < 1;
}

/** True if the object stands between the camera and the title at any point after the hero. */
function blocksTitleOnRail(spec: Spec): boolean {
  const rail = new CatmullRomCurve3(CAMERA_KEYS.map((k) => new Vector3(...k.pos)), false, "centripetal");
  const closest = new Vector3();
  for (let t = 0.25; t <= 1; t += 1 / 32) {
    const eye = rail.getPoint(t);
    for (let i = -3; i <= 3; i++) {
      const target = new Vector3(TITLE_CENTER[0] + i * TITLE_SCALE * 1.6, TITLE_CENTER[1], TITLE_CENTER[2]);
      const sight = new Line3(eye, target);
      if (sight.closestPointToPoint(spec.home, true, closest).distanceTo(spec.home) < boundingRadius(spec.scale)) {
        return true;
      }
    }
  }
  return false;
}

describe("floating object layout", () => {
  it.each([30, 16])("places all %i objects", (count) => {
    expect(makeLayout(count)).toHaveLength(count);
  });

  it.each([
    [30, 1.6],
    [30, 16 / 9],
    [16, 1.6],
  ])("keeps objects out from behind the copy (%i objects, aspect %f)", (count, aspect) => {
    const covering = makeLayout(count).flatMap((spec, i) =>
      VIEWS.flatMap((name, view) =>
        coversCopy(spec, view, aspect) ? [`object ${i} (${spec.kind}) behind the ${name} copy`] : [],
      ),
    );
    expect(covering).toEqual([]);
  });

  it.each([30, 16])("spreads %i objects out in the hero view instead of piling them up", (count) => {
    const camera = viewCamera(0, 1.6);
    // Near, on-screen objects only: far ones are small and fogged, depth layering is fine.
    const visible = (c: ReturnType<typeof onScreen>) =>
      c && c.depth < NEAR_DEPTH && Math.abs(c.x) < 1 && Math.abs(c.y) < 1;
    const circles = makeLayout(count).map((spec) => onScreen(spec, camera, 1.6));
    const overlapping: string[] = [];
    circles.forEach((a, i) =>
      circles.slice(i + 1).forEach((b, k) => {
        if (!visible(a) || !visible(b) || !a || !b) return;
        // Aspect-corrected distance between centres against the sum of radii.
        const dx = (a.x - b.x) * 1.6;
        if (Math.hypot(dx, a.y - b.y) < a.ry + b.ry) overlapping.push(`${i} and ${i + 1 + k}`);
      }),
    );
    expect(overlapping).toEqual([]);
  });

  it.each([30, 16])("never puts any of %i objects in front of the title along the camera path", (count) => {
    const blocking = makeLayout(count)
      .map((spec, i) => (blocksTitleOnRail(spec) ? `object ${i} (${spec.kind})` : null))
      .filter(Boolean);
    expect(blocking).toEqual([]);
  });
});
