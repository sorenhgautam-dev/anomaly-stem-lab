"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, CylinderGeometry, SRGBColorSpace, Vector3, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { canvasTexture, decalMaterial, SANS } from "../detail";
import { kitMaterial } from "../materials";
import { TextBoard } from "../TextBoard";

/*
 * A digital lab balance (DESIGN.md §8, §8.2), proportioned like a real
 * 0.01 g balance: a bevelled white body on four rubber feet, a brushed
 * stainless pan floating on a short pedestal, and a black display bezel on
 * the front with the LCD (sand-gold digits in Martian Mono) and two printed
 * buttons. After a wrong run a dashed ghost label floats in front of it,
 * under the display, with the student's predicted reading.
 */

class Lcd {
  readonly canvas = document.createElement("canvas");
  readonly texture: CanvasTexture;
  private last = "";
  constructor() {
    // Twice the screen's printed size, so the digits stay crisp when the camera looks at it on a slant.
    this.canvas.width = 768;
    this.canvas.height = 240;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = 8;
    void document.fonts?.load('500 72px "Martian Mono"').then(() => this.draw(this.last, true));
  }
  draw(text: string, force = false) {
    if (text === this.last && !force) return;
    this.last = text;
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = "#14191a";
    ctx.fillRect(0, 0, 768, 240);
    ctx.fillStyle = LAB.chemistry.gold;
    ctx.font = '600 semi-condensed 132px "Martian Mono", ui-monospace, monospace';
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 640, 126);
    // The unit sits on the digits' baseline, big enough to read as a "g" and not a stray dot.
    ctx.font = '600 semi-condensed 84px "Martian Mono", ui-monospace, monospace';
    ctx.textAlign = "left";
    ctx.fillText("g", 662, 140);
    this.texture.needsUpdate = true;
  }
}

export function Scale3D({ reading, ghost, position = [0, 0, 0], width = 1.3 }: { reading: () => number; ghost: number | null; position?: [number, number, number]; width?: number }) {
  const tier = useQuality((s) => s.level);
  const lcd = useMemo(() => new Lcd(), []);
  const ghostLabel = useMemo(() => new TextBoard("ghost", 0.11, 24), []);
  const screen = useRef<Mesh>(null);
  useEffect(() => {
    if (ghost !== null) ghostLabel.set(`Your idea: ${ghost.toFixed(2)} g`);
  }, [ghost, ghostLabel]);
  useEffect(
    () => () => {
      lcd.texture.dispose();
      ghostLabel.dispose();
    },
    [lcd, ghostLabel],
  );
  useFrame(() => lcd.draw(reading().toFixed(2)));
  const d = width * 0.78;
  const foot = width * 0.36;
  return (
    <group position={position}>
      {/* Body: a bevelled block on rubber feet, the top stepped down to the pan. */}
      <RoundedBox args={[width, 0.15, d]} radius={0.05} smoothness={6} bevelSegments={6} position={[0, 0.09, 0]} material={kitMaterial("plastic", tier)} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * foot, 0.01, sz * d * 0.36]} material={kitMaterial("rubber", tier)} geometry={FOOT} />))}
      {/* The pan floats on a pedestal, so it reads as a separate weighing plate. */}
      <mesh position={[0, 0.172, -0.02]} material={kitMaterial("steel", tier)} geometry={PEDESTAL} />
      <RoundedBox args={[width * 0.8, 0.026, d * 0.74]} radius={0.012} smoothness={4} position={[0, 0.187, -0.03]} material={kitMaterial("steel", tier)} />
      {/* Front: a black bezel with the LCD and two printed buttons. */}
      <RoundedBox args={[width * 0.66, 0.1, 0.03]} radius={0.012} smoothness={4} position={[-width * 0.07, 0.09, d / 2]} material={kitMaterial("black", tier)} />
      <mesh ref={screen} position={[-width * 0.12, 0.09, d / 2 + 0.0162]}>
        <planeGeometry args={[width * 0.36, 0.068]} />
        <meshBasicMaterial map={lcd.texture} toneMapped={false} />
      </mesh>
      {[0, 1].map((i) => (
        <group key={i} position={[width * (0.1 + i * 0.08), 0.09, d / 2 + 0.016]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("plastic", tier)} geometry={BUTTON} />
          <mesh position={[0, 0, 0.0085]} material={decalMaterial(`scale-key-${i}`, buttonLabel(i ? "TARE" : "ON"))}>
            <planeGeometry args={[0.05, 0.025]} />
          </mesh>
        </group>
      ))}
      {/* In front of the balance, under its display, not over what's weighed on it. */}
      {ghost !== null && <primitive object={ghostLabel.sprite} position={ghostOffset(width)} />}
    </group>
  );
}

/** Where the ghost label floats, from the balance's centre: low on the bench just in front of it, under the display. */
const ghostOffset = (width: number): [number, number, number] => [0, 0.1, (width * 0.78) / 2 + 0.42];

/** Where a balance at `position` shows its ghost label (for a stage's "ghost" anchor, so the prediction's label floats in the same spot). */
export function scaleGhostAt(position: [number, number, number], width = 1.3): Vector3 {
  const o = ghostOffset(width);
  return new Vector3(position[0] + o[0], position[1] + o[1], position[2] + o[2]);
}

const FOOT = new CylinderGeometry(0.04, 0.045, 0.02, 20);
const PEDESTAL = new CylinderGeometry(0.06, 0.07, 0.03, 24);
const BUTTON = new CylinderGeometry(0.022, 0.022, 0.012, 24);

function buttonLabel(text: string) {
  return canvasTexture(`scale-key-${text}`, 128, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#3a3631";
    ctx.font = `700 26px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2);
  });
}
