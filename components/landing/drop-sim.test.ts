import { describe, expect, it } from "vitest";
import { ballHeight, DROP, ghostFor, landingTime, realAnswer } from "./drop-sim";

describe("Which falls faster? (landing teaser model)", () => {
  it("says both balls land together: mass doesn't change free-fall time", () => {
    expect(realAnswer()).toBe("same");
  });

  it("starts at the release height and ends at rest on the floor", () => {
    expect(ballHeight(0, DROP.g, 0.3)).toBeCloseTo(DROP.startY);
    expect(ballHeight(landingTime(DROP.g), DROP.g, 0.3)).toBeCloseTo(DROP.floorY);
    expect(ballHeight(30, DROP.g, 0.3)).toBe(DROP.floorY);
  });

  it("never goes below the floor while bouncing", () => {
    for (let t = 0; t < 3; t += 0.01) expect(ballHeight(t, DROP.g, DROP.restitution.glass)).toBeGreaterThanOrEqual(DROP.floorY - 1e-9);
  });

  it("shows a ghost only for a wrong guess, and the ghost lands first", () => {
    expect(ghostFor("same")).toBeNull();
    expect(ghostFor("heavy")).toBe("steel");
    expect(ghostFor("light")).toBe("glass");
    expect(landingTime(DROP.g * DROP.ghostGravityFactor)).toBeLessThan(landingTime(DROP.g));
  });
});
