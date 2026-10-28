import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { initialBuild } from "../../engine/edits";
import { realModel } from "../../engine/registry";
import { runExperiment, simulateOutcome } from "../../engine/run";
import { EXPERIMENTS } from "../../lib/content";
import { watchConsole } from "./gates";

/*
 * The bug hunt's eyes: every page and every lab state at 1440, 1024 and 390
 * wide, on the production build, after the 3D has loaded and the moment's
 * animation has settled. Screenshots go to tests/screenshots/hunt-<round>/
 * for review (they're git-ignored); each one also records console problems.
 * Run with HUNT=1 (it's long); HUNT_ONLY=<substring> narrows it.
 */

const ROUND = process.env.GAUNTLET_ROUND ?? "dev";
const DIR = `tests/screenshots/hunt-${ROUND}`;
mkdirSync(DIR, { recursive: true });
const WIDTHS = [1440, 1024, 390] as const;
const H = { 1440: 900, 1024: 768, 390: 844 } as const;
const only = process.env.HUNT_ONLY ?? "";

test.skip(!process.env.HUNT, "set HUNT=1 to take the bug-hunt screenshots");

async function settle(page: Page, ms = 1200) {
  await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 20_000 });
  await page.waitForTimeout(ms);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

const pages = [
  { name: "levels", path: "/start" },
  { name: "labs-easy", path: "/start/easy" },
  { name: "labs-medium", path: "/start/medium" },
  { name: "labs-advanced", path: "/start/advanced" },
  ...["chemistry", "robotics"].flatMap((lab) => ["easy", "medium", "advanced"].map((level) => ({ name: `map-${lab}-${level}`, path: `/labs/${lab}/${level}` }))),
  { name: "beliefs-empty", path: "/beliefs" },
  { name: "credits", path: "/credits" },
  { name: "not-found", path: "/lost-somewhere" },
];

for (const p of pages) {
  test(`page ${p.name}`, async ({ page }) => {
    test.skip(!!only && !p.name.includes(only));
    const problems = watchConsole(page);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: H[w] });
      await page.goto(p.path);
      await settle(page, 1800);
      await shot(page, `${p.name}-${w}`);
      await page.screenshot({ path: `${DIR}/${p.name}-${w}-full.png`, fullPage: true });
    }
    expect(problems.filter((x) => !/lost-somewhere|status of 404/.test(x))).toEqual([]);
  });
}

test("landing: loading, slides and every section", async ({ page }) => {
  test.skip(!!only && !"landing".includes(only));
  test.setTimeout(300_000);
  const problems = watchConsole(page);
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: H[w] });
    await page.goto("/");
    await page.waitForTimeout(250);
    await shot(page, `landing-loading-${w}`);
    await settle(page, 2000);
    const carousel = page.locator('[aria-roledescription="carousel"]');
    for (const n of [1, 2, 3]) {
      await carousel.getByRole("button", { name: new RegExp(`${n} of 3`) }).click();
      await page.waitForTimeout(1600);
      await shot(page, `landing-slide-${n}-${w}`);
    }
    // Each section in view, after its scroll scene has played.
    const sections = await page.locator("main > section, main > div > section, footer").count();
    for (let i = 0; i < sections; i++) {
      const s = page.locator("main > section, main > div > section, footer").nth(i);
      await s.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 1));
      await page.waitForTimeout(1400);
      await shot(page, `landing-section-${i + 1}-${w}`);
    }
  }
  expect(problems).toEqual([]);
});

for (const def of EXPERIMENTS) {
  test(`lab ${def.id}`, async ({ page }) => {
    test.skip(!!only && !def.id.includes(only));
    test.setTimeout(400_000);
    const problems = watchConsole(page);
    const path = `/labs/${def.lab}/${def.level}/${def.id}`;
    const start = initialBuild(def);
    const real = simulateOutcome(def, start, realModel(def.stage));
    const right = real.result.type === "choice" ? real.result.value : "";
    const options = def.prediction.type === "choice" ? def.prediction.options : [];
    // The wrong guess with a ghost shows the most: the replay pause and the ghost beside reality.
    const wrong = options.filter((o) => o !== right).sort((a, b) => Number(!!runExperiment(def, start, { type: "choice", value: b }, {}).diagnosis?.ghost) - Number(!!runExperiment(def, start, { type: "choice", value: a }, {}).diagnosis?.ghost))[0];
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: H[w] });
      await page.goto(path);
      await settle(page, 2200);
      await shot(page, `${def.id}-1-before-${w}`);
      await page.getByRole("radio", { name: wrong, exact: true }).click();
      await page.getByRole("button", { name: /^Run/ }).click();
      await page.waitForTimeout(def.lab === "chemistry" ? 3000 : 700);
      await shot(page, `${def.id}-2-running-${w}`);
      await expect(page.locator("main[data-verdict]")).toBeAttached({ timeout: 40_000 });
      const replay = page.locator("section[data-replay]");
      if (await replay.count()) await expect(replay).toHaveAttribute("data-replay", "paused", { timeout: 20_000 });
      else await page.waitForTimeout(2200);
      await page.waitForTimeout(900);
      await shot(page, `${def.id}-3-wrong-${w}`);
      if (w === 1440) await page.screenshot({ path: `${DIR}/${def.id}-3-wrong-${w}-full.png`, fullPage: true });
      await page.getByRole("button", { name: /Change something and try again/ }).click();
      await page.getByRole("radio", { name: right, exact: true }).click();
      await page.getByRole("button", { name: /^Run/ }).click();
      await expect(page.locator('main[data-verdict="correct"]')).toBeAttached({ timeout: 40_000 });
      await page.waitForTimeout(2600);
      await shot(page, `${def.id}-4-correct-${w}`);
      const whatIf = page.locator("[data-what-if]").first();
      if (await whatIf.count()) {
        await whatIf.click();
        await expect(page.locator("[data-what-if-result]")).toBeVisible({ timeout: 40_000 });
        await page.waitForTimeout(1500);
        await shot(page, `${def.id}-5-whatif-${w}`);
      }
      if (w === 1440) {
        await page.getByRole("button", { name: "Undo the change" }).click().catch(() => {});
      }
    }
    expect(problems).toEqual([]);
  });
}

test("theory sheet and My ideas with data", async ({ page }) => {
  test.skip(!!only && !"theory beliefs".includes(only));
  test.setTimeout(200_000);
  const problems = watchConsole(page);
  await page.goto("/labs/chemistry/easy/chemistry-melting");
  await settle(page, 1500);
  await page.getByRole("radio", { name: "Certain", exact: true }).click();
  await page.getByRole("radio", { name: "Keep rising", exact: true }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.locator("main[data-verdict]")).toBeAttached({ timeout: 40_000 });
  await page.goto("/labs/chemistry/medium/chemistry-gas-heat");
  await settle(page, 1500);
  await page.getByRole("radio", { name: "Bigger", exact: true }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.locator("main[data-verdict]")).toBeAttached({ timeout: 40_000 });
  await page.getByRole("button", { name: /Change something and try again/ }).click();
  await page.getByRole("radio", { name: "Faster", exact: true }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.locator('main[data-verdict="correct"]')).toBeAttached({ timeout: 40_000 });
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: H[w] });
    await page.getByRole("button", { name: "See the theory" }).click();
    await page.waitForTimeout(900);
    await shot(page, `theory-${w}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: H[w] });
    await page.goto("/beliefs");
    await settle(page, 1500);
    await shot(page, `beliefs-data-${w}`);
    await page.screenshot({ path: `${DIR}/beliefs-data-${w}-full.png`, fullPage: true });
  }
  expect(problems).toEqual([]);
});
