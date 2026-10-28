import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { watchConsole } from "./gates";

/*
 * Per-round screenshots of what changed (GAUNTLET.md §2: every state of the
 * changed pages at 1440 and 390, 1024 in the final round). ROUND_PAGES lists
 * the paths; ROUND_LAB names an experiment whose states are captured.
 */

const ROUND = process.env.GAUNTLET_ROUND ?? "dev";
const DIR = `tests/screenshots/round-${ROUND}`;
mkdirSync(DIR, { recursive: true });
const WIDTHS = (process.env.ROUND_WIDTHS ?? "1440,390").split(",").map(Number);
const PAGES = (process.env.ROUND_PAGES ?? "").split(",").filter(Boolean);
const LAB = process.env.ROUND_LAB ?? "";

test.skip(!process.env.ROUND_SHOTS, "set ROUND_SHOTS=1");

async function settle(page: Page, ms = 1500) {
  await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 20_000 });
  await page.waitForTimeout(ms);
}

const slug = (p: string) => p.replace(/^\//, "").replace(/\//g, "-") || "landing";

for (const path of PAGES) {
  test(`page ${path}`, async ({ page }) => {
    const problems = watchConsole(page);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : w === 1024 ? 768 : 900 });
      await page.goto(path);
      await settle(page, 2000);
      await page.screenshot({ path: `${DIR}/${slug(path)}-${w}.png` });
      await page.screenshot({ path: `${DIR}/${slug(path)}-${w}-full.png`, fullPage: true });
    }
    expect(problems.filter((p) => !/status of 404/.test(p))).toEqual([]);
  });
}

if (LAB) {
  const [path, wrong, right] = LAB.split("|");
  test(`lab ${path}`, async ({ page }) => {
    test.setTimeout(240_000);
    const problems = watchConsole(page);
    const name = slug(path).split("-").slice(-2).join("-");
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : w === 1024 ? 768 : 900 });
      await page.goto(path);
      await settle(page, 2500);
      await page.screenshot({ path: `${DIR}/${name}-1-before-${w}.png` });
      await page.getByRole("radio", { name: wrong, exact: true }).click();
      await page.getByRole("button", { name: /^Run/ }).click();
      await page.waitForTimeout(3500);
      await page.screenshot({ path: `${DIR}/${name}-2-running-${w}.png` });
      await expect(page.locator("main[data-verdict]")).toBeAttached({ timeout: 40_000 });
      const replay = page.locator("section[data-replay]");
      if (await replay.count()) await expect(replay).toHaveAttribute("data-replay", "paused", { timeout: 20_000 });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}/${name}-3-wrong-${w}.png` });
      if (w !== 390) await page.screenshot({ path: `${DIR}/${name}-3-wrong-${w}-full.png`, fullPage: true });
      await page.getByRole("button", { name: /Change something and try again/ }).click();
      await page.getByRole("radio", { name: right, exact: true }).click();
      await page.getByRole("button", { name: /^Run/ }).click();
      await expect(page.locator('main[data-verdict="correct"]')).toBeAttached({ timeout: 40_000 });
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${DIR}/${name}-4-correct-${w}.png` });
      await page.getByRole("button", { name: "See the theory" }).click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}/${name}-5-theory-${w}.png` });
      await page.keyboard.press("Escape");
      const whatIf = page.locator("[data-what-if]").first();
      if (await whatIf.count()) {
        await whatIf.click();
        await expect(page.locator("[data-what-if-result]")).toBeVisible({ timeout: 40_000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${DIR}/${name}-6-whatif-${w}.png` });
      }
    }
    expect(problems).toEqual([]);
  });
}
