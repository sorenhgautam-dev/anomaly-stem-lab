// Converts a font file into the three.js "typeface" JSON that FontLoader reads,
// so the 3D ANOMALY title can use real letterforms.
//
//   node scripts/make-typeface.mjs <font.woff|ttf> <out.json> [characters]
//
// Only use fonts whose licence allows conversion (e.g. OFL fonts without a
// Reserved Font Name). Host Grotesk is OFL with no RFN; keep its licence file
// next to the output.
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const { parse } = opentype;

const [input, output, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/make-typeface.mjs <font> <out.json> [characters]");
  process.exit(1);
}

const buffer = readFileSync(input);
const font = parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
const round = (n) => Math.round(n * 10) / 10;

const glyphs = {};
for (const ch of new Set(chars)) {
  const glyph = font.charToGlyph(ch);
  const box = glyph.getBoundingBox();
  // FontLoader expects the end point before the control points for q and b.
  const o = glyph.path.commands
    .map((c) => {
      switch (c.type) {
        case "M":
          return `m ${round(c.x)} ${round(c.y)}`;
        case "L":
          return `l ${round(c.x)} ${round(c.y)}`;
        case "Q":
          return `q ${round(c.x)} ${round(c.y)} ${round(c.x1)} ${round(c.y1)}`;
        case "C":
          return `b ${round(c.x)} ${round(c.y)} ${round(c.x1)} ${round(c.y1)} ${round(c.x2)} ${round(c.y2)}`;
        case "Z":
          return "z";
        default:
          return "";
      }
    })
    .join(" ");
  glyphs[ch] = { ha: round(glyph.advanceWidth), x_min: round(box.x1), x_max: round(box.x2), o };
}

const typeface = {
  glyphs,
  familyName: font.names.fontFamily?.en ?? "Unknown",
  ascender: font.ascender,
  descender: font.descender,
  underlinePosition: font.tables.post?.underlinePosition ?? 0,
  underlineThickness: font.tables.post?.underlineThickness ?? 0,
  boundingBox: {
    xMin: font.tables.head.xMin,
    yMin: font.tables.head.yMin,
    xMax: font.tables.head.xMax,
    yMax: font.tables.head.yMax,
  },
  resolution: font.unitsPerEm,
  capHeight: font.tables.os2?.sCapHeight ?? font.ascender * 0.7,
  original_font_information: { copyright: font.names.copyright?.en ?? "", license: "SIL Open Font License 1.1" },
  cssFontWeight: "normal",
  cssFontStyle: "normal",
};

writeFileSync(output, JSON.stringify(typeface));
console.log(`${Object.keys(glyphs).length} glyphs → ${output} (${(JSON.stringify(typeface).length / 1024).toFixed(1)} KB)`);
