import { CanvasTexture, SRGBColorSpace } from "three";
import { LAB, PALETTE as P } from "@/lib/tokens";

/*
 * An instrument LCD drawn on a canvas (DESIGN.md §8 "small screens in
 * Martian Mono"): gold digits on near-black (Robotics' gold), a big
 * right-aligned number and a small unit. The canvas never changes size and
 * redraws only when the text does.
 */

export class Lcd {
  readonly texture: CanvasTexture;
  private canvas = document.createElement("canvas");
  private last = "";
  constructor(private unit: string) {
    this.canvas.width = 384;
    this.canvas.height = 128;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.draw("", true);
    void document.fonts?.load('500 72px "Martian Mono"').then(() => this.draw(this.last, true));
  }
  draw(text: string, force = false): void {
    if (text === this.last && !force) return;
    this.last = text;
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = P.ink[900];
    ctx.fillRect(0, 0, 384, 128);
    ctx.fillStyle = LAB.robotics.gold;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.font = '500 semi-condensed 76px "Martian Mono", ui-monospace, monospace';
    ctx.fillText(text, 300, 68);
    ctx.font = '500 semi-condensed 34px "Martian Mono", ui-monospace, monospace';
    ctx.fillText(this.unit, 366, 80);
    this.texture.needsUpdate = true;
  }
  dispose(): void {
    this.texture.dispose();
  }
}
