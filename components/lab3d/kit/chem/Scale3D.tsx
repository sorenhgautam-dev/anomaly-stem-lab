"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, SRGBColorSpace, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import { TextBoard } from "../TextBoard";

/*
 * A toy digital scale (DESIGN.md §8 "toy-like rounded instruments with small
 * screens in Geist Mono"): a rounded white body, a brushed platform and a
 * warm LCD on the front that counts with the reading. After a wrong run a
 * dashed ghost label floats above it with the student's predicted reading.
 */

class Lcd {
  readonly canvas = document.createElement("canvas");
  readonly texture: CanvasTexture;
  private last = "";
  constructor() {
    this.canvas.width = 384;
    this.canvas.height = 120;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    void document.fonts?.load('500 72px "Geist Mono"').then(() => this.draw(this.last, true));
  }
  draw(text: string, force = false) {
    if (text === this.last && !force) return;
    this.last = text;
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = "#1c1a18";
    ctx.fillRect(0, 0, 384, 120);
    ctx.fillStyle = P.apricot[300];
    ctx.font = '500 72px "Geist Mono", ui-monospace, monospace';
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 340, 64);
    ctx.font = '500 34px "Geist Mono", ui-monospace, monospace';
    ctx.fillText("g", 372, 76);
    this.texture.needsUpdate = true;
  }
}

export function Scale3D({ reading, ghost, position = [0, 0, 0], width = 1.3 }: { reading: () => number; ghost: number | null; position?: [number, number, number]; width?: number }) {
  const tier = useQuality((s) => s.level);
  const lcd = useMemo(() => new Lcd(), []);
  const ghostLabel = useMemo(() => new TextBoard("ghost", 0.13, 24), []);
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
  return (
    <group position={position}>
      <RoundedBox args={[width, 0.16, d]} radius={0.06} smoothness={3} position={[0, 0.08, 0]} material={kitMaterial("plastic", tier)} />
      <RoundedBox args={[width * 0.86, 0.035, d * 0.8]} radius={0.015} position={[0, 0.18, -0.02]} material={kitMaterial("metal", tier)} />
      <mesh ref={screen} position={[0, 0.085, d / 2 + 0.002]}>
        <planeGeometry args={[width * 0.42, 0.11]} />
        <meshBasicMaterial map={lcd.texture} toneMapped={false} />
      </mesh>
      {ghost !== null && <primitive object={ghostLabel.sprite} position={[0, 0.5, d / 2]} />}
    </group>
  );
}
