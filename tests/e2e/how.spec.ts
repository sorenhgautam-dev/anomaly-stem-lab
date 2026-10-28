import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { watchConsole } from "./gates";

/*
 * How it works on the landing (DESIGN.md §7.1 item 2): every step button
 * (Guess, Run, Reveal, Understand) clicked in order and out of order, at
 * 1440 (pinned, scroll-driven) and 390 (unpinned), on the production build.
 * After each click the right step must be pressed, its caption shown, the
 * page must settle (no scroll fighting) and stay inside the section.
 * Screenshots of every step at both widths. Fails on any console error.
 */

const ROUND = process.env.GAUNTLET_ROUND ?? "dev";
const DIR = `tests/screenshots/how-${ROUND}`;
mkdirSync(DIR, { recursive: true });
const STEPS = ["Guess", "Run", "Reveal", "Understand"];
const CAPTION: Record<string, RegExp> = { Guess: /Every experiment starts/, Run: /Press Run/, Reveal: /Your guess was/, Understand: /Hair follicle cells divide fast/ };

async function open(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto("/");
  await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 30_000 });
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById("how-it-works")!.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(1200);
}

/**
 * Where the section sits on screen while the page settles after a click: it
 * must stop moving, not bounce. (Its place on screen, not scrollY: the browser's
 * scroll anchoring changes scrollY to hold content still when something above
 * the section, like the hero carousel, changes height.)
 */
async function settle(page: Page) {
  const ys: number[] = [];
  for (let i = 0; i < 14; i++) {
    ys.push(await page.evaluate(() => Math.round(document.getElementById("how-it-works")!.getBoundingClientRect().top)));
    await page.waitForTimeout(150);
  }
  return ys;
}

for (const [w, h] of [[1440, 900], [390, 844]] as const) {
  test(`How it works: every step button at ${w}`, async ({ page }) => {
    test.setTimeout(150_000);
    const problems = watchConsole(page);
    await open(page, w, h);
    const group = page.getByRole("group", { name: "Steps" });
    for (const order of [STEPS, [...STEPS].reverse(), ["Run", "Guess", "Understand", "Run"]]) {
      for (const name of order) {
        const before = await page.evaluate(() => Math.round(document.getElementById("how-it-works")!.getBoundingClientRect().top));
        await group.getByRole("button", { name, exact: true }).click();
        const ys = await settle(page);
        const tail = ys.slice(-5);
        // Settled: the last samples don't move.
        expect(Math.max(...tail) - Math.min(...tail), `${w} ${name}: still scrolling ${ys.join(",")}`).toBeLessThanOrEqual(2);
        await expect(group.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("#how-it-works").getByText(CAPTION[name]).first()).toBeVisible();
        const box = await page.locator("#how-it-works").boundingBox();
        expect(box, `${w} ${name}: section on screen`).not.toBeNull();
        if (w >= 1024) {
          // Pinned: the page glides within the section, which always fills the screen.
          expect(box!.y <= 1 && box!.y + box!.height >= h - 1, `${w} ${name}: section covers the screen (y ${box!.y}, h ${box!.height})`).toBeTruthy();
        } else {
          // Not pinned: a step button never moves the section on screen.
          expect(Math.abs(ys[ys.length - 1] - before), `${w} ${name}: page jumped`).toBeLessThanOrEqual(2);
        }
      }
    }
    for (const name of STEPS) {
      await group.getByRole("button", { name, exact: true }).click();
      await settle(page);
      await page.screenshot({ path: `${DIR}/${name.toLowerCase()}-${w}.png` });
    }
    // Pick the right guess on the cards: the reveal turns right, and the caption follows.
    const cards = page.locator("#how-it-works [data-prediction]");
    await cards.getByRole("radio", { name: /They are affected, like the cancer cells/ }).click();
    await group.getByRole("button", { name: "Reveal", exact: true }).click();
    await settle(page);
    await expect(page.locator("#how-it-works").getByText("Right!", { exact: true })).toBeVisible();
    await expect(page.locator("#how-it-works").getByText(/You guessed right/)).toBeVisible();
    await page.screenshot({ path: `${DIR}/reveal-right-${w}.png` });
    expect(problems).toEqual([]);
  });
}
