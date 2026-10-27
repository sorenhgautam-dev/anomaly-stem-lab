import { Vector3, type Camera, type Texture } from "three";
import type { Quality } from "@/lib/quality";
import { pointer } from "@/components/three/pointer";
import { AnoBody } from "./body";
import { clamp, easeInOutBack, pulse, Spring } from "./spring";
import type { AnoExpression, AnoMove, AnoPose } from "./types";

/*
 * Ano's brain: moves the body (body.ts) every frame (DESIGN.md §6). Idle:
 * float, breathe, sway, blink, look at the cursor. Moves: wave, nod,
 * surprised hop, spin, a shrug, and a boop when you click near.
 * Everything runs on springs; nothing here touches React state.
 */

export interface RigInput {
  expression: AnoExpression;
  speaking: boolean;
  pose: AnoPose;
  look: "cursor" | "camera";
  /** The view's rectangle on screen, for aiming at the cursor. */
  rect: DOMRect | null;
}

const MOVE_LENGTH: Record<AnoMove, number> = { wave: 2.4, nod: 1.1, hop: 1.05, spin: 1.5, boop: 0.55, shrug: 1.7 };
/** The face a move puts on while it plays. */
const MOVE_FACE: Partial<Record<AnoMove, AnoExpression>> = { wave: "happy", hop: "surprised", spin: "celebrating", boop: "happy", shrug: "thinking" };
const BOOP_RADIUS = 260;

const v = new Vector3();

export class AnoRig {
  private b: AnoBody;
  private t = 0;
  private move: AnoMove | null = null;
  private moveAt = 0;
  private lastDown = -1;
  private nextBlink = 1.6;
  private blinkAt = -10;
  private shownFace: AnoExpression = "happy";
  private s = {
    scale: new Spring(0, 90, 11),
    y: new Spring(0),
    squash: new Spring(1, 260, 16),
    roll: new Spring(0),
    yaw: new Spring(0, 60, 12),
    headYaw: new Spring(0, 90, 13),
    headPitch: new Spring(0, 110, 13),
    headRoll: new Spring(0),
    armR: new Spring(0.16),
    foreR: new Spring(0),
    armL: new Spring(0.16),
    foreL: new Spring(0),
    antenna: new Spring(0, 70, 4),
    lookX: new Spring(0, 60, 15),
    lookY: new Spring(0, 60, 15),
  };

  constructor(tier: Quality) {
    this.b = new AnoBody(tier);
  }

  get root() {
    return this.b.root;
  }

  play(move: AnoMove): void {
    this.move = move;
    this.moveAt = this.t;
  }

  setTier(tier: Quality): void {
    this.b.setTier(tier);
  }

  setVisorEnvironment(env: Texture): void {
    this.b.setVisorEnvironment(env);
  }

  dispose(): void {
    this.b.dispose();
  }

  update(dt: number, camera: Camera, input: RigInput, reduced: boolean): void {
    this.t += dt;
    const t = this.t;
    const s = this.s;
    const a = t - this.moveAt;
    if (this.move && a > MOVE_LENGTH[this.move]) this.move = null;

    // Where Ano's head is on screen, for the cursor and for boops.
    this.b.head.getWorldPosition(v).project(camera);
    const r = input.rect;
    const hx = r ? r.left + ((v.x + 1) / 2) * r.width : 0;
    const hy = r ? r.top + ((1 - v.y) / 2) * r.height : 0;
    if (pointer.down.at > this.lastDown) {
      this.lastDown = pointer.down.at;
      if (r && !this.move && Math.hypot(pointer.down.x - hx, pointer.down.y - hy) < BOOP_RADIUS) this.play("boop");
    }
    let lookX = 0;
    let lookY = 0;
    if (r && input.look === "cursor" && pointer.active) {
      lookX = clamp((pointer.x - hx) / Math.max(360, r.width * 0.8), -1, 1);
      lookY = clamp((pointer.y - hy) / Math.max(320, r.height * 0.8), -1, 1);
    }

    // Idle targets, then the move on top.
    const calm = reduced ? 0 : 1;
    let y = Math.sin(t * 1.5) * 0.05 * calm;
    let squash = 1 + Math.sin(t * 1.5 + 1.2) * 0.012 * calm;
    let roll = Math.sin(t * 0.8) * 0.035 * calm;
    let yaw = 0;
    const headYaw = lookX * 0.35;
    let headPitch = lookY * 0.28;
    let headRoll = -lookX * 0.06;
    let armR = 0.16 + Math.sin(t * 1.25) * 0.04 * calm;
    let armL = 0.16 + Math.sin(t * 1.25 + 1) * 0.04 * calm;
    let foreR = 0;
    let foreL = 0;
    if (input.pose === "peek") {
      roll = -0.3;
      headRoll += 0.22;
      armR = 2.3 + Math.sin(t * 2.2) * 0.12 * calm;
      foreR = 0.5 + Math.sin(t * 6) * 0.35 * calm;
    }
    switch (this.move) {
      case "wave":
        armR = 2.65;
        foreR = 0.35 + Math.sin(a * 11) * 0.5 * (a < MOVE_LENGTH.wave - 0.3 ? 1 : 0);
        headRoll += 0.14;
        break;
      case "nod":
        headPitch += Math.sin((a / 0.55) * Math.PI * 2) * 0.3 * (1 - a / MOVE_LENGTH.nod);
        break;
      case "hop": {
        const air = clamp((a - 0.14) / 0.5, 0, 1);
        y += a < 0.14 ? -0.06 : Math.sin(air * Math.PI) * 0.4;
        squash = a < 0.14 ? 0.86 : air < 1 ? 1.08 : 0.92;
        armR = armL = a > 0.1 && air < 1 ? 2.3 : 0.4;
        foreR = foreL = 0.2;
        break;
      }
      case "spin":
        yaw = easeInOutBack(clamp(a / (MOVE_LENGTH.spin - 0.2), 0, 1)) * Math.PI * 2;
        armR = armL = 1.35;
        squash += pulse(a, MOVE_LENGTH.spin) * 0.04;
        break;
      case "shrug": {
        // Arms out, forearms and palms up, head tipped, a little lift: "no idea".
        const k = pulse(a, MOVE_LENGTH.shrug);
        armR = armL = 0.16 + 0.95 * k;
        foreR = foreL = -1.25 * k;
        headRoll += 0.26 * k;
        headPitch -= 0.08 * k;
        y += 0.05 * k;
        squash += 0.03 * k;
        break;
      }
      case "boop":
        squash = a < 0.12 ? 0.9 : 1;
        headPitch -= 0.12 * pulse(a, 0.4);
        break;
    }

    s.scale.step(1, dt);
    this.b.root.position.y = s.y.step(y, dt);
    const sq = s.squash.step(squash, dt);
    const sc = Math.max(0.001, s.scale.x);
    this.b.root.scale.set(sc / Math.sqrt(sq), sc * sq, sc / Math.sqrt(sq));
    // A spin is a full turn: set it directly so the spring can't take the short way.
    this.b.root.rotation.y = this.move === "spin" ? yaw : s.yaw.step(0, dt);
    if (this.move === "spin") s.yaw.x = 0;
    this.b.body.rotation.z = s.roll.step(roll, dt);
    this.b.head.rotation.set(s.headPitch.step(headPitch, dt), s.headYaw.step(headYaw, dt), s.headRoll.step(headRoll, dt));
    this.b.armR.upper.rotation.set(-0.08, 0, s.armR.step(armR, dt));
    this.b.armR.lower.rotation.set(-0.28, 0, s.foreR.step(foreR, dt));
    this.b.armL.upper.rotation.set(-0.08, 0, s.armL.step(armL, dt));
    this.b.armL.lower.rotation.set(-0.28, 0, s.foreL.step(foreL, dt));
    // The antenna lags behind the head, like a spring on a stalk.
    s.antenna.v -= (s.headYaw.v * 0.6 + s.y.v * 1.4) * dt * 6;
    this.b.antenna.rotation.z = s.antenna.step(0, dt);
    // The floor shadow shrinks and fades as Ano rises.
    const lift = this.b.root.position.y;
    this.b.shadow.scale.setScalar(clamp(1 - lift * 0.55, 0.55, 1.1));
    this.b.shadow.position.y = -lift / Math.max(0.001, this.b.root.scale.y);

    // The face: move expression, blinks (and one on every change), eyes, talk bars.
    const wanted = (this.move && MOVE_FACE[this.move]) || input.expression;
    if (wanted !== this.shownFace) {
      this.shownFace = wanted;
      this.blinkAt = t;
    }
    if (t > this.nextBlink) {
      this.blinkAt = t;
      this.nextBlink = t + 2.4 + Math.random() * 3.2;
    }
    this.b.face.draw({
      expression: this.shownFace,
      blink: pulse(t - this.blinkAt, 0.16),
      lookX: s.lookX.step(lookX, dt),
      lookY: s.lookY.step(lookY, dt),
      talk: input.speaking ? [0, 1, 2, 3, 4].map((i) => 0.5 + 0.5 * Math.sin(t * 15 + i * 1.9) * Math.sin(t * 4.3 + i)) : null,
    });
  }
}
