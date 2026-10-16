import { ExtrudeGeometry, Vector3 } from "three";
import { Font, type FontData } from "three/addons/loaders/FontLoader.js";
import typeface from "./fonts/host-grotesk-600.typeface.json";

/*
 * The 3D ANOMALY title uses Host Grotesk SemiBold, the same family as the
 * page type. It's OFL with no Reserved Font Name, so it may be converted;
 * fonts/host-grotesk-600.typeface.json is made by scripts/make-typeface.mjs
 * and its licence sits next to it.
 */

const font = new Font(typeface as unknown as FontData);

/** Cap height of the letters in title units (the title group is scaled down). */
const CAP = 1.4;
const SIZE = CAP / (typeface.capHeight / typeface.resolution);
const SCALE = SIZE / typeface.resolution;
/** Extra space between letters, in title units. */
const TRACKING = 0.1;
const DEPTH = 0.42;

export interface Letter {
  char: string;
  geometry: ExtrudeGeometry;
  /** Assembled position of the letter's centre, before the title scale. */
  home: Vector3;
}

type Glyphs = Record<string, { ha: number }>;

/** Build the extruded letters of a word, each centred on its own origin. */
export function buildWord(word: string): Letter[] {
  const glyphs = typeface.glyphs as Glyphs;
  const chars = [...word];
  const advances = chars.map((char) => {
    const glyph = glyphs[char];
    if (!glyph) throw new Error(`No 3D glyph for "${char}"`);
    return glyph.ha * SCALE;
  });
  const total = advances.reduce((sum, a) => sum + a, 0) + TRACKING * (chars.length - 1);

  let x = -total / 2;
  return chars.map((char, i) => {
    const geometry = new ExtrudeGeometry(font.generateShapes(char, SIZE), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.028,
      bevelSegments: 6,
      curveSegments: 20,
    });
    // Centre on the glyph's advance box so natural side bearings are kept.
    geometry.translate(-advances[i] / 2, -CAP / 2, -DEPTH / 2);
    const home = new Vector3(x + advances[i] / 2, 0, 0);
    x += advances[i] + TRACKING;
    return { char, geometry, home };
  });
}
