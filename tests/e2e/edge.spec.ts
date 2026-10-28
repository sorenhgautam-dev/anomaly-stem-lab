import { expect, test, type Page } from "@playwright/test";
import { initialBuild } from "../../engine/edits";
import { realModel } from "../../engine/registry";
import { simulateOutcome } from "../../engine/run";
import { getExperiment } from "../../lib/content";
import { PAGES } from "./pages";
import { watchConsole } from "./gates";

/*
 * Edge cases on the production build: sliders at both ends, running twice,
 * double clicks on Run, leaving mid-run, empty, saved and cleared storage,
 * keyboard only, reduced motion, refresh on every route, the browser's back
 * and forward, voice without ElevenLabs and mute. Fails on any console error.
 */

const MELT = "/labs/chemistry/easy/chemistry-melting";
const MAP = "/labs/chemistry/easy";

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main[data-phase]")).toBeVisible();
}

async function run(page: Page, option: string) {
  await page.getByRole("radio", { name: option, exact: true }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.locator("main[data-verdict]")).toBeVisible({ timeout: 40_000 });
  return page.locator("main[data-verdict]").getAttribute("data-verdict");
}

const answerFor = (id: string, settings: Record<string, number>) => {
  const def = getExperiment(id)!;
  const start = initialBuild(def);
  const o = simulateOutcome(def, { ...start, settings: { ...start.settings, ...settings } }, realModel(def.stage));
  return o.result.type === "choice" ? o.result.value : "";
};

async function clearStorage(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Storage.clearDataForOrigin", { origin: new URL(page.url()).origin, storageTypes: "indexeddb,local_storage" });
}

let problems: string[] = [];
test.beforeEach(({ page }) => {
  problems = watchConsole(page);
});
test.afterEach(() => {
  expect(problems, "console errors, hydration warnings or failed requests").toEqual([]);
});

test.describe("sliders and runs", () => {
  for (const [id, path, control] of [
    ["chemistry-melting", MELT, "power"],
    ["chemistry-gas-laws", "/labs/chemistry/advanced/chemistry-gas-laws", "volume"],
    ["robotics-steering", "/labs/robotics/medium/robotics-steering", "right"],
  ] as const) {
    test(`${id}: slider at its minimum and maximum`, async ({ page }) => {
      test.setTimeout(120_000);
      const def = getExperiment(id)!;
      const c = def.controls!.find((x) => x.id === control)!;
      if (c.type !== "slider") throw new Error("not a slider");
      await open(page, path);
      for (const [key, value] of [["Home", c.min], ["End", c.max]] as const) {
        const slider = page.getByRole("slider", { name: new RegExp(c.label) });
        await slider.focus();
        await page.keyboard.press(key);
        await expect(slider).toHaveValue(String(value));
        expect(await run(page, answerFor(id, { [control]: value })), `${id} at ${value}`).toBe("correct");
        // A fresh page for the other end.
        await page.goto(path);
        await expect(page.locator('main[data-phase="build"]')).toBeAttached();
      }
    });
  }

  test("running the same wrong guess twice makes Ano surer, and a double click runs once", async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, MELT);
    expect(await run(page, "Keep rising")).toBe("wrong");
    await expect(page.getByText("Maybe you used this idea:")).toBeVisible();
    await page.getByRole("button", { name: /Change something and try again/ }).click();
    // Three clicks in one go: only one run starts.
    await page.getByRole("radio", { name: "Keep rising", exact: true }).click();
    await page.getByRole("button", { name: /^Run/ }).evaluate((b: HTMLButtonElement) => {
      b.click();
      b.click();
      b.click();
    });
    await expect(page.locator('main[data-verdict="wrong"]')).toBeAttached({ timeout: 40_000 });
    await expect(page.getByText("This looks like the idea you used:")).toBeVisible();
    await page.goto("/beliefs");
    // Two runs counted (fairly sure, both wrong), not four.
    await expect(page.locator('[data-calibration="fairly"]')).toContainText("0 of 2 right");
  });

  test("leaving mid-run and coming back starts fresh and saves nothing", async ({ page }) => {
    test.setTimeout(90_000);
    await open(page, MELT);
    await page.getByRole("radio", { name: "Keep rising", exact: true }).click();
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.locator('main[data-phase="running"]')).toBeAttached();
    await page.goBack();
    await page.goto(MELT);
    await expect(page.locator('main[data-phase="build"]')).toBeAttached();
    await page.waitForTimeout(12_000);
    await expect(page.locator("main[data-verdict]")).toHaveCount(0);
    await page.goto("/beliefs");
    await expect(page.locator('[data-calibration="fairly"]')).toContainText("no guesses yet");
  });

  test("slow motion, pause, rewind and scrubbing during a run", async ({ page }) => {
    test.setTimeout(90_000);
    await open(page, MELT);
    await page.getByRole("radio", { name: "Stay at 0 °C", exact: true }).click();
    await page.getByRole("button", { name: /^Run/ }).click();
    await page.getByRole("radio", { name: "¼×" }).click();
    await page.getByRole("button", { name: "Pause" }).click();
    const clock = page.locator("output").filter({ hasText: / s$/ }).first();
    const at = await clock.textContent();
    await page.waitForTimeout(800);
    expect(await clock.textContent(), "paused clock stands still").toBe(at);
    await page.getByRole("button", { name: "Rewind and play again" }).click();
    await page.getByRole("radio", { name: "1×" }).click();
    await expect(page.locator('main[data-verdict="correct"]')).toBeAttached({ timeout: 40_000 });
    // The clock ends on the run's own clock: 380 s of heating, the same as the 3D chart's axis.
    await expect(clock).toHaveText("380.0 s");
  });
});

const CHEMO_LAB = "/labs/treatment/medium/treatment-chemo-hair";
const CHEMO_MAP = "/labs/treatment/medium";

test.describe("storage", () => {
  test("first visit, return visit and cleared storage", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/beliefs");
    await clearStorage(page);
    await page.reload();
    await expect(page.getByText(/0 busted · 0 still testing · \d+ not tested yet/)).toBeVisible();
    await expect(page.getByText(/No surprises yet/)).toBeVisible();
    // A cancer idea (My beliefs counts only the visible labs' ideas).
    await open(page, CHEMO_LAB);
    expect(await run(page, "Nothing happens to them")).toBe("wrong");
    await page.getByRole("button", { name: /Change something and try again/ }).click();
    // Busting the idea reports one real bust to the live counter, and only that.
    const bust = page.waitForRequest((r) => r.url().endsWith("/api/impact") && r.method() === "POST");
    expect(await run(page, "They are affected, like the cancer cells")).toBe("correct");
    expect((await bust).postDataJSON()).toEqual({ experimentId: "treatment-chemo-hair", misconceptionId: "chemo-targets-only-cancer" });
    // Return visit: a fresh load reads the saved progress.
    await page.goto("/beliefs");
    await expect(page.getByText(/1 busted · 0 still testing/)).toBeVisible();
    await page.goto(CHEMO_MAP);
    await expect(page.locator(`a[href="${CHEMO_LAB}"]`).first()).toBeVisible();
    await clearStorage(page);
    await page.goto("/beliefs");
    await expect(page.getByText(/0 busted · 0 still testing/)).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("refresh on every route, deep links included", async ({ page }) => {
    test.setTimeout(300_000);
    for (const p of PAGES) {
      const res = await page.goto(p.path);
      await page.reload();
      await expect(page.locator("main").first(), p.path).toBeVisible();
      if (p.name === "not-found") expect(res?.status()).toBe(404);
    }
    problems.splice(0, problems.length, ...problems.filter((x) => !/this-page-does-not-exist|status of 404/.test(x)));
  });

  test("browser back and forward around a finished run", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(MAP);
    await page.locator(`a[href="${MELT}"]:visible`).first().click();
    await expect(page).toHaveURL(new RegExp(`${MELT}$`));
    expect(await run(page, "Stay at 0 °C")).toBe("correct");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${MAP}$`));
    await page.goForward();
    await expect(page.locator('main[data-phase="build"]')).toBeAttached();
  });
});

test.describe("access", () => {
  test("keyboard only: finish an experiment", async ({ page }) => {
    test.setTimeout(90_000);
    await open(page, MELT);
    // Tab until the guess is focused, pick it with the keyboard, then tab to Run.
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? "");
      if (/Keep rising|Stay at 0|Drop/.test(name ?? "")) break;
    }
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");
    for (let i = 0; i < 20; i++) {
      const isRun = await page.evaluate(() => /^Run/.test(document.activeElement?.textContent?.trim() ?? ""));
      if (isRun) break;
      await page.keyboard.press("Tab");
    }
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return { text: el.textContent?.trim(), ring: getComputedStyle(el).outlineStyle !== "none" || getComputedStyle(el).boxShadow !== "none" };
    });
    expect(focused.text).toMatch(/^Run/);
    expect(focused.ring, "visible focus ring on Run").toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.locator("main[data-verdict]")).toBeAttached({ timeout: 40_000 });
  });

  test("reduced motion: the replay jumps straight to the moment", async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, MELT);
    expect(await run(page, "Keep rising")).toBe("wrong");
    await expect(page.locator("section[data-replay]")).toHaveAttribute("data-replay", "paused", { timeout: 5000 });
  });
});

test.describe("voice", () => {
  test("no ElevenLabs: Listen uses the browser's voice; mute silences it", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __spoken: string[] };
      w.__spoken = [];
      if ("speechSynthesis" in window) {
        window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
          w.__spoken.push(u.text);
        };
      }
    });
    // An Ask Ano answer tries ElevenLabs first; here it's down, so the browser speaks it.
    await page.route("**/api/ano-voice", (route) => route.fulfill({ status: 503, body: "" }));
    await page.route("**/api/ask-ano", (route) => route.fulfill({ json: { answer: "Think of the ice like a crowd holding hands. What breaks first?", source: "ai", remaining: 4 } }));
    await open(page, MELT);
    await page.getByRole("button", { name: /Ask Ano/ }).click();
    await page.getByRole("textbox", { name: "Your question for Ano" }).fill("Why zero?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.locator("[data-lab-ano-dock]")).toContainText("crowd holding hands");
    const voiceCalls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/ano-voice")) voiceCalls.push(r.url());
    });
    await page.getByRole("button", { name: "Listen" }).first().click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)).toBe(1);
    expect(voiceCalls.length, "tried ElevenLabs first").toBe(1);
    await page.getByRole("button", { name: /^(Stop|Listen)$/ }).first().click();
    await page.getByRole("button", { name: /sound/i }).first().click();
    await page.getByRole("button", { name: "Listen" }).first().click();
    await expect(page.getByText("Sound is off. Turn it on at the top to hear Ano.")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)).toBe(1);
    problems.splice(0, problems.length, ...problems.filter((x) => !/ano-voice|Failed to load resource/.test(x)));
  });
});

async function sideways(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(300);
  return page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
}

test.describe("screen sizes", () => {
  for (const width of [1440, 1280, 768]) {
    for (const p of PAGES) {
      test(`no sideways scroll on ${p.name} at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(p.path);
        await page.waitForLoadState("load");
        const { scroll, inner } = await sideways(page);
        expect(scroll, `${p.name} is ${scroll}px wide at ${width}`).toBeLessThanOrEqual(inner);
        problems.splice(0, problems.length, ...problems.filter((x) => !/this-page-does-not-exist|status of 404/.test(x)));
      });
    }
  }

  for (const width of [1440, 1280, 1024, 768, 390]) {
    test(`a busy lab result (replay, hints, What if?) fits at ${width}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await open(page, MELT);
      expect(await run(page, "Keep rising")).toBe("wrong");
      await expect(page.locator("section[data-replay]")).toHaveAttribute("data-replay", "paused", { timeout: 20_000 });
      await page.getByRole("button", { name: "Another hint" }).click();
      const { scroll, inner } = await sideways(page);
      expect(scroll).toBeLessThanOrEqual(inner);
      // Every button can be reached: inside the page's width and scrollable into view.
      const out = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main button, main a[href]")]
          .filter((b) => b.checkVisibility())
          .map((b) => ({ name: b.textContent?.trim().slice(0, 40), r: b.getBoundingClientRect() }))
          .filter(({ r }) => r.left < -1 || r.right > window.innerWidth + 1)
          .map(({ name }) => name),
      );
      expect(out, "buttons outside the screen").toEqual([]);
    });
  }
});

test.describe("slow devices", () => {
  test("Slow 3G: the preloader shows, then the landing and a deep link work", async ({ page }) => {
    test.setTimeout(300_000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (500 * 1024) / 8, uploadThroughput: (500 * 1024) / 8 });
    await page.goto("/", { timeout: 240_000, waitUntil: "commit" });
    await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 240_000 });
    await expect(page.locator('[aria-roledescription="carousel"]')).toBeVisible();
    await page.goto(MELT, { timeout: 240_000 });
    await expect(page.locator('main[data-phase="build"]')).toBeAttached({ timeout: 240_000 });
    await expect(page.getByRole("radio", { name: "Keep rising", exact: true })).toBeVisible({ timeout: 120_000 });
  });

  test("Low tier with the CPU slowed 4×: a run and its replay stay smooth", async ({ page }, info) => {
    test.setTimeout(150_000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await open(page, `${MELT}?quality=low`);
    expect(await run(page, "Keep rising")).toBe("wrong");
    await expect(page.locator("section[data-replay]")).toHaveAttribute("data-replay", "paused", { timeout: 30_000 });
    await page.getByRole("button", { name: "Keep watching" }).click();
    const frames = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const out: number[] = [];
          let last = performance.now();
          const end = last + 3000;
          const tick = (now: number) => {
            out.push(now - last);
            last = now;
            if (now < end) requestAnimationFrame(tick);
            else resolve(out);
          };
          requestAnimationFrame(tick);
        }),
    );
    const fps = 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length);
    const p95 = [...frames].sort((a, b) => a - b)[Math.floor(frames.length * 0.95)];
    info.annotations.push({ type: "perf", description: `Low tier, CPU 4×: ${fps.toFixed(1)} fps, p95 ${p95.toFixed(1)} ms` });
    console.log(`Low tier, CPU 4×: ${fps.toFixed(1)} fps, p95 ${p95.toFixed(1)} ms`);
    expect(fps, "at least a steady 30 fps on the Low tier (DESIGN.md §9.2)").toBeGreaterThan(30);
  });
});
