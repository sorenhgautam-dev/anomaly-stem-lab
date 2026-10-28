import { CanvasTexture, LinearFilter, SRGBColorSpace, Sprite, SpriteMaterial } from "three";
import type { TimelineFrame } from "@/engine/types";
import { sample } from "@/components/lab/playback";
import { LAB, PALETTE as P } from "@/lib/tokens";

/*
 * A live graph floating above the bench (DESIGN.md §8.1 "live 3D graphs
 * floating above the bench"): a white glass card drawn on a canvas and shown
 * as a camera-facing sprite. The real curve draws itself as the run plays;
 * a shaded sage band marks where `bandKey` is between 0 and 1 (ice melting),
 * and after a wrong run the student's guess is a dashed line in the lab's
 * teal beside it. The real curve is ink, its moving end a sand-gold dot.
 * The y-axis fits the run's data (both curves, with a little padding) so the
 * gap between the guess and what really happened is easy to see; before a
 * run it shows the spec's range. It redraws only when the time or the curves
 * change.
 */

const W = 640;
const H = 400;
const L = 86;
const R = 30;
const T = 66;
const B = 62;
const FONT = '"Martian Mono", ui-monospace, monospace';

export interface ChartSpec {
  title: string;
  yKey: string;
  /** The range and ticks before a run; once there's data the axis fits it. */
  yMin: number;
  yMax: number;
  yTicks: number[];
  /** Highlight the y = this line (e.g. 0 °C). */
  mark: number;
  /** Real-time value for x tick labels, and the step between ticks. */
  clockKey: string;
  clockStep: number;
  bandKey: string;
  bandLabel: string;
  ghostLabel: string;
}

/** A tidy tick step (1, 2 or 5 times a power of ten) giving about four to six ticks over `span`. */
function niceStep(span: number): number {
  const rough = span / 5;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const m = rough / pow;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
}

/** The y range for a run: both curves' full extent, padded by a tenth, snapped out to tidy ticks. */
function fitRange(spec: ChartSpec, real: TimelineFrame[] | null, ghost: TimelineFrame[] | null) {
  const values = [real, ghost].flatMap((s) => (s ?? []).map((f) => f.values[spec.yKey]).filter((v): v is number => typeof v === "number"));
  if (values.length === 0) return { min: spec.yMin, max: spec.yMax, ticks: spec.yTicks };
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.1, 0.5);
  lo -= pad;
  hi += pad;
  const step = niceStep(hi - lo);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { min, max, ticks };
}

export class ChartBoard {
  readonly sprite: Sprite;
  private canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  private texture: CanvasTexture;
  private real: TimelineFrame[] | null = null;
  private ghost: TimelineFrame[] | null = null;
  private t = -1;
  private now = NaN;
  /** The y range in use: the spec's before a run, fitted to the curves after. */
  private range = { min: 0, max: 1, ticks: [] as number[] };

  constructor(
    private spec: ChartSpec,
    height: number,
  ) {
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;
    this.sprite = new Sprite(new SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false }));
    this.sprite.renderOrder = 9;
    this.sprite.scale.set((height * W) / H, height, 1);
    this.range = { min: spec.yMin, max: spec.yMax, ticks: spec.yTicks };
    void document.fonts?.load(`500 24px "Martian Mono"`).then(() => this.draw());
  }

  /** Call each frame; redraws only when something visible changed. */
  update(real: TimelineFrame[] | null, ghost: TimelineFrame[] | null, t: number, now: number): void {
    if (real === this.real && ghost === this.ghost && Math.abs(t - this.t) < 1 / 30 && Math.abs(now - this.now) < 0.05) return;
    if (real !== this.real || ghost !== this.ghost) this.range = fitRange(this.spec, real, ghost);
    this.real = real;
    this.ghost = ghost;
    this.t = t;
    this.now = now;
    this.draw();
  }

  private x(t: number) {
    return L + (Math.max(0, Math.min(10, t)) / 10) * (W - L - R);
  }

  private y(v: number) {
    const { min: yMin, max: yMax } = this.range;
    return H - B - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * (H - T - B);
  }

  private line(frames: TimelineFrame[], color: string, width: number, dashed: boolean) {
    const ctx = this.ctx;
    const k = this.spec.yKey;
    ctx.beginPath();
    ctx.moveTo(this.x(0), this.y(frames[0].values[k] ?? 0));
    for (const f of frames) {
      if (f.t > this.t) break;
      ctx.lineTo(this.x(f.t), this.y(f.values[k] ?? 0));
    }
    const end = sample(frames, this.t)[k] ?? 0;
    ctx.lineTo(this.x(this.t), this.y(end));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash(dashed ? [14, 12] : []);
    ctx.stroke();
    ctx.setLineDash([]);
    return end;
  }

  private draw() {
    const ctx = this.ctx;
    const s = this.spec;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.beginPath();
    ctx.roundRect(4, 4, W - 8, H - 8, 34);
    ctx.fill();
    ctx.strokeStyle = "rgba(18,18,18,0.08)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = P.ink[900];
    ctx.font = `500 semi-condensed 26px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(s.title, 30, 38);
    // Grid and y ticks; the marked line (0 °C) is stronger.
    ctx.font = `500 semi-condensed 20px ${FONT}`;
    ctx.textAlign = "right";
    for (const v of this.range.ticks) {
      const y = this.y(v);
      ctx.strokeStyle = v === s.mark ? "rgba(18,18,18,0.32)" : "rgba(18,18,18,0.08)";
      ctx.lineWidth = v === s.mark ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(L, y);
      ctx.lineTo(W - R, y);
      ctx.stroke();
      ctx.fillStyle = v === s.mark ? P.ink[900] : P.ink[500];
      ctx.fillText(String(v), L - 12, y);
    }
    const real = this.real;
    // x ticks in real seconds (the run is a time-lapse).
    ctx.textAlign = "center";
    ctx.fillStyle = P.ink[500];
    const clockMax = real ? (real[real.length - 1].values[s.clockKey] ?? 0) : 0;
    if (clockMax > 0) for (let c = 0; c <= clockMax + 1e-6; c += s.clockStep) ctx.fillText(`${c} s`, this.x((c / clockMax) * 10), H - B + 28);
    if (!real) {
      ctx.fillText("time →", (L + W - R) / 2, H - B + 28);
      this.dot(0, this.now, LAB.chemistry.gold);
      return;
    }
    // The band where the ice is melting, revealed as time reaches it.
    const startAt = real.find((f) => (f.values[s.bandKey] ?? 1) < 0.999)?.t ?? null;
    if (startAt !== null && this.t > startAt) {
      const endAt = real.find((f) => (f.values[s.bandKey] ?? 1) <= 0.001)?.t ?? 10;
      const x0 = this.x(startAt);
      const x1 = this.x(Math.min(this.t, endAt));
      ctx.fillStyle = `${LAB.chemistry.sage}66`;
      ctx.fillRect(x0, T, x1 - x0, H - T - B);
      if (x1 - x0 > 120) {
        ctx.fillStyle = P.ink[700];
        ctx.fillText(s.bandLabel, (x0 + x1) / 2, T + 18);
      }
    }
    if (this.ghost) {
      const g = this.line(this.ghost, LAB.chemistry.wall, 5, true);
      ctx.fillStyle = LAB.chemistry.wall;
      ctx.textAlign = "right";
      ctx.fillText(s.ghostLabel, Math.max(L + 150, this.x(this.t) - 14), this.y(g) - 22);
    }
    const end = this.line(real, P.ink[900], 7, false);
    this.dot(this.t, end, LAB.chemistry.gold);
  }

  private dot(t: number, v: number, color: string) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(this.x(t), this.y(v), 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = P.ink[900];
    ctx.lineWidth = 4;
    ctx.stroke();
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    (this.sprite.material as SpriteMaterial).dispose();
  }
}
