import { mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/*
 * Shared checks for the gauntlet gates (GAUNTLET.md §5):
 *  G6 console:   console errors, hydration warnings, failed requests, 4xx/5xx.
 *  G7 hit areas: for every button and link, the visual centre hits it, and
 *                its clickable box matches its visible box within 2 px. The
 *                visible box is what is drawn at rest or on hover: the
 *                element's own background, border or shadow, or a face child
 *                that paints one; otherwise the union of its text and icons.
 *  G8 axe:       serious and critical issues only.
 *  G9 visual:    screenshots under tests/screenshots/round-N/.
 */

export const ROUND = process.env.GAUNTLET_ROUND ?? "dev";
export const SHOTS = `tests/screenshots/round-${ROUND}`;
mkdirSync(SHOTS, { recursive: true });

export function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (m) => {
    const text = m.text();
    if (m.type() === "error") problems.push(`console.error: ${text.slice(0, 400)}`);
    else if (m.type() === "warning" && /hydrat|did not match|server rendered/i.test(text)) problems.push(`hydration: ${text.slice(0, 400)}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 400)}`));
  page.on("requestfailed", (r) => {
    const reason = r.failure()?.errorText ?? "";
    // A request cancelled by a navigation or a superseded prefetch isn't a failure.
    if (!reason.includes("ERR_ABORTED")) problems.push(`requestfailed: ${r.url()} ${reason}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`);
  });
  return problems;
}

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

export interface HitProblem {
  page: string;
  element: string;
  problem: string;
}

/** G7: centre click and clickable-vs-visible box for every visible button and link. */
export async function checkHitAreas(page: Page, label: string): Promise<{ checked: number; problems: HitProblem[]; small: string[] }> {
  const count = await page.evaluate(() => {
    // Disabled controls can't be clicked on purpose, so they aren't hit areas.
    const all = [...document.querySelectorAll<HTMLElement>("a[href], button:not(:disabled):not([aria-disabled='true'])")];
    let n = 0;
    for (const el of all) {
      el.removeAttribute("data-hit");
      if (el.closest("[aria-hidden='true'], [inert]")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      el.setAttribute("data-hit", String(n++));
    }
    return n;
  });
  const problems: HitProblem[] = [];
  const small: string[] = [];
  for (let i = 0; i < count; i++) {
    const sel = `[data-hit="${i}"]`;
    const info = await page.evaluate((s) => {
      const el = document.querySelector<HTMLElement>(s);
      if (!el) return null;
      el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 60);
      return { name: `${el.tagName.toLowerCase()} "${name}"`, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }, sel);
    if (!info) continue;
    if (info.w < 44 || info.h < 44) small.push(`${label}: ${info.name} ${Math.round(info.w)}×${Math.round(info.h)}`);
    await page.mouse.move(info.x, info.y);
    await page.waitForTimeout(340);
    const verdict = await page.evaluate((s) => {
      const el = document.querySelector<HTMLElement>(s);
      if (!el) return { centre: true, box: null as null | { own: Box; seen: Box } };
      const r = el.getBoundingClientRect();
      const own = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const centre = !!hit && (hit === el || el.contains(hit));
      const paints = (node: Element) => {
        const cs = getComputedStyle(node);
        const alpha = (c: string) => {
          const m = c.match(/rgba?\(([^)]+)\)/);
          if (!m) return c === "transparent" ? 0 : 1;
          const parts = m[1].split(/[ ,/]+/).filter(Boolean);
          return parts.length > 3 ? Number(parts[3]) : 1;
        };
        const border = ["Top", "Right", "Bottom", "Left"].some((side) => parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 && alpha(cs.getPropertyValue(`border-${side.toLowerCase()}-color`)) > 0.05);
        return alpha(cs.backgroundColor) > 0.02 || cs.backgroundImage !== "none" || border || cs.boxShadow !== "none";
      };
      const union = (a: Box | null, b: Box): Box => (a ? { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) } : b);
      const toBox = (rr: DOMRect): Box => ({ l: rr.left, t: rr.top, r: rr.right, b: rr.bottom });
      if (paints(el)) return { centre, box: { own, seen: own } };
      let face: Box | null = null;
      let faceArea = 0;
      let content: Box | null = null;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) {
          if (!n.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const rr = range.getBoundingClientRect();
          if (rr.width > 0) content = union(content, toBox(rr));
          continue;
        }
        const node = n as Element;
        const rr = node.getBoundingClientRect();
        if (rr.width < 1 || rr.height < 1) continue;
        if (node instanceof SVGSVGElement || node instanceof HTMLImageElement || node instanceof HTMLCanvasElement) content = union(content, toBox(rr));
        if (paints(node) && rr.width * rr.height > faceArea) {
          face = toBox(rr);
          faceArea = rr.width * rr.height;
        }
      }
      const ownArea = r.width * r.height;
      const seen = face && faceArea >= ownArea * 0.5 ? union(face, content ?? face) : (content ?? own);
      return { centre, box: { own, seen } };
    }, sel);
    if (!verdict.centre) problems.push({ page: label, element: info.name, problem: "visual centre doesn't hit it (covered or offset)" });
    if (verdict.box) {
      const { own, seen } = verdict.box;
      const d = Math.max(Math.abs(own.l - seen.l), Math.abs(own.t - seen.t), Math.abs(own.r - seen.r), Math.abs(own.b - seen.b));
      if (d > 2) problems.push({ page: label, element: info.name, problem: `clickable box differs from visible box by ${d.toFixed(1)} px` });
    }
  }
  await page.mouse.move(1, 1);
  return { checked: count, problems, small };
}

/** G8: axe, serious and critical issues only. */
export async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(" ")})`);
}

/** G9: screenshot at a width; viewport plus optional full page. */
export async function shoot(page: Page, name: string, width: number, full = false): Promise<void> {
  await page.screenshot({ path: `${SHOTS}/${name}-${width}.png` });
  if (full) await page.screenshot({ path: `${SHOTS}/${name}-${width}-full.png`, fullPage: true });
}

/** Open every "More" drawer and the "What's happening" toggle on the page (the subtraction pass hides extras behind them). */
export async function openMore(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelectorAll<HTMLDetailsElement>("details[data-more], details[data-inspector]").forEach((d) => (d.open = true)));
}
