import { readdirSync, readFileSync } from "node:fs";

/*
 * The pages the gauntlet tests (GAUNTLET.md §5). GAUNTLET_CHANGED lists the
 * names screenshotted this round ("all" for every page; "experiments" for
 * every experiment page besides the two named ones).
 */

const BASE = [
  { name: "landing", path: "/" },
  { name: "levels", path: "/start" },
  { name: "labs", path: "/start/medium" },
  { name: "map", path: "/labs/robotics/medium" },
  { name: "led", path: "/labs/robotics/medium/robotics-led" },
  { name: "sealed-bag", path: "/labs/chemistry/easy/chemistry-sealed-bag" },
  { name: "beliefs", path: "/beliefs" },
  { name: "credits", path: "/credits" },
  { name: "not-found", path: "/this-page-does-not-exist" },
  { name: "design-system", path: "/design-system" },
];

/** Every other experiment page, from content/experiments (named by id). */
const EXPERIMENTS = readdirSync("content/experiments")
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(`content/experiments/${f}`, "utf8")) as { id: string; lab: string; level: string })
  .filter((e) => e.id !== "robotics-led" && e.id !== "chemistry-sealed-bag")
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((e) => ({ name: e.id, path: `/labs/${e.lab}/${e.level}/${e.id}`, experiment: true }));

export const PAGES: { name: string; path: string; experiment?: boolean }[] = [...BASE, ...EXPERIMENTS];

const changed = (process.env.GAUNTLET_CHANGED ?? "all").split(",").map((s) => s.trim());

export const CHANGED = changed.includes("all") ? PAGES : PAGES.filter((p) => changed.includes(p.name) || (p.experiment && changed.includes("experiments")));

export const WIDTHS = [1440, 1024, 390] as const;
