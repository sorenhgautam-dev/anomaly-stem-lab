"use client";

import { useMemo } from "react";
import { CapsuleGeometry, Color, CylinderGeometry, MeshStandardMaterial, PlaneGeometry, TorusGeometry, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { canvasTexture, latheGeometry, mergeParts } from "../../kit/detail";
import { kitMaterial } from "../../kit/materials";
import { BENCH } from "./bench-size";

/*
 * Robotics' set (DESIGN.md §8 "a pegboard and tool rack"): a graphite
 * pegboard riser on two white posts along the back of the worktop, with a
 * steel tool rail across its top. Screwdrivers with gold handles and a pair
 * of pliers hang on the left, wire spools on a dowel sit on the right, and
 * the middle stays clear behind the apparatus. Merged by material: six draw
 * calls in all.
 */

const Z = BENCH.back + 0.1;
const W = 4.8;
const H = 1.25;
const Y = 0.08 + H / 2;
/** The tool rail's height, low enough that what hangs from it stays in the lab's shots. */
const RAIL = 0.66;
/** The spools' dowel, low on the board. */
const SPOOL = 0.25;

/** The pegboard's face: a grid of holes, each with a faint lit lip below it. */
function pegboardMaterial(): MeshStandardMaterial {
  const map = canvasTexture("pegboard", 1024, 256, (ctx, w, h) => {
    ctx.fillStyle = LAB.robotics.wall;
    ctx.fillRect(0, 0, w, h);
    const lip = `#${new Color(LAB.robotics.wall).lerp(new Color(LAB.robotics.bench), 0.07).getHexString()}`;
    const step = 256 / 12;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        ctx.fillStyle = lip;
        ctx.beginPath();
        ctx.arc(x, y + 1.2, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = LAB.robotics.deep;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  return new MeshStandardMaterial({ map, roughness: 0.72 });
}

/** A screwdriver hanging tip-down: a lathed handle and a steel shaft. */
function screwdriver(x: number, top: number, length: number) {
  const handle = latheGeometry([[0, 0], [0.016, 0], [0.022, 0.02], [0.024, 0.1], [0.02, 0.13], [0.012, 0.14], [0, 0.142]], 20).rotateX(Math.PI).translate(x, top, Z + 0.06);
  const shaft = new CylinderGeometry(0.006, 0.006, length, 10).translate(x, top - 0.142 - length / 2, Z + 0.06);
  return { handle, shaft };
}

function setShapes() {
  const white: BufferGeometry[] = [];
  const steel: BufferGeometry[] = [];
  const gold: BufferGeometry[] = [];
  const teal: BufferGeometry[] = [];
  for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) white.push(new RoundedBoxGeometry(0.09, H + 0.12, 0.09, 2, 0.02).translate(x, Y + 0.06, Z - 0.02));
  // The tool rail: a steel bar on two brackets, with hooks for the screwdrivers.
  steel.push(new CylinderGeometry(0.012, 0.012, W - 0.3, 12).rotateZ(Math.PI / 2).translate(0, RAIL, Z + 0.07));
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) steel.push(new RoundedBoxGeometry(0.03, 0.03, 0.08, 2, 0.008).translate(x, RAIL, Z + 0.04));
  for (const [i, x] of [-2.0, -1.84, -1.68].entries()) {
    const s = screwdriver(x, RAIL - 0.02, 0.2 + i * 0.06);
    gold.push(s.handle);
    steel.push(s.shaft);
  }
  // Pliers on a peg: two steel jaws and white grips, splayed a little.
  for (const side of [-1, 1]) {
    steel.push(new RoundedBoxGeometry(0.022, 0.11, 0.012, 2, 0.005).rotateZ(side * 0.08).translate(-1.4 + side * 0.008, RAIL - 0.12, Z + 0.06));
    white.push(new CapsuleGeometry(0.014, 0.22, 4, 10).rotateZ(side * 0.16).translate(-1.4 + side * 0.03, RAIL - 0.31, Z + 0.06));
  }
  steel.push(new CylinderGeometry(0.008, 0.008, 0.08, 8).rotateX(Math.PI / 2).translate(-1.4, RAIL - 0.06, Z + 0.04));
  // Wire spools on a dowel: white flanges, windings in teal, gold and white.
  steel.push(new CylinderGeometry(0.01, 0.01, 0.9, 10).rotateZ(Math.PI / 2).translate(1.75, SPOOL, Z + 0.1));
  const windings: [number, BufferGeometry[]][] = [
    [1.45, teal],
    [1.75, gold],
    [2.05, white],
  ];
  for (const [x, into] of windings) {
    for (const dx of [-0.1, 0.1]) white.push(new CylinderGeometry(0.11, 0.11, 0.014, 28).rotateZ(Math.PI / 2).translate(x + dx, SPOOL, Z + 0.1));
    into.push(new CylinderGeometry(0.085, 0.085, 0.186, 28, 1, true).rotateZ(Math.PI / 2).translate(x, SPOOL, Z + 0.1));
    into.push(new TorusGeometry(0.086, 0.006, 6, 28).rotateY(Math.PI / 2).translate(x - 0.06, SPOOL, Z + 0.1));
  }
  return {
    board: new RoundedBoxGeometry(W, H, 0.05, 2, 0.015).translate(0, Y, Z),
    face: new PlaneGeometry(W - 0.04, H - 0.04).translate(0, Y, Z + 0.026),
    white: mergeParts(white),
    steel: mergeParts(steel),
    gold: mergeParts(gold),
    teal: mergeParts(teal),
  };
}

let shapes: ReturnType<typeof setShapes> | null = null;
let face: MeshStandardMaterial | null = null;

export function RoboticsSet() {
  const tier = useQuality((s) => s.level);
  const g = useMemo(() => (shapes ??= setShapes()), []);
  face ??= pegboardMaterial();
  return (
    <group>
      <mesh geometry={g.board} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
      <mesh geometry={g.face} material={face} />
      <mesh geometry={g.white} material={kitMaterial("matte", tier, LAB.robotics.bench)} />
      <mesh geometry={g.steel} material={kitMaterial("steel", tier)} />
      <mesh geometry={g.gold} material={kitMaterial("gold", tier)} />
      <mesh geometry={g.teal} material={kitMaterial("teal", tier)} />
    </group>
  );
}
