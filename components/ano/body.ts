import { Group, Mesh, type Material, type MeshStandardMaterial, type Texture } from "three";
import type { Quality } from "@/lib/quality";
import { Face } from "./face";
import { anoGeometry, anoMaterials, ANTENNA_Y, ELBOW_Y, HEAD_Y, SHOULDER, visorMaterial } from "./parts";

/*
 * Ano's object tree (DESIGN.md §6), built once per Ano from the shared parts:
 * body and belt, a head that pivots at the neck (shell, visor, ears and a
 * springy antenna), two jointed arms and a floor shadow. AnoRig moves it.
 */

const NECK_Y = HEAD_Y - 0.36;

function mesh(geometry: Mesh["geometry"], material: Material, parent: Group): Mesh {
  const m = new Mesh(geometry, material);
  parent.add(m);
  return m;
}

function arm(parent: Group, side: 1 | -1, white: Material, orange: Material) {
  const g = anoGeometry();
  const mirror = new Group();
  mirror.scale.x = side;
  parent.add(mirror);
  const upper = new Group();
  upper.position.set(...SHOULDER);
  mirror.add(upper);
  const lower = new Group();
  lower.position.y = ELBOW_Y;
  upper.add(lower);
  return { upper, lower, meshes: [mesh(g.upperWhite, white, upper), mesh(g.upperOrange, orange, upper), mesh(g.lowerWhite, white, lower), mesh(g.lowerOrange, orange, lower)] };
}

export class AnoBody {
  readonly root = new Group();
  readonly body = new Group();
  readonly head = new Group();
  readonly antenna = new Group();
  readonly armR;
  readonly armL;
  readonly shadow: Mesh;
  readonly face = new Face();
  private whites: Mesh[] = [];
  private oranges: Mesh[] = [];
  private visor: Mesh;
  private visorMat: Material;
  private tier: Quality;
  private visorEnv: Texture | null = null;

  constructor(tier: Quality) {
    this.tier = tier;
    const g = anoGeometry();
    const m = anoMaterials(tier);
    this.visorMat = visorMaterial(tier, this.face.texture);
    this.root.add(this.body);
    this.whites.push(mesh(g.body, m.white, this.body));
    this.oranges.push(mesh(g.belt, m.orange, this.body));
    // The head pivots at the neck, so nods and tilts look natural.
    this.head.position.y = NECK_Y;
    this.body.add(this.head);
    const headInner = new Group();
    headInner.position.y = -NECK_Y;
    this.head.add(headInner);
    this.whites.push(mesh(g.headWhite, m.white, headInner));
    this.oranges.push(mesh(g.headOrange, m.orange, headInner));
    this.visor = mesh(g.visor, this.visorMat, headInner);
    this.antenna.position.y = ANTENNA_Y;
    headInner.add(this.antenna);
    this.whites.push(mesh(g.antennaStem, m.white, this.antenna));
    this.oranges.push(mesh(g.antennaBall, m.orange, this.antenna));
    this.armR = arm(this.body, 1, m.white, m.orange);
    this.armL = arm(this.body, -1, m.white, m.orange);
    for (const a of [this.armR, this.armL]) {
      this.whites.push(a.meshes[0], a.meshes[2]);
      this.oranges.push(a.meshes[1], a.meshes[3]);
    }
    this.shadow = mesh(g.shadow, m.shadow, this.root);
    this.root.scale.setScalar(0.001);
  }

  setTier(tier: Quality): void {
    if (tier === this.tier) return;
    this.tier = tier;
    const m = anoMaterials(tier);
    for (const w of this.whites) w.material = m.white;
    for (const o of this.oranges) o.material = m.orange;
    this.shadow.material = m.shadow;
    this.visorMat.dispose();
    this.visorMat = visorMaterial(tier, this.face.texture);
    this.visor.material = this.visorMat;
    if (this.visorEnv) this.setVisorEnvironment(this.visorEnv);
  }

  /**
   * The visor reflects the studio more softly than the body, so its own
   * reflections never read as extra features on the face.
   */
  setVisorEnvironment(env: Texture): void {
    this.visorEnv = env;
    const m = this.visorMat as MeshStandardMaterial;
    m.envMap = env;
    m.envMapIntensity = 0.3;
    m.needsUpdate = true;
  }

  dispose(): void {
    this.face.dispose();
    this.visorMat.dispose();
  }
}
