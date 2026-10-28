import { CanvasTexture, Color, LinearFilter, SRGBColorSpace, Sprite, SpriteMaterial } from "three";
import type { LabId } from "@/engine/types";
import { LAB, PALETTE as P } from "@/lib/tokens";

/*
 * Readouts that float in the scene (DESIGN.md §7.5, §8.1): small glass labels
 * in Martian Mono, drawn on a canvas and shown as a camera-facing sprite. They
 * redraw only when the text changes, so a scale can count up every frame
 * cheaply. Three looks: "glass" (white label), "ghost" (a dashed label in
 * the lab's teal: the student's prediction) and "screen" (an instrument's
 * dark LCD with sand-gold digits; only Chemistry's instruments have one).
 */

export type BoardStyle = "glass" | "ghost" | "screen";

const ROBO_TEAL_TEXT = `#${new Color(LAB.robotics.teal).lerp(new Color(LAB.robotics.deep), 0.4).getHexString()}`;

type Look = { bg: string; fg: string; border: string | null; dashed: boolean };

/** Each look; the ghost takes its lab's teal (Chemistry's deep wall teal, Robotics' bright current teal). */
function look(style: BoardStyle, lab: LabId): Look {
  if (style === "glass") return { bg: "rgba(255,255,255,0.92)", fg: P.ink[900], border: "rgba(18,18,18,0.08)", dashed: false };
  if (style === "screen") return { bg: "#1c1a18", fg: LAB.chemistry.gold, border: null, dashed: false };
  if (lab === "chemistry") return { bg: "rgba(255,251,246,0.94)", fg: LAB.chemistry.wall, border: LAB.chemistry.wall, dashed: true };
  // Robotics' bright teal is too light for text on a cream card (2.8:1): the text takes a deeper shade of it (6:1).
  return { bg: "rgba(255,251,246,0.94)", fg: ROBO_TEAL_TEXT, border: LAB.robotics.teal, dashed: true };
}

const PX = 4; // canvas pixels per CSS-ish unit, for crisp text

/** Labels are drawn half as big again on phones, where the camera sits farther back and they'd shrink below reading size. */
const labelZoom = () => (window.innerWidth < 640 ? 1.5 : 1);

export class TextBoard {
  readonly sprite: Sprite;
  private canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  private texture: CanvasTexture;
  private text = "";
  private lines: string[] = [];

  /** `height` is the label's height in world units; the width follows the text. */
  constructor(
    private style: BoardStyle,
    private height = 0.16,
    private fontSize = 26,
    private lab: LabId = "chemistry",
  ) {
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;
    this.sprite = new Sprite(new SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false }));
    this.sprite.renderOrder = 10;
    // Fonts load after first paint: redraw once Martian Mono is ready.
    void document.fonts?.load(`500 ${fontSize * PX}px "Martian Mono"`).then(() => this.draw());
  }

  /** Change the text (one or more lines); redraws only if it changed. */
  set(text: string): void {
    if (text === this.text) return;
    this.text = text;
    this.lines = text.split("\n");
    this.draw();
  }

  setStyle(style: BoardStyle): void {
    if (style === this.style) return;
    this.style = style;
    this.draw();
  }

  private draw() {
    const s = look(this.style, this.lab);
    const fs = this.fontSize * PX;
    const ctx = this.ctx;
    ctx.font = `500 semi-condensed ${fs}px "Martian Mono", ui-monospace, monospace`;
    const w = Math.max(...this.lines.map((l) => ctx.measureText(l).width), fs) + fs * 1.1;
    const h = this.lines.length * fs * 1.25 + fs * 0.75;
    // A canvas that changes size can't be re-uploaded into the old texture
    // (WebGL keeps the first upload's size), so it gets a fresh texture.
    const cw = Math.ceil(w);
    const ch = Math.ceil(h);
    if (cw !== this.canvas.width || ch !== this.canvas.height) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.texture.dispose();
      this.texture = new CanvasTexture(this.canvas);
      this.texture.colorSpace = SRGBColorSpace;
      this.texture.minFilter = LinearFilter;
      (this.sprite.material as SpriteMaterial).map = this.texture;
    }
    ctx.font = `500 semi-condensed ${fs}px "Martian Mono", ui-monospace, monospace`;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = s.bg;
    ctx.beginPath();
    ctx.roundRect(PX, PX, w - PX * 2, h - PX * 2, Math.min(h / 2, fs * 0.7));
    ctx.fill();
    if (s.border) {
      ctx.strokeStyle = s.border;
      ctx.lineWidth = PX * 1.5;
      ctx.setLineDash(s.dashed ? [PX * 5, PX * 4] : []);
      ctx.stroke();
    }
    ctx.fillStyle = s.fg;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    this.lines.forEach((l, i) => ctx.fillText(l, w / 2, fs * 0.75 + fs * 0.62 + i * fs * 1.25 - fs * 0.25));
    this.texture.needsUpdate = true;
    const unit = (this.height * labelZoom()) / (fs * 1.25 + fs * 0.75);
    this.sprite.scale.set(w * unit, h * unit, 1);
  }

  /** Fade the label (0–1). */
  setOpacity(opacity: number): void {
    (this.sprite.material as SpriteMaterial).opacity = opacity;
  }

  dispose(): void {
    this.texture.dispose();
    (this.sprite.material as SpriteMaterial).dispose();
  }
}
