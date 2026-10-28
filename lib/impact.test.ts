import { describe, expect, it } from "vitest";
import { countBust, IMPACT_BUDGET, impactStore, isRealBust, type ImpactStore } from "@/lib/impact";

function fakeStore(start = 0): ImpactStore & { n: number } {
  return {
    n: start,
    async read() {
      return this.n;
    },
    async add() {
      this.n += 1;
      return this.n;
    },
  };
}

describe("live impact counter", () => {
  it("has no number at all without Redis (never a made-up one)", async () => {
    const store = impactStore(null);
    expect(await store.read()).toBeNull();
    expect(await store.add()).toBeNull();
  });

  it("only counts an idea the experiment can really diagnose", async () => {
    expect(isRealBust("chemistry-melting", "melting-temp-rises")).toBe(true);
    expect(isRealBust("chemistry-melting", "gas-has-no-mass")).toBe(false);
    expect(isRealBust("nope", "melting-temp-rises")).toBe(false);
    const store = fakeStore(41);
    expect(await countBust("chemistry-melting", "gas-has-no-mass", "ip-a", store)).toBe(41);
    expect(await countBust("chemistry-melting", "melting-temp-rises", "ip-a", store)).toBe(42);
  });

  it("stops counting one network after a day's honest maximum", async () => {
    const store = fakeStore();
    for (let i = 0; i < IMPACT_BUDGET.limit; i++) await countBust("chemistry-melting", "melting-temp-rises", "ip-flood", store);
    expect(store.n).toBe(IMPACT_BUDGET.limit);
    expect(await countBust("chemistry-melting", "melting-temp-rises", "ip-flood", store)).toBe(IMPACT_BUDGET.limit);
    // Someone else still counts.
    expect(await countBust("chemistry-melting", "melting-temp-rises", "ip-other", store)).toBe(IMPACT_BUDGET.limit + 1);
  });
});
