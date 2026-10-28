import { expect, test, type Page } from "@playwright/test";
import { SHOTS, watchConsole } from "./gates";

/*
 * The new features on the production build: the replay that stops at the
 * moment the guess went wrong, "What if?" buttons, the root belief finder,
 * the calibration meter, "Explain it simpler" and the live impact counter.
 * Every number checked here is the simulator's (or the server's) own.
 */

const MELT = "/labs/treatment/medium/treatment-chemo-hair";
const LED = "/labs/cell/easy/cell-contact-test";

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main[data-phase]")).toBeVisible();
}

async function predictAndRun(page: Page, option: string, sure?: "Guessing" | "Fairly sure" | "Certain") {
  if (sure) await page.getByRole("radio", { name: sure, exact: true }).click();
  await page.getByRole("radio", { name: option, exact: true }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.locator("main[data-verdict]")).toBeVisible({ timeout: 30_000 });
  return page.locator("main[data-verdict]").getAttribute("data-verdict");
}

const bubble = (page: Page) => page.locator("[data-lab-ano-dock]");

test.describe("new features", () => {
  let problems: string[] = [];
  test.beforeEach(({ page }) => {
    problems = watchConsole(page);
  });
  test.afterEach(() => {
    expect(problems, "console errors, hydration warnings or failed requests").toEqual([]);
  });

  test("replay pauses at the moment the guess went wrong, then keeps watching", async ({ page }) => {
    await open(page, MELT);
    expect(await predictAndRun(page, "Nothing happens to them")).toBe("wrong");
    const replay = page.locator("section[data-replay]");
    await expect(replay).toHaveAttribute("data-replay", "paused", { timeout: 15_000 });
    // The simulator's numbers: the real hair dish has dropped while the idea keeps it at 100%.
    await expect(replay).toContainText(/\d+% \(your idea: 100%\)/);
    await expect(bubble(page)).toContainText(/Right here, at \d+\.\d s, the hair follicle dish was at \d+%\. Your idea said 100%\./);
    await page.screenshot({ path: `${SHOTS}/feature-replay-paused-1440.png` });
    await page.getByRole("button", { name: "Keep watching" }).click();
    await expect(replay).toHaveAttribute("data-replay", "watching");
    await page.getByRole("button", { name: "Show me the moment again" }).click();
    await expect(replay).toHaveAttribute("data-replay", "paused", { timeout: 15_000 });
  });

  test("no replay where no wrong idea predicts the guess", async ({ page }) => {
    await open(page, LED);
    // No wrong model gives "Yes, but slowly", so there's no ghost and nothing to pause at.
    expect(await predictAndRun(page, "Yes, but slowly")).toBe("wrong");
    await page.waitForTimeout(2500);
    await expect(page.locator("section[data-replay]")).toHaveCount(0);
  });

  test("What if? runs a variation at once, with real numbers, and never counts", async ({ page }) => {
    await open(page, MELT);
    expect(await predictAndRun(page, "They are affected, like the cancer cells", "Certain")).toBe("correct");
    await page.locator('[data-what-if="long"]').click();
    await expect(page.locator("main[data-explore]")).toBeAttached();
    await expect(page.locator("[data-what-if-result]")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("main")).not.toHaveAttribute("data-verdict", /.+/);
    await expect(page.locator("[data-what-if-result]")).toContainText(/before: \d+%/);
    await expect(bubble(page)).toContainText(/^.*Treatment twice as long: the hair follicle cells at their lowest went from \d+% to \d+%\./);
    await page.screenshot({ path: `${SHOTS}/feature-what-if-1440.png` });
    // Undo goes back to the build before the change.
    await page.getByRole("button", { name: "Undo the change" }).click();
    await expect(page.locator('main[data-phase="build"]')).toBeAttached();
    await expect(page.getByRole("radio", { name: "Short", exact: true })).toHaveAttribute("aria-checked", "true");
    // The What if? run didn't count: one sure guess, one right.
    await page.goto("/beliefs");
    await expect(page.locator("[data-calibration-line]")).toContainText("When you were sure, you were right 1 of 1 time.");
  });

  test("root belief finder: two wrong guesses from one idea, in the lab and on My ideas", async ({ page }) => {
    await page.goto("/beliefs");
    await expect(page.locator("#root-ideas")).toBeVisible();
    await expect(page.getByText(/No surprises yet/)).toBeVisible();
    await open(page, MELT);
    expect(await predictAndRun(page, "Nothing happens to them")).toBe("wrong");
    await expect(page.locator("[data-root-belief]")).toHaveCount(0);
    await page.goto("/beliefs");
    await expect(page.getByText(/No pattern yet/)).toBeVisible();
    await open(page, MELT);
    expect(await predictAndRun(page, "They are affected only at the very end")).toBe("wrong");
    const line = "Two of your wrong guesses come from the same idea: treatment only touches the cancer cells.";
    await expect(page.locator('[data-root-belief="treatment-only-touches-the-cancer"]')).toContainText(line);
    await expect(bubble(page)).toContainText(line);
    await page.goto("/beliefs");
    const card = page.locator('[data-root="treatment-only-touches-the-cancer"]');
    await expect(card).toContainText(line);
    await expect(card.getByRole("link", { name: /Why chemo causes hair loss/ })).toHaveAttribute("href", MELT);
    await page.screenshot({ path: `${SHOTS}/feature-root-beliefs-1440.png`, fullPage: false });
  });

  test("Explain it simpler on a hint and on the theory, never an error without a key", async ({ page }) => {
    await open(page, MELT);
    expect(await predictAndRun(page, "Nothing happens to them")).toBe("wrong");
    await page.getByRole("button", { name: "Another hint" }).click();
    const simpler = page.getByRole("button", { name: /Explain it simpler/ });
    await expect(simpler).toBeVisible();
    await simpler.click();
    await expect(page.locator("[data-simpler]")).toBeVisible();
    await expect(page.locator("[data-simpler]")).not.toBeEmpty();
    await page.getByRole("button", { name: /Change something and try again/ }).click();
    expect(await predictAndRun(page, "They are affected, like the cancer cells")).toBe("correct");
    await page.getByRole("button", { name: "See the theory" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: /Explain it simpler/ }).click();
    await expect(sheet.locator("[data-simpler]")).toBeVisible();
  });

  test("impact counter: friendly line without Redis, real number when the server has one", async ({ page }) => {
    await page.goto("/");
    const counter = page.locator("[data-impact]");
    await counter.scrollIntoViewIfNeeded();
    await expect(counter).toHaveAttribute("data-impact", "offline");
    await expect(counter).toContainText("taking a break");
    await page.route("**/api/impact", (route) => route.fulfill({ json: { count: 1234 } }));
    await page.reload();
    await page.locator("[data-impact]").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-impact]")).toHaveAttribute("data-impact", "live");
    await expect(page.locator("[data-impact]")).toContainText("1234", { timeout: 5000 });
    await expect(page.locator("[data-impact]")).toContainText("tricky ideas busted so far");
    await page.route("**/api/impact", (route) => route.fulfill({ status: 500, body: "down" }));
    await page.reload();
    await expect(page.locator("[data-impact]")).toHaveAttribute("data-impact", "offline");
    problems.splice(0, problems.length, ...problems.filter((p) => !/api\/impact|Failed to load resource/.test(p)));
  });
});

test.describe("Ask Ano edge cases", () => {
  let problems: string[] = [];
  test.beforeEach(({ page }) => {
    problems = watchConsole(page);
  });
  test.afterEach(() => {
    expect(problems, "console errors, hydration warnings or failed requests").toEqual([]);
  });

  test("an empty question keeps the box open with a nudge", async ({ page }) => {
    await open(page, MELT);
    await page.getByRole("button", { name: /Ask Ano/ }).click();
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByText(/Type a question first/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Your question for Ano" })).toBeVisible();
  });

  test("no key: a written hint, never an error", async ({ page }) => {
    await open(page, MELT);
    await page.getByRole("button", { name: /Ask Ano/ }).click();
    await page.getByRole("textbox", { name: "Your question for Ano" }).fill("Why did the hair cells drop?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(bubble(page)).not.toContainText(/error|failed|wrong with/i);
    await expect(page.getByRole("button", { name: /Ask Ano · 5 left/ })).toBeVisible();
  });

  test("a personal health question gets Ano's warm redirect", async ({ page }) => {
    await open(page, MELT);
    await page.getByRole("button", { name: /Ask Ano/ }).click();
    await page.getByRole("textbox", { name: "Your question for Ano" }).fill("Will my mum be okay?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(bubble(page)).toContainText(/doctor, nurse, parent or teacher|parent, teacher, doctor or nurse/);
    await expect(page.getByRole("button", { name: /Ask Ano · 5 left/ })).toBeVisible();
  });

  test("provider down (network failure) and limit hit both end in hints", async ({ page }) => {
    await open(page, MELT);
    expect(await predictAndRun(page, "Nothing happens to them")).toBe("wrong");
    await page.route("**/api/ask-ano", (route) => route.abort());
    await page.getByRole("button", { name: /Ask Ano/ }).click();
    await page.getByRole("textbox", { name: "Your question for Ano" }).fill("Why?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    // The next rung of the hint ladder opens instead.
    await expect(page.getByRole("list", { name: "Hints" }).getByRole("listitem")).toHaveCount(2);
    await page.unroute("**/api/ask-ano");
    await page.route("**/api/ask-ano", (route) => route.fulfill({ json: { answer: "A written hint.", source: "hint", remaining: 0 } }));
    await page.getByRole("button", { name: /Ask Ano/ }).click();
    await page.getByRole("textbox", { name: "Your question for Ano" }).fill("And now?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByRole("button", { name: /Ask Ano · 0 left/ })).toBeDisabled();
    await expect(page.getByText(/used all 5 questions/)).toBeVisible();
    await expect(page.getByRole("button", { name: /No questions left|Explain it simpler/ }).first()).toBeVisible();
    problems.splice(0, problems.length, ...problems.filter((p) => !/api\/ask-ano|Failed to load resource/.test(p)));
  });
});
