import { expect, test } from "@playwright/test";
import { watchConsole } from "./gates";

/*
 * G13 hidden labs (GAUNTLET.md §6): nothing visible on the site mentions,
 * links to, counts or previews the earlier chemistry and robotics labs.
 * Their routes still work by direct link; nothing leads there.
 */

const PAGES = ["/", "/start", "/start/easy", "/start/medium", "/start/advanced", "/labs/cell/easy", "/labs/prevention/easy", "/labs/detection/easy", "/labs/treatment/medium", "/labs/cell/medium", "/labs/treatment/advanced", "/beliefs", "/science", "/credits", "/demo"];
const WORDS = /\b(chemistry|robotics|robot|circuit|LED|resistor|battery|gears?)\b/i;

for (const path of PAGES) {
  test(`no trace of the hidden labs on ${path}`, async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Scroll through, so scroll-revealed sections are in the page too.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 700) await page.evaluate((top) => window.scrollTo(0, top), y);
    const text = await page.evaluate(() => document.body.innerText);
    const hit = text.split("\n").find((l) => /\b(chemistry|robotics|robot|circuit|LED|resistor|battery|gears?)\b/i.test(l));
    expect(hit, `${path} shows: "${hit}"`).toBeUndefined();
    expect(WORDS.test(await page.title())).toBe(false);
    const links = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") ?? ""));
    expect(links.filter((h) => /\/labs\/(chemistry|robotics)\b/.test(h))).toEqual([]);
    expect(problems).toEqual([]);
  });
}
