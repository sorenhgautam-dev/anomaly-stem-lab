import { Color } from "three";
import { PALETTE as P } from "@/lib/tokens";

/*
 * Indicator colours for the liquid stages (DESIGN.md §3, §8.1 "colour-change
 * swirls in liquids"): the engine gives a colour as a hue in degrees
 * (engine/chemistry/indicator.ts, neutralise.ts); these map it onto the
 * nearest palette tokens, blending between neighbours so the change is
 * smooth. They write into a Color you pass, so useFrame never allocates.
 */

type Stops = [number, Color][];

const stops = (list: [number, string][]): Stops => list.map(([h, c]) => [h, new Color(c)]);

/** Red cabbage: pink-red in acid, purple near neutral, blue then green in base. */
const CABBAGE = stops([
  [55, P.apricot[300]],
  [120, P.verify[500]],
  [170, P.verify[500]],
  [200, P.volt[400]],
  [235, P.volt[500]],
  [270, P.grape[500]],
  [300, P.grape[400]],
  [330, P.flame[400]],
  [355, P.flame[500]],
]);

/** Universal indicator: red, orange, yellow, green at pH 7, blue, then violet. */
const UNIVERSAL = stops([
  [0, P.anomaly[500]],
  [25, P.apricot[500]],
  [50, P.apricot[300]],
  [120, P.verify[500]],
  [170, P.verify[700]],
  [210, P.volt[400]],
  [245, P.volt[600]],
  [280, P.grape[500]],
]);

function pick(list: Stops, hue: number, out: Color): Color {
  if (hue <= list[0][0]) return out.copy(list[0][1]);
  for (let i = 1; i < list.length; i++) {
    const [h1, c1] = list[i];
    if (hue <= h1) {
      const [h0, c0] = list[i - 1];
      return out.copy(c0).lerp(c1, (hue - h0) / (h1 - h0));
    }
  }
  return out.copy(list[list.length - 1][1]);
}

export const cabbageColour = (hue: number, out: Color) => pick(CABBAGE, hue, out);
export const universalColour = (hue: number, out: Color) => pick(UNIVERSAL, hue, out);

/** Universal indicator hue at a pH: the same table as engine/chemistry/neutralise.ts, for the pH chart's chips. */
const UNIVERSAL_HUE: [number, number][] = [[0, 0], [1, 0], [3, 25], [5, 50], [6, 80], [7, 120], [8, 170], [9, 210], [11, 245], [13, 275], [14, 280]];

/** Colour of a pH chart chip: universal indicator at that pH. */
export function universalAtPh(ph: number, out: Color): Color {
  const t = UNIVERSAL_HUE;
  let hue = t[t.length - 1][1];
  for (let i = 1; i < t.length; i++) {
    if (ph <= t[i][0]) {
      const [x0, y0] = t[i - 1];
      hue = y0 + ((t[i][1] - y0) * (ph - x0)) / (t[i][0] - x0);
      break;
    }
  }
  return universalColour(hue, out);
}

/** Red cabbage's three colour families (engine indicator.category 0, 1, 2), as the prediction names them. */
export const CABBAGE_FAMILIES = [
  { name: "Pink or red", kind: "acid", colour: P.flame[400] },
  { name: "Purple", kind: "neutral", colour: P.grape[500] },
  { name: "Green or blue", kind: "base", colour: P.volt[500] },
] as const;

/** The colour's name, so a reading never relies on colour alone (CLAUDE.md §2). */
export function cabbageName(hue: number): string {
  if (hue >= 340) return "red";
  if (hue >= 300) return "pink";
  if (hue >= 250) return "purple";
  if (hue >= 190) return "blue";
  return hue >= 100 ? "green" : "yellow";
}

export function universalName(hue: number): string {
  if (hue < 15) return "red";
  if (hue < 40) return "orange";
  if (hue < 70) return "yellow";
  if (hue < 150) return "green";
  if (hue < 230) return "blue";
  return "violet";
}
