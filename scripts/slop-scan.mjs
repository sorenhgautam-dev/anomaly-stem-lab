// G13 slop scan (GAUNTLET.md §5, DESIGN.md §0). Scans app/, components/,
// content/ and lib/ for the owner's banned patterns and exits 1 on any hit.
//
// A hit that is functional rather than decorative (a breadboard's holes, the
// ANOMALY scanline flash) is allowed when its line, or the line above, says
// `slop-ok: <reason>`. Allowed hits are listed with their reason so the log
// can explain each one.
//
//   node scripts/slop-scan.mjs          (report, exit 1 on hits)
//   node scripts/slop-scan.mjs --json   (machine-readable)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["app", "components", "content", "lib"];
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".json"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p)) && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

/** Blank out comments (keeping line numbers) so rules only see code and copy. */
function stripComments(src, ext) {
  if (ext === ".json") return src;
  let out = "";
  let i = 0;
  let str = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (str) {
      out += c;
      if (c === "\\") {
        out += n ?? "";
        i += 2;
        continue;
      }
      if (c === str) str = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      str = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && n === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    // A `//` comment, but not the `//` inside a URL like https://.
    if (c === "/" && n === "/" && src[i - 1] !== ":") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      out += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const familiesIn = (s) => {
  const found = new Set();
  for (const m of s.matchAll(/(?:from|via|to)-(apricot|flame|volt|grape|verify|anomaly)-\d{2,3}/g)) found.add(m[1]);
  for (const m of s.matchAll(/--color-(apricot|flame|volt|grape|verify|anomaly)-\d{2,3}/g)) found.add(m[1]);
  return found;
};

const BANNED_WORD = /\b(unlock\w*|elevat(e|es|ed|ing)|seamless\w*|revolutioni[sz]\w*|supercharg\w*|next-level|magic\w*)\b/i;

const RULES = [
  { id: "icon-pack", test: (l) => /from\s+["'](lucide-react|@heroicons\/|@phosphor-icons\/|react-icons|@tabler\/icons|@radix-ui\/react-icons)/.test(l) },
  { id: "emoji", test: (l) => /(?![©®™])\p{Extended_Pictographic}/u.test(l) },
  { id: "em-dash", test: (l) => l.includes("—") },
  { id: "banned-font", test: (l) => /\b(Inter|Geist|Geist_Mono|Space[_ ]Grotesk)\b/.test(l) || /--font-geist|font-geist/.test(l) },
  { id: "glass-blur", test: (l) => /backdrop-blur|backdrop-filter|backdropFilter/.test(l) },
  { id: "radial-or-conic", test: (l) => /radial-gradient|conic-gradient/.test(l) },
  { id: "dot-or-grid-bg", test: (l) => /bg-(grid|dot)\b|bg-\[size:|repeating-(linear|radial)-gradient|background-size:\s*\d+px\s+\d+px/.test(l) },
  { id: "sparkles", test: (l) => /\bSparkles?\b|sparkle/i.test(l) },
  { id: "iridescence", test: (l) => /iridescen/i.test(l) },
  { id: "multi-hue-gradient", test: (l) => /gradient|from-|bg-linear|bg-radial/.test(l) && familiesIn(l).size > 1 },
  { id: "slop-copy", test: (l) => /\bnot just\b|\b(doesn'?t|don'?t|isn'?t|aren'?t|wasn'?t) just\b|\bnot only\b|\bit'?s not\b[^.;]{1,60}\bit'?s\b|\bisn'?t\b[^.;]{1,60}\bit'?s\b|\bnever\b[^.;]{1,60},? only\b|\bmore than an?\b/i.test(l) },
  { id: "banned-word", test: (l) => BANNED_WORD.test(l) },
];

// Fake demo data: result cards must show simulator output, so neither the
// landing content nor a component may hard-code a prediction or a reality.
function fakeDemoHits(file, lines) {
  const json = /content[\\/]landing\.json$/.test(file);
  const tsx = file.endsWith(".tsx");
  if (!json && !tsx) return [];
  const hits = [];
  lines.forEach((l, i) => {
    if ((json && /"(reality|prediction)"\s*:\s*"/.test(l)) || (tsx && /\b(prediction|reality)=["'][^"']/.test(l))) hits.push({ rule: "fake-demo-data", line: i + 1, text: l.trim() });
  });
  return hits;
}

// Multi-line gradients (SVG <linearGradient> blocks, canvas colour stops):
// each block may use one hue family only.
function gradientBlockHits(file, code) {
  const hits = [];
  const src = code.join("\n");
  for (const m of src.matchAll(/<(linear|radial)Gradient[\s\S]*?<\/\1Gradient>/g)) {
    const fam = new Set([...m[0].matchAll(/--color-(apricot|flame|volt|grape|verify|anomaly)-\d{2,3}/g)].map((x) => x[1]));
    if (fam.size > 1) hits.push({ rule: "multi-hue-gradient", line: src.slice(0, m.index).split("\n").length, text: `<${m[1]}Gradient> mixes ${[...fam].join(", ")}` });
  }
  return hits;
}

const hits = [];
const allowed = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const raw = readFileSync(file, "utf8");
    const rawLines = raw.split("\n");
    const code = stripComments(raw, extname(file)).split("\n");
    const found = [];
    code.forEach((l, i) => {
      for (const r of RULES) if (r.test(l)) found.push({ rule: r.id, line: i + 1, text: rawLines[i].trim() });
      // Banned words count in comments too (DESIGN.md §0: "everywhere in the product, its copy and its code").
      if (!RULES.find((r) => r.id === "banned-word").test(l) && BANNED_WORD.test(rawLines[i])) found.push({ rule: "banned-word", line: i + 1, text: rawLines[i].trim() });
    });
    found.push(...fakeDemoHits(file, rawLines), ...gradientBlockHits(file, code));
    for (const h of found) {
      const ok = [rawLines[h.line - 1], rawLines[h.line - 2] ?? ""].map((l) => l.match(/slop-ok:\s*(.+?)(\*\/|$)/)).find(Boolean);
      (ok ? allowed : hits).push({ file, ...h, reason: ok?.[1].trim() });
    }
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ hits, allowed }, null, 2));
} else {
  const show = (h) => `  ${h.file}:${h.line}  [${h.rule}]  ${h.text.slice(0, 110)}`;
  console.log(`G13 slop scan: ${hits.length} hit(s), ${allowed.length} allowed`);
  const byRule = {};
  for (const h of hits) byRule[h.rule] = (byRule[h.rule] ?? 0) + 1;
  for (const [r, n] of Object.entries(byRule)) console.log(`  ${r}: ${n}`);
  if (hits.length) console.log("\nHits:\n" + hits.map(show).join("\n"));
  if (allowed.length) console.log("\nAllowed (functional):\n" + allowed.map((h) => `${show(h)}\n      reason: ${h.reason}`).join("\n"));
}
process.exit(hits.length ? 1 : 0);
