import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/*
 * The polish checks: text that is clipped, text or buttons that overlap,
 * text that shakes while the page is idle, and layout shift while it loads,
 * on every page at 1440, 1024, 768 and 390 wide, on the production build.
 * These bugs never reach the console, so each is measured in the page:
 *  - clipped: an element's own text is wider or taller than its box with
 *    overflow hidden, or its box sticks out of an ancestor that clips;
 *  - overlap: two visible text runs or controls share more than a few
 *    pixels and neither contains the other;
 *  - shaking: an element with text moves (its box changes) while nothing
 *    is happening, sampled every frame for a second;
 *  - CLS: the sum of layout-shift entries from navigation to settled.
 * Screenshots go to tests/screenshots/polish-<round>/ for review.
 */

const ROUND = process.env.GAUNTLET_ROUND ?? "dev";
const DIR = `tests/screenshots/polish-${ROUND}`;
mkdirSync(DIR, { recursive: true });
const WIDTHS = [1440, 1024, 768, 390] as const;
const H = { 1440: 900, 1024: 768, 768: 1024, 390: 844 } as const;
const PAGES = [
  { name: "landing", path: "/" },
  { name: "levels", path: "/start" },
  { name: "labs", path: "/start/easy" },
  { name: "map", path: "/labs/cell/easy" },
  { name: "chemo", path: "/labs/treatment/medium/treatment-chemo-hair" },
  { name: "tumour", path: "/labs/detection/easy/detection-tumour-growth" },
  { name: "beliefs", path: "/beliefs" },
  { name: "science", path: "/science" },
  { name: "credits", path: "/credits" },
  { name: "not-found", path: "/nowhere" },
];

interface Finding {
  kind: "clipped" | "overlap" | "shaking";
  what: string;
  detail: string;
}

/** Elements that carry their own visible text, plus every control. */
const COLLECT = `(() => {
  const isVisible = (el) => {
    if (el.closest("[aria-hidden='true'], .sr-only, [hidden], dialog:not([open])")) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  const name = (el) => (el.tagName.toLowerCase() + ' "' + (el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\\s+/g, " ").slice(0, 48) + '"');
  return { isVisible, ownText, name };
})()`;

async function clippedAndOverlaps(page: Page): Promise<Finding[]> {
  return page.evaluate((collect) => {
    const { isVisible, ownText, name } = eval(collect);
    const out: { kind: "clipped" | "overlap"; what: string; detail: string }[] = [];
    const texts = [...document.querySelectorAll("body *")].filter((el) => ownText(el) && isVisible(el)) as HTMLElement[];
    for (const el of texts) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // Its own text doesn't fit its box, and the box hides the rest (or ellipsis cuts it).
      const hides = cs.overflow !== "visible" || cs.textOverflow === "ellipsis";
      if (hides && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)) out.push({ kind: "clipped", what: name(el), detail: `text ${el.scrollWidth}×${el.scrollHeight} in a ${el.clientWidth}×${el.clientHeight} box` });
      // An ancestor that clips cuts through it.
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.overflow === "visible" && acs.overflowX === "visible" && acs.overflowY === "visible") continue;
        const ar = a.getBoundingClientRect();
        // A scroller's content is meant to scroll; only hidden or clipped overflow cuts text.
        if (/auto|scroll/.test(acs.overflowX + acs.overflowY)) break;
        if (r.left < ar.left - 1 || r.right > ar.right + 1 || r.top < ar.top - 1 || r.bottom > ar.bottom + 1) {
          out.push({ kind: "clipped", what: name(el), detail: `cut by ${a.tagName.toLowerCase()}.${String(a.className).split(" ").slice(0, 3).join(".")}` });
        }
        break;
      }
    }
    // Overlaps between separate text runs and controls (not one inside the other). A text run's box is
    // where its letters are (its text nodes' range), not its padded element box.
    const textBox = (el: HTMLElement) => {
      let box: DOMRect | null = null;
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        box = box ? new DOMRect(Math.min(box.left, r.left), Math.min(box.top, r.top), Math.max(box.right, r.right) - Math.min(box.left, r.left), Math.max(box.bottom, r.bottom) - Math.min(box.top, r.top)) : r;
      }
      return box ?? el.getBoundingClientRect();
    };
    const controls = [...document.querySelectorAll("button, a[href], [role='slider'], input")].filter(isVisible) as HTMLElement[];
    const boxes = [...texts.map((el) => ({ el, r: textBox(el) })), ...controls.map((el) => ({ el, r: el.getBoundingClientRect() }))];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 3 && h > 3) {
          // Only a real overlap if one actually paints over the other at that point.
          const x = Math.max(a.r.left, b.r.left) + w / 2;
          const y = Math.max(a.r.top, b.r.top) + h / 2;
          const top = document.elementFromPoint(x, y);
          if (top && (a.el.contains(top) || b.el.contains(top))) out.push({ kind: "overlap", what: `${name(a.el)} × ${name(b.el)}`, detail: `${Math.round(w)}×${Math.round(h)} px` });
        }
      }
    }
    return out;
  }, COLLECT);
}

async function shaking(page: Page): Promise<Finding[]> {
  return page.evaluate(
    (collect) =>
      new Promise<{ kind: "shaking"; what: string; detail: string }[]>((resolve) => {
        const { isVisible, ownText, name } = eval(collect);
        const els = ([...document.querySelectorAll("body *")].filter((el) => ownText(el) && isVisible(el)) as HTMLElement[]).slice(0, 400);
        const first = els.map((el) => el.getBoundingClientRect());
        const most = els.map(() => 0);
        let frames = 0;
        const tick = () => {
          els.forEach((el, i) => {
            const r = el.getBoundingClientRect();
            most[i] = Math.max(most[i], Math.abs(r.left - first[i].left), Math.abs(r.top - first[i].top));
          });
          if (++frames < 60) requestAnimationFrame(tick);
          else resolve(els.flatMap((el, i) => (most[i] > 0.5 ? [{ kind: "shaking" as const, what: name(el), detail: `moved ${most[i].toFixed(1)} px while idle` }] : [])));
        };
        requestAnimationFrame(tick);
      }),
    COLLECT,
  );
}

for (const p of PAGES) {
  test(`polish: ${p.name}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    const findings: string[] = [];
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: H[w] });
      await page.goto(p.path);
      await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 20_000 });
      // Park the pointer in a corner, then let entrance animations finish.
      await page.mouse.move(2, H[w] - 2);
      await page.waitForTimeout(3500);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      if (cls > 0.05) findings.push(`${w}: CLS ${cls.toFixed(3)}`);
      for (const f of [...(await clippedAndOverlaps(page)), ...(await shaking(page))]) findings.push(`${w}: ${f.kind}: ${f.what} (${f.detail})`);
      await page.screenshot({ path: `${DIR}/${p.name}-${w}.png` });
    }
    expect(findings, `${p.name}: clipped, overlapping or shaking text, or layout shift`).toEqual([]);
  });
}
