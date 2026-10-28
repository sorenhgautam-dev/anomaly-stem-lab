import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { initialBuild } from "../../engine/edits";
import { realModel } from "../../engine/registry";
import { simulateOutcome } from "../../engine/run";
import { EXPERIMENTS } from "../../lib/content";
import { watchConsole } from "./gates";

/*
 * Radiotherapy beams and Born with it? (rounds 5 and 6): the right guess,
 * then the theory view with its sources and the learning note, at 1440 and
 * 390, on the production build. Screenshots go to
 * tests/screenshots/new-labs-<round>/. Fails on any console error.
 */

const ROUND = process.env.GAUNTLET_ROUND ?? "dev";
const DIR = `tests/screenshots/new-labs-${ROUND}`;
mkdirSync(DIR, { recursive: true });
const NEW = ["treatment-radiotherapy-beams", "cell-born-with-it"];

for (const id of NEW) {
  test(`${id}: right guess, theory with sources, learning note`, async ({ page }) => {
    test.setTimeout(180_000);
    const def = EXPERIMENTS.find((e) => e.id === id)!;
    const problems = watchConsole(page);
    const real = simulateOutcome(def, initialBuild(def), realModel(def.stage));
    const right = real.result.type === "choice" ? real.result.value : "";
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`/labs/${def.lab}/${def.level}/${def.id}`);
      await expect(page.getByText(/This is for learning, not medical advice/).first()).toBeVisible();
      await page.locator("[data-prediction] [role=radio]", { hasText: right }).first().click();
      await page.getByRole("button", { name: /^Run/ }).click();
      await expect(page.locator('main[data-verdict="correct"]')).toBeAttached({ timeout: 40_000 });
      await page.getByRole("button", { name: "See the theory" }).click();
      const sheet = page.getByRole("dialog");
      await expect(sheet).toBeVisible();
      await expect(sheet.getByText(/teaching model/i).first()).toBeVisible();
      await expect(sheet.getByText(/National Cancer Institute/).first()).toBeAttached();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}/${id}-theory-${w}.png` });
      await sheet.screenshot({ path: `${DIR}/${id}-theory-${w}-sheet.png` }).catch(() => {});
      await page.keyboard.press("Escape");
    }
    expect(problems).toEqual([]);
  });
}
