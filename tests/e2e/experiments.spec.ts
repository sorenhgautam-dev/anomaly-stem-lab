import { expect, test, type Page } from "@playwright/test";
import { initialBuild } from "../../engine/edits";
import { realModel } from "../../engine/registry";
import { runExperiment, simulateOutcome } from "../../engine/run";
import type { ExperimentDef, Outcome } from "../../engine/types";
import { readingLabel } from "../../components/lab/readings";
import { EXPERIMENTS } from "../../lib/content";
import { formatReadout } from "../../lib/readout";
import { replayMoment } from "../../lib/replay";
import { applyWhatIf, usefulWhatIfs } from "../../lib/what-if";
import { watchConsole, openMore } from "./gates";

/*
 * Every experiment, every guess, on the production build: each wrong guess
 * (ANOMALY, the replay pause where there's a ghost), then the right one, then
 * every "What if?". What the screen says is checked against the simulator
 * run the same way here: the result card's reality, every Inspector row, the
 * replay's paused numbers and the What if? card. Fails on any console error.
 */

const pathOf = (d: ExperimentDef) => `/labs/${d.lab}/${d.level}/${d.id}`;

async function run(page: Page, option: string) {
  await page.getByRole("radio", { name: option, exact: true }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.locator("main[data-verdict]")).toBeVisible({ timeout: 40_000 });
  return page.locator("main[data-verdict]").getAttribute("data-verdict");
}

/** The Inspector's rows once their count-up has settled. */
async function inspectorRows(page: Page): Promise<[string, string][]> {
  await page.waitForTimeout(900);
  return page.evaluate(() =>
    [...document.querySelectorAll("dl div")]
      .filter((row) => row.closest(".pointer-events-auto") && !row.closest("[data-what-if-result]") && row.querySelector("dt") && row.querySelector("dd"))
      .map((row) => [row.querySelector("dt")!.textContent!.trim(), (row.querySelector("dd")!.textContent ?? "").trim()] as [string, string]),
  );
}

function expectedRows(outcome: Outcome): Map<string, string> {
  const m = new Map<string, string>();
  for (const [key, value] of Object.entries(outcome.readings)) {
    const r = readingLabel(key, value);
    if (r.label) m.set(r.label, r.text);
  }
  return m;
}

async function checkInspector(page: Page, outcome: Outcome, where: string) {
  const want = expectedRows(outcome);
  if (want.size === 0) return;
  const rows = await inspectorRows(page);
  for (const [label, text] of want) {
    const shown = rows.find(([l]) => l === label);
    expect(shown, `${where}: Inspector has no "${label}" row`).toBeDefined();
    // CountUp writes the visible copy; the screen-reader copy is the real text. Either holds the number.
    expect(shown![1], `${where}: Inspector "${label}"`).toContain(text);
  }
}

for (const def of EXPERIMENTS) {
  test(`${def.id}: every guess and every What if? match the simulator`, async ({ page }) => {
    test.setTimeout(240_000);
    const problems = watchConsole(page);
    if (def.prediction.type !== "choice") test.skip(true, "slider predictions are covered by flows");
    const options = def.prediction.type === "choice" ? def.prediction.options : [];
    const start = initialBuild(def);
    const real = simulateOutcome(def, start, realModel(def.stage));
    const right = real.result.type === "choice" ? real.result.value : "";
    const wrong = options.filter((o) => o !== right);
    await page.goto(pathOf(def));
    await expect(page.locator('main[data-phase="build"]')).toBeAttached();

    for (const option of wrong) {
      expect(await run(page, option), `${def.id} "${option}"`).toBe("wrong");
      const r = runExperiment(def, start, { type: "choice", value: option }, {});
      // The result card's reality row is the simulator's answer.
      await expect(page.locator("main").getByText(right, { exact: true }).first()).toBeVisible();
      await checkInspector(page, r.outcome, `${def.id} wrong "${option}"`);
      const m = replayMoment(def.id, r.outcome, r.diagnosis?.ghost ?? null);
      const replay = page.locator("section[data-replay]");
      if (m) {
        await expect(replay, `${def.id} "${option}": replay pauses`).toHaveAttribute("data-replay", "paused", { timeout: 20_000 });
        await expect(replay).toContainText(`${formatReadout(m.real, m.readout)} (your idea: ${formatReadout(m.ghost, m.readout)})`);
        await openMore(page);
        await page.getByRole("button", { name: "Keep watching" }).click();
      } else {
        await expect(replay).toHaveCount(0);
      }
      await page.getByRole("button", { name: /Change something and try again/ }).click();
      await expect(page.locator('main[data-phase="build"]')).toBeAttached();
    }

    expect(await run(page, right), `${def.id} "${right}"`).toBe("correct");
    await checkInspector(page, real, `${def.id} correct`);
    await expect(page.getByRole("link", { name: /Next experiment|Finish the level/ })).toBeVisible();

    // Every What if? on offer, each from the build before it.
    let build = start;
    let before = real;
    for (const v of usefulWhatIfs(def.id, start)) {
      await openMore(page);
      const button = page.locator(`[data-what-if="${v.id}"]`);
      if ((await button.count()) === 0) continue;
      await button.click();
      await expect(page.locator("[data-what-if-result]")).toBeVisible({ timeout: 40_000 });
      const next = applyWhatIf(build, v);
      const after = simulateOutcome(def, next, realModel(def.stage));
      const card = page.locator("[data-what-if-result]");
      for (const r of v.show) {
        await expect(card, `${def.id} ${v.id}: ${r.label}`).toContainText(formatReadout(after.readings[r.key], r));
        await expect(card).toContainText(`before: ${formatReadout(before.readings[r.key], r)}`);
      }
      await checkInspector(page, after, `${def.id} what-if ${v.id}`);
      await page.getByRole("button", { name: "Undo the change" }).click();
      await expect(page.locator('main[data-phase="build"]')).toBeAttached();
      build = start;
      before = real;
      // Back to a result so the next What if? is on offer.
      expect(await run(page, right)).toBe("correct");
    }
    expect(problems, `${def.id}: console errors, hydration warnings or failed requests`).toEqual([]);
  });
}
