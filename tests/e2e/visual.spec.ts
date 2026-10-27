import { test } from "@playwright/test";
import { SHOTS, shoot } from "./gates";
import { CHANGED, WIDTHS } from "./pages";

/*
 * G9 screenshots (GAUNTLET.md §5): the pages changed this round at 1440,
 * 1024 and 390 px wide, viewport and full page. Scored by hand against
 * DESIGN.md §12 and written to GAUNTLET_LOG.md.
 */

for (const p of CHANGED) {
  for (const width of WIDTHS) {
    test(`G9 ${p.name} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2500);
      await shoot(page, p.name, width, true);
    });
  }
}

test("G9 font comparison", async ({ page }) => {
  test.skip(!CHANGED.some((p) => p.name === "design-system"), "design system not changed this round");
  await page.goto("/design-system");
  for (const font of ["archivo", "anton", "bricolage"]) {
    const figure = page.locator(`figure[data-font="${font}"]`);
    await figure.scrollIntoViewIfNeeded();
    await figure.screenshot({ path: `${SHOTS}/fonts-${font}.png` });
  }
});
