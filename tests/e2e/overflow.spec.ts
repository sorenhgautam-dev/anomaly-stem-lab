import { expect, test } from "@playwright/test";
import { CHANGED } from "./pages";

/*
 * No sideways scrolling (DESIGN.md §10, the brief's "nothing cut off"): at
 * phone and tablet width every changed page is exactly as wide as the viewport, even
 * after its scroll-driven sections have played.
 */

for (const p of CHANGED) for (const width of [390, 1024]) {
  test(`no sideways scroll on ${p.name} at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    await page.goto(p.path);
    await page.waitForLoadState("load");
    // Scroll through so revealed sections (and anything fanned out) are in their final place.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(400);
    const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
    expect(scroll, `${p.name} is ${scroll}px wide at ${width}`).toBeLessThanOrEqual(inner);
  });
}
