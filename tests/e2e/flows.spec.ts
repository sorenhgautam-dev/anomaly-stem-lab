import { expect, test, type Page } from "@playwright/test";
import { watchConsole } from "./gates";

/*
 * G5 flows + G6 console (GAUNTLET.md §5) on the production build. Every test
 * fails on a console error, hydration warning or failed request.
 */

const CHEMO = "/labs/treatment/medium/treatment-chemo-hair";
const TUMOUR = "/labs/detection/easy/detection-tumour-growth";

async function experiment(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main[data-phase]")).toBeVisible();
}

/** Pick a prediction, press Run and wait for the simulator's verdict. */
async function predictAndRun(page: Page, option: string) {
  await page.getByRole("radio", { name: option, exact: true }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.locator("main[data-verdict]")).toBeVisible({ timeout: 30_000 });
  return page.locator("main[data-verdict]").getAttribute("data-verdict");
}

async function expectCorrect(page: Page) {
  await expect(page.getByRole("link", { name: /Next experiment|Finish the level/ })).toBeVisible();
  await page.getByRole("button", { name: "See the theory" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

async function expectAnomaly(page: Page) {
  // The ANOMALY word shows for under two seconds; its status (and the pill under it) says so.
  await expect(page.getByText(/not what you guessed/i).first()).toBeAttached();
  // What stays: the verdict, the Result card's reality row and the hint ladder.
  await expect(page.locator('main[data-verdict="wrong"]')).toBeAttached();
  await expect(page.getByRole("button", { name: /change something and try again/i })).toBeVisible();
}

test.describe("G5 flows", () => {
  let problems: string[] = [];
  test.beforeEach(({ page }) => {
    problems = watchConsole(page);
  });
  test.afterEach(() => {
    expect(problems, "G6: console errors, hydration warnings or failed requests").toEqual([]);
  });

  test("journey: landing → level → lab → map → experiment", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="/start"]:visible').first().click();
    await expect(page).toHaveURL(/\/start$/);
    await page.locator('a[href="/start/medium"]:visible').first().click();
    await expect(page).toHaveURL(/\/start\/medium$/);
    await page.locator('a[href="/labs/treatment/medium"]:visible').first().click();
    await expect(page).toHaveURL(/\/labs\/treatment\/medium$/, { timeout: 20_000 });
    await page.locator(`a[href="${CHEMO}"]:visible`).first().click();
    await expect(page).toHaveURL(new RegExp(`${CHEMO}$`));
    await expect(page.getByRole("radio", { name: "Nothing happens to them", exact: true })).toBeVisible();
  });

  test("demo path: landing → chemo experiment → ANOMALY moment → theory", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Try it" }).first().click();
    await expect(page).toHaveURL(new RegExp(`${CHEMO}$`));
    expect(await predictAndRun(page, "Nothing happens to them")).toBe("wrong");
    await expectAnomaly(page);
    await page.getByRole("button", { name: /Change something and try again/ }).click();
    expect(await predictAndRun(page, "They are affected, like the cancer cells")).toBe("correct");
    await expectCorrect(page);
  });

  test("How tumours grow: correct prediction, then the theory", async ({ page }) => {
    await experiment(page, TUMOUR);
    expect(await predictAndRun(page, "It stays tiny for a long time, then grows fast")).toBe("correct");
    await expectCorrect(page);
  });

  test("How tumours grow: wrong prediction shows the ANOMALY moment", async ({ page }) => {
    await experiment(page, TUMOUR);
    expect(await predictAndRun(page, "It grows by the same amount every month")).toBe("wrong");
    await expectAnomaly(page);
  });

  test("back navigation and breadcrumbs", async ({ page }) => {
    await page.goto("/labs/treatment/medium");
    await page.locator(`a[href="${CHEMO}"]:visible`).first().click();
    await expect(page).toHaveURL(new RegExp(`${CHEMO}$`));
    await page.goBack();
    await expect(page).toHaveURL(/\/labs\/treatment\/medium$/);
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${CHEMO}$`));
    const crumbs = page.getByRole("navigation", { name: /breadcrumb|where you are/i });
    await crumbs.locator('a[href="/labs/treatment/medium"]').click();
    await expect(page).toHaveURL(/\/labs\/treatment\/medium$/);
    await crumbs.locator('a[href="/start"]').click();
    await expect(page).toHaveURL(/\/start$/);
  });

  test("first load: the preloader counts up, then gets out of the way", async ({ page }) => {
    await page.goto("/start");
    const loader = page.getByRole("progressbar", { name: "Loading ANOMALY" });
    await expect(loader).toBeHidden({ timeout: 6_000 });
    await expect(page.getByRole("link", { name: /Easy/ }).first()).toBeVisible();
  });

  test("404: lost in space, with a way home", async ({ page }) => {
    const res = await page.goto("/nowhere-near-the-lab");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /lost in space/i })).toBeVisible();
    // The page itself answers 404 on purpose; that's not a failure.
    problems.splice(0, problems.length, ...problems.filter((p) => !/nowhere-near-the-lab|status of 404/.test(p)));
    await page.getByRole("link", { name: "Back home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("carousel: arrows, dots and swipe", async ({ page }) => {
    await page.goto("/");
    const carousel = page.locator('[aria-roledescription="carousel"]');
    test.skip((await carousel.count()) === 0, "The hero carousel is built in round 3");
    const current = () => carousel.locator('[aria-roledescription="slide"][aria-hidden="false"]').getAttribute("aria-label");
    const first = await current();
    await carousel.getByRole("button", { name: /^Next/ }).click();
    await expect.poll(current).not.toBe(first);
    await carousel.getByRole("button", { name: /^Previous/ }).click();
    await expect.poll(current).toBe(first);
    await carousel.getByRole("button", { name: /3 of 3/ }).click();
    await expect.poll(current).toMatch(/3 of 3/);
    const box = (await carousel.boundingBox())!;
    const y = box.y + box.height * 0.45;
    await page.mouse.move(box.x + box.width * 0.75, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(current).toMatch(/1 of 3/);
  });

});
