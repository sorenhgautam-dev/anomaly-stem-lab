import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { planePoint, solveRig, type RigInput } from "./rig-math";

/** Screen pixels of a world point through a camera set up exactly like CameraRig does it. */
function project(input: RigInput, world: [number, number, number]) {
  const out = solveRig(input);
  const camera = new PerspectiveCamera(input.fov, input.viewW / input.viewH, 0.05, 60);
  camera.position.set(...out.position);
  camera.lookAt(new Vector3(...out.target));
  camera.setViewOffset(input.viewW, input.viewH, out.offsetX, out.offsetY, input.viewW, input.viewH);
  camera.updateMatrixWorld();
  const ndc = new Vector3(...world).project(camera);
  return { x: ((ndc.x + 1) / 2) * input.viewW, y: ((1 - ndc.y) / 2) * input.viewH };
}

function corners(input: RigInput) {
  const { frame } = solveRig(input);
  const at = (a: number, b: number) => project(input, planePoint(a, b, input.pitch));
  return {
    topLeft: at(frame.left, frame.top),
    bottomRight: at(frame.right, frame.bottom),
    bench: at(0, 0),
  };
}

const BASE: RigInput = {
  viewW: 1440,
  viewH: 900,
  win: { x: 48, y: 200, w: 1040, h: 460 },
  benchY: 590,
  horizon: 0.3,
  worldWidth: 3,
  pitch: 0.06,
  fov: 30,
  parallax: { x: 0, y: 0 },
};

describe("solveRig", () => {
  it("pins the window plane to the DOM window", () => {
    const c = corners(BASE);
    expect(c.topLeft.x).toBeCloseTo(48, 3);
    expect(c.topLeft.y).toBeCloseTo(200, 3);
    expect(c.bottomRight.x).toBeCloseTo(1088, 3);
    expect(c.bottomRight.y).toBeCloseTo(660, 3);
    expect(c.bench.y).toBeCloseTo(590, 3);
  });

  it("keeps it pinned while the camera moves for parallax", () => {
    const moved = { ...BASE, parallax: { x: 0.2, y: -0.12 } };
    const c = corners(moved);
    expect(c.topLeft.x).toBeCloseTo(48, 3);
    expect(c.bottomRight.y).toBeCloseTo(660, 3);
    // Something behind the window does slide.
    const still = project(BASE, [0, 0.5, -2]);
    const shifted = project(moved, [0, 0.5, -2]);
    expect(Math.abs(still.x - shifted.x)).toBeGreaterThan(5);
  });

  it("works when the camera looks steeply down (the robotics board)", () => {
    const steep = { ...BASE, pitch: 0.5, benchY: 660, horizon: 0.45 };
    const c = corners(steep);
    expect(c.topLeft.x).toBeCloseTo(48, 3);
    expect(c.topLeft.y).toBeCloseTo(200, 3);
    expect(c.bottomRight.y).toBeCloseTo(660, 3);
    // The bench point is the origin, on the bench top.
    expect(c.bench.y).toBeCloseTo(660, 3);
  });

  it("puts the eye above the bench by the gap between eye level and bench line", () => {
    const out = solveRig(BASE);
    expect(out.position[1]).toBeGreaterThan(0);
    expect(out.frame.top).toBeGreaterThan(0);
    expect(out.frame.bottom).toBeLessThan(0);
  });
});
