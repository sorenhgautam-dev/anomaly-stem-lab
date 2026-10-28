import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { watchConsole, openMore } from "./gates";

/*
 * "Guess with the room" end to end on the production build (CLAUDE.md §D):
 * the host opens a room from the chemo experiment, two phones join by URL
 * and guess, the live bars and the teacher view count them, the host
 * reveals, and each phone shows what the simulator says with the right
 * words for its guess. Screenshots of every state at 1440 (host, teacher)
 * and 390 (phones). Without Upstash keys this runs on the server's memory.
 */

const ROUND = process.env.GAUNTLET_ROUND ?? "dev";
const DIR = `tests/screenshots/live-${ROUND}`;
mkdirSync(DIR, { recursive: true });
const RIGHT = "They are affected, like the cancer cells";
const WRONG = "Nothing happens to them";

test("live mode: open, join, guess, count, reveal, teacher view", async ({ browser, page }) => {
  test.setTimeout(180_000);
  const problems = watchConsole(page);
  await page.goto("/labs/treatment/medium/treatment-chemo-hair");
  await openMore(page);
  await page.getByRole("button", { name: "Guess together" }).click();
  const code = (await page.locator("[data-room-code]").textContent({ timeout: 15_000 }))!.trim();
  expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  await expect(page.getByRole("img", { name: `QR code to join room ${code}` })).toBeVisible();
  await page.screenshot({ path: `${DIR}/host-open-1440.png` });

  const phones = await Promise.all([0, 1].map(() => browser.newContext({ viewport: { width: 390, height: 844 } })));
  const [a, b] = await Promise.all(phones.map((c) => c.newPage()));
  const phoneProblems = [watchConsole(a), watchConsole(b)];
  await a.goto(`/join/${code.toLowerCase()}`);
  await b.goto(`/join/${code}`);
  await a.getByRole("button", { name: RIGHT }).click();
  await b.getByRole("button", { name: WRONG }).click();
  await expect(a.getByText("Your guess is in.")).toBeVisible();
  await expect(b.getByText("Your guess is in.")).toBeVisible();
  await a.screenshot({ path: `${DIR}/phone-guessed-390.png` });

  // The host's bars count both guesses (they poll every 1.5 s).
  await expect(page.getByText("2 guesses so far")).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: `${DIR}/host-counted-1440.png` });

  // A phone can't vote twice: a second guess with the same voter token is refused, so the count stays at 2.
  const again = await a.evaluate(async (c) => {
    const voter = sessionStorage.getItem(`anomaly:live:${c}`);
    const res = await fetch(`/api/live/${c}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vote: 0, voter }) });
    return ((await res.json()) as { ok: boolean }).ok;
  }, code);
  expect(again).toBe(false);
  const teacher = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const teacherProblems = watchConsole(teacher);
  await teacher.goto(`/teacher/${code}`);
  await expect(teacher.locator("[data-class-total='2']")).toBeVisible({ timeout: 10_000 });
  await expect(teacher.getByText("1 of 2 guessed something else (50%).")).toBeVisible();
  await expect(teacher.getByText(`Most common other guess: “${WRONG}” (1).`, { exact: false })).toBeVisible();
  await expect(teacher.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 20_000 });
  await teacher.waitForTimeout(800);
  await teacher.screenshot({ path: `${DIR}/teacher-1440.png`, fullPage: true });

  await page.getByRole("button", { name: "Show the answer on phones" }).click();
  await expect(page.getByText("Phones now show what really happens.", { exact: false })).toBeVisible();
  await expect(a.locator("[data-live-result='right']")).toBeVisible({ timeout: 10_000 });
  await expect(b.locator("[data-live-result='wrong']")).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText(RIGHT)).toBeVisible();
  await a.screenshot({ path: `${DIR}/phone-right-390.png` });
  await b.screenshot({ path: `${DIR}/phone-wrong-390.png` });
  await expect(teacher.getByText("answer shown", { exact: false })).toBeVisible({ timeout: 10_000 });

  // A code that doesn't exist says so kindly.
  await a.goto("/join/ZZZZ");
  await expect(a.getByText("We couldn't find that room")).toBeVisible({ timeout: 10_000 });
  await a.screenshot({ path: `${DIR}/phone-missing-390.png` });

  await Promise.all(phones.map((c) => c.close()));
  expect([...problems, ...phoneProblems.flat(), ...teacherProblems].filter((p) => !/\/api\/live\/ZZZZ|status of 404/.test(p))).toEqual([]);
});
