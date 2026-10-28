import { describe, expect, it } from "vitest";
import { halfHeightAt, LAYOUTS, ShapeSim, type PointerSample, type ShapeSpec } from "./shapes";

const ONE: ShapeSpec[] = [{ kind: "sphere", color: "#fff", x: 0, y: 0, z: 0, s: 1 }];
const AWAY: PointerSample = { nx: null, ny: null, click: null };

function run(sim: ShapeSim, seconds: number, ptr: PointerSample = AWAY) {
  for (let t = 0; t < seconds; t += 1 / 60) sim.step(1 / 60, 1.6, ptr);
}

describe("floating shapes", () => {
  it("drift near home when nothing touches them", () => {
    const sim = new ShapeSim(ONE);
    run(sim, 3);
    const b = sim.bodies[0];
    expect(Math.hypot(b.wx, b.wy)).toBeLessThan(0.25);
  });

  it("are pushed away from the cursor, then float back home", () => {
    const sim = new ShapeSim(ONE);
    // Cursor just right of the shape's centre.
    const nx = 0.3 / (halfHeightAt(0) * 1.6);
    run(sim, 0.5, { nx, ny: 0, click: null });
    expect(sim.bodies[0].wx).toBeLessThan(-0.15);
    run(sim, 6);
    expect(Math.abs(sim.bodies[0].px)).toBeLessThan(0.05);
  });

  it("scatter from a click", () => {
    const sim = new ShapeSim(ONE);
    const nx = 0.5 / (halfHeightAt(0) * 1.6);
    sim.step(1 / 60, 1.6, { nx: null, ny: null, click: { nx, ny: 0 } });
    expect(sim.bodies[0].vx).toBeLessThan(-1);
  });

  it("keep every layout's homes inside the view", () => {
    for (const layout of Object.values(LAYOUTS)) {
      for (const s of layout) {
        expect(Math.abs(s.x)).toBeLessThanOrEqual(1.05);
        expect(Math.abs(s.y)).toBeLessThanOrEqual(1);
      }
    }
  });
});
