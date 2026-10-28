import { expect, test } from "@playwright/test";
import { allMisconceptions, comingSoonFor, EXPERIMENTS, experimentsFor, LAB_IDS, LEVEL_INFO } from "../../lib/content";
import { beliefItems } from "../../lib/beliefs";
import { watchConsole } from "./gates";

/*
 * The screen matches the data: every count shown (experiments per level and
 * lab, shelf models, map nodes, beliefs) equals both the content behind it
 * and the number of things actually drawn next to it. If one of these drifts
 * apart again (a shelf missing a model, a stale count), this fails.
 */

let problems: string[] = [];
test.beforeEach(({ page }) => {
  problems = watchConsole(page);
});
test.afterEach(() => {
  expect(problems, "console errors, hydration warnings or failed requests").toEqual([]);
});

const levelCount = (level: string) => EXPERIMENTS.filter((e) => e.level === level).length;

test("level select: each level's count, lab split, ideas and shelf agree", async ({ page }) => {
  await page.goto("/start");
  const knob = page.getByRole("slider", { name: "Your grade" });
  for (const [keys, level] of [[["Home"], "easy"], [["Home", "ArrowRight", "ArrowRight", "ArrowRight"], "medium"], [["End"], "advanced"]] as const) {
    await knob.focus();
    for (const k of keys) await page.keyboard.press(k);
    const info = LEVEL_INFO.find((l) => l.id === level)!;
    await expect(knob).toHaveAttribute("aria-valuetext", new RegExp(info.title));
    const n = levelCount(level);
    const shelf = page.getByRole("region", { name: `${info.title} experiments` });
    await expect(shelf).toContainText(`On the ${info.title} shelf: ${n} ${n === 1 ? "experiment" : "experiments"}`);
    // As many models on the shelf as the count says, each named for a real experiment.
    const slots = shelf.locator("div:not([hidden]) > div > div > ul > li[data-shelf-slot]");
    await expect(slots).toHaveCount(n);
    const names = await slots.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(names.sort()).toEqual(EXPERIMENTS.filter((e) => e.level === level).map((e) => e.title).sort());
    // The lab split adds up, and the ideas count is the level's distinct ideas.
    let sum = 0;
    for (const lab of LAB_IDS) {
      const k = experimentsFor(lab, level).length;
      sum += k;
      if (k > 0) await expect(page.locator(`[data-level-lab="${lab}"]`)).toContainText(String(k));
    }
    expect(sum).toBe(n);
    const ideas = new Set(EXPERIMENTS.filter((e) => e.level === level).flatMap((e) => e.misconceptions)).size;
    await expect(page.getByText("tricky ideas").locator("..")).toContainText(String(ideas), { timeout: 5000 });
  }
});

for (const level of ["easy", "medium", "advanced"] as const) {
  test(`lab select (${level}): each lab card's count is its real experiments`, async ({ page }) => {
    await page.goto(`/start/${level}`);
    for (const lab of LAB_IDS) {
      const n = experimentsFor(lab, level).length;
      const soon = comingSoonFor(lab, level).length;
      const card = page.locator(`a[href="/labs/${lab}/${level}"]`).first();
      await expect(card).toContainText(`${n} ${n === 1 ? "experiment" : "experiments"}${soon > 0 ? ` · ${soon} coming soon` : ""}`, { timeout: 8000 });
    }
  });

  for (const lab of LAB_IDS) {
    test(`map ${lab}/${level}: one node per experiment and coming-soon star, and the done count`, async ({ page }) => {
      await page.goto(`/labs/${lab}/${level}`);
      const list = experimentsFor(lab, level);
      // Locked nodes aren't links yet, so each is found by its title; only the first is open on a fresh visit.
      for (const e of list) await expect(page.getByText(e.title, { exact: true }).first()).toBeAttached();
      if (list.length > 0) await expect(page.locator(`a[href="/labs/${lab}/${level}/${list[0].id}"]`).first()).toBeAttached();
      for (const c of comingSoonFor(lab, level)) await expect(page.getByText(c.title).first()).toBeAttached();
      if (list.length > 0) await expect(page.getByText(`0 of ${list.length} done`)).toBeVisible();
    });
  }
}

test("landing: the experiment counts are the real ones", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText(`${EXPERIMENTS.length} experiments`);
  for (const lab of LAB_IDS) {
    const n = EXPERIMENTS.filter((e) => e.lab === lab).length;
    const title = { cell: "Cell Lab", prevention: "Prevention Lab", detection: "Detection Lab", treatment: "Treatment Lab", chemistry: "", robotics: "" }[lab];
    const card = page.locator("[data-labs-card]").filter({ hasText: title }).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toContainText(`${n} ${n === 1 ? "experiment" : "experiments"}`, { timeout: 8000 });
  }
});

test("My ideas: the summary and each group count the rows shown", async ({ page }) => {
  await page.goto("/beliefs");
  const total = beliefItems().length;
  expect(total).toBeLessThanOrEqual(allMisconceptions().length);
  await expect(page.getByText(`0 busted · 0 still testing · ${total} not tested yet`)).toBeVisible();
  const group = page.locator("section[aria-labelledby='group-untested']");
  await expect(group.locator("ul > li")).toHaveCount(total);
  await expect(group.getByRole("heading")).toContainText(String(total));
});
