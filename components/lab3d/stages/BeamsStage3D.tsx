"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CylinderGeometry, DataTexture, LinearFilter, MeshBasicMaterial, PlaneGeometry, RGBAFormat, SRGBColorSpace, Vector3, type Group, type Mesh } from "three";
import { BEAM_W, BODY, beamFired, beamKernel, beamSettings, inBody, PLANS, planBeams, TUMOUR_R, type Beam, type PlanId } from "@/engine/cancer/beams";
import { RUN_SECONDS } from "@/engine/chemistry/common";
import { useQuality } from "@/lib/quality";
import { useLab } from "@/lib/store";
import { LAB } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Cluster } from "../kit/bio/Cluster";
import { Readout } from "../kit/chem/instruments";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { kitMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Radiotherapy beams, in 3D (stage "beams", engine/cancer/beams.ts): four
 * calm body slices on trays in the Treatment Lab (a row on wide screens, a
 * 2 × 2 grid on tall ones), one per plan, each with a
 * small gold tumour of living cells in the middle and a treatment head that
 * moves round it. Every plan has the same total strength. As each beam
 * fires, a soft teal band crosses the slice and the dose builds up on the
 * slice as teal colour: brighter teal is more dose, never harm imagery. The
 * dose map is the engine's own beam model, so the colour, the readouts and
 * the verdict always agree. When the run ends the simulator's best plan gets
 * a gold ring; after a wrong guess, a dashed label shows the student's idea
 * where it differs from what really happened.
 */

/** World units per model unit (the model's body is 2 wide). */
const K = 0.2;
/** Each plan's tray (x, z): a row on wide screens; a 2 × 2 grid on tall ones, the spread plan front left. */
const ROW: Record<PlanId, [number, number]> = { one: [-0.84, 0], angles: [-0.28, 0], slide: [0.28, 0], side: [0.84, 0] };
const GRID: Record<PlanId, [number, number]> = { one: [-0.37, -0.3], slide: [0.37, -0.3], angles: [-0.37, 0.3], side: [0.37, 0.3] };
const NAME: Record<PlanId, string> = { one: "One strong beam", angles: "Spread all around", slide: "One sliding beam", side: "All from one side" };
/** Labels sit in front of their slice; the student's idea floats in front of that. */
const LABEL_Z = 0.22;
const GHOST_PLANS: readonly PlanId[] = ["angles", "side"];
const TOP = 0.055;
/** The dose map's resolution. */
const W = 88;
const H = Math.round((W * BODY.b) / BODY.a);
const HEAD_GAP = 0.07;

export function beamsShots(): StageShots {
  // High up, so each slice's dose map reads from above. The 2 × 2 grid on tall screens is half as wide as the row, so the camera comes closer.
  const k = typeof window !== "undefined" && window.innerWidth < window.innerHeight ? 0.74 : 1;
  const aim: [number, number, number] = [0, 0.04, 0.1];
  return {
    arrive: orbit(aim, 6 * k, 52, 20),
    build: orbit(aim, 3.4 * k, 48),
    predict: orbit(aim, 3.3 * k, 46, 4),
    run: orbit(aim, 3.2 * k, 50, -3),
    reveal: orbit([0, 0.06, 0.1], 3.5 * k, 46),
  };
}

/** Model (x, y) to the slice's local (x, z): the model's top is away from the viewer. */
const toLocal = (x: number, y: number): [number, number] => [x * K, -y * K];

/** One plan's dose per beam on the map's pixels, precomputed so a frame only weighs and adds them. */
function kernels(beams: Beam[]): Float32Array[] {
  return beams.map((beam) => {
    const out = new Float32Array(W * H);
    for (let j = 0; j < H; j++) {
      const y = -BODY.b + ((j + 0.5) / H) * 2 * BODY.b;
      for (let i = 0; i < W; i++) {
        const x = -BODY.a + ((i + 0.5) / W) * 2 * BODY.a;
        out[j * W + i] = inBody(x, y) ? beamKernel(beam, x, y) * beam.strength : 0;
      }
    }
    return out;
  });
}

const TEAL = [0x1f, 0xa7, 0xa0];

/** Paint the dose so far into the texture: teal, more opaque where the dose is higher. */
function paint(tex: DataTexture, ks: Float32Array[], fired: number[]): void {
  const data = tex.image.data as Uint8Array;
  for (let p = 0; p < W * H; p++) {
    let d = 0;
    for (let b = 0; b < ks.length; b++) d += ks[b][p] * fired[b];
    const a = Math.min(1, d / 1.1) ** 0.6;
    data[p * 4] = TEAL[0];
    data[p * 4 + 1] = TEAL[1];
    data[p * 4 + 2] = TEAL[2];
    data[p * 4 + 3] = Math.round(a * 235);
  }
  tex.needsUpdate = true;
}

/** How far the oval's edge is from its centre in a beam's direction (model units). */
const edgeReach = (angle: number) => 1 / Math.sqrt((Math.sin(angle) / BODY.a) ** 2 + (Math.cos(angle) / BODY.b) ** 2);

function headSpot(beam: Beam): [number, number, number] {
  const ux = Math.sin(beam.angle);
  const uy = Math.cos(beam.angle);
  // Just outside the oval along the beam's axis, past where it enters.
  const r = edgeReach(beam.angle);
  const [x, z] = toLocal(ux * r + beam.offset * uy, uy * r - beam.offset * ux);
  return [x + ux * HEAD_GAP, TOP + 0.04, z - uy * HEAD_GAP];
}

function PlanSlice({ plan, beams, at }: { plan: PlanId; beams: Beam[]; at: [number, number] }) {
  const tier = useQuality((s) => s.level);
  const sv = useStageValues();
  const ks = useMemo(() => kernels(beams), [beams]);
  const tex = useMemo(() => {
    const t = new DataTexture(new Uint8Array(W * H * 4), W, H, RGBAFormat);
    t.colorSpace = SRGBColorSpace;
    t.magFilter = LinearFilter;
    t.minFilter = LinearFilter;
    return t;
  }, []);
  const doseMat = useMemo(() => new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }), [tex]);
  const oval = useMemo(() => new CylinderGeometry(1, 1, TOP, 72), []);
  const plane = useMemo(() => new PlaneGeometry(2 * BODY.a * K, 2 * BODY.b * K), []);
  const sliding = plan === "slide";
  // One band per beam (one moving band for the sliding plan); each gets its own fading material.
  const bands = useMemo(() => (sliding ? [beams[0]] : beams), [beams, sliding]);
  const bandMats = useMemo(() => bands.map(() => new MeshBasicMaterial({ color: LAB.robotics.teal, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })), [bands]);
  // A unit-long band, stretched per beam from its head to the far edge of the slice.
  const bandGeo = useMemo(() => new PlaneGeometry(2 * BEAM_W * K, 1), []);
  const bandRefs = useRef<(Mesh | null)[]>([]);
  const head = useRef<Group>(null);
  const painted = useRef(-1);

  useEffect(
    () => () => {
      tex.dispose();
      doseMat.dispose();
      oval.dispose();
      plane.dispose();
      bandGeo.dispose();
      bandMats.forEach((m) => m.dispose());
    },
    [tex, doseMat, oval, plane, bandGeo, bandMats],
  );

  useFrame(() => {
    const running = sv.outcome !== null;
    const f = running ? Math.min(1, sv.t() / RUN_SECONDS) : 0;
    const fired = beams.map((b) => beamFired(b, f));
    // Repaint only when the dose has moved on (about 120 steps a run).
    const step = Math.round(f * 120);
    if (step !== painted.current) {
      paint(tex, ks, fired);
      painted.current = step;
    }
    let current = beams[0];
    beams.forEach((b, i) => {
      if (fired[i] > 0) current = b;
    });
    bands.forEach((b, i) => {
      const mesh = bandRefs.current[i];
      if (!mesh) return;
      const beam = sliding ? current : b;
      const k = sliding ? (f > 0 && f < 1 ? 1 : 0) : fired[i] > 0 && fired[i] < 1 ? 1 : fired[i] >= 1 ? 0.2 : 0;
      // Before the run every plan shows its beams faintly, so the plans can be compared before guessing.
      bandMats[i].opacity = running ? 0.06 + 0.3 * k : 0.1;
      const [cx, cz] = toLocal(beam.offset * Math.cos(beam.angle), -beam.offset * Math.sin(beam.angle));
      mesh.position.set(cx, TOP + 0.012 + i * 0.0004, cz);
      mesh.rotation.set(-Math.PI / 2, 0, -beam.angle);
      mesh.scale.set(1, 2 * (edgeReach(beam.angle) * K + HEAD_GAP * 0.6), 1);
    });
    const g = head.current;
    if (g) {
      const [hx, hy, hz] = headSpot(current);
      g.position.set(hx, hy, hz);
      g.rotation.set(0, -current.angle, 0);
    }
  });

  return (
    <group position={[at[0], 0, at[1]]}>
      {/* The tray, then the body slice: a soft oval seen from above. */}
      <RoundedBox args={[2 * BODY.a * K + 0.14, 0.02, 2 * BODY.b * K + 0.12]} radius={0.01} smoothness={3} position={[0, 0.01, 0]} material={kitMaterial("plastic", tier)} />
      <mesh geometry={oval} scale={[BODY.a * K, 1, BODY.b * K]} position={[0, 0.02 + TOP / 2, 0]} material={kitMaterial("satin", tier, "#EFE3D6")} />
      <mesh geometry={plane} material={doseMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02 + TOP + 0.002, 0]} renderOrder={2} />
      {bands.map((b, i) => (
        <mesh
          key={i}
          ref={(m) => {
            bandRefs.current[i] = m;
          }}
          geometry={bandGeo}
          material={bandMats[i]}
          renderOrder={3}
        />
      ))}
      <Cluster count={() => 26} color={LAB.robotics.gold} radius={TUMOUR_R * K * 1.1} position={[0, 0.02 + TOP + 0.02, 0]} />
      {/* The treatment head: a white housing with a dark collimator facing the slice. */}
      <group ref={head}>
        <RoundedBox args={[0.07, 0.06, 0.05]} radius={0.015} smoothness={3} material={kitMaterial("plastic", tier)} />
        <mesh position={[0, 0, 0.027]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("black", tier)}>
          <cylinderGeometry args={[0.018, 0.018, 0.008, 24]} />
        </mesh>
      </group>
    </group>
  );
}

export function BeamsStage3D() {
  const tall = useThree((s) => s.size.width < s.size.height);
  const AT = tall ? GRID : ROW;
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const settings = beamSettings(def, build);
  const { beams: n, gap } = settings;
  const plans = useMemo(() => PLANS.map((p) => planBeams(p, { beams: n, gap })), [n, gap]);
  const ring = useRef<Group>(null);
  const best = sv.outcome ? PLANS[sv.outcome.readings.best] : null;

  useEffect(() => {
    // The spread plan shows the answer. The guess's own label and Ano wait at the back, clear of the trays and the side cards.
    setAnchor("focus", new Vector3(AT.angles[0], 0.1, AT.angles[1]));
    setAnchor("ghost", new Vector3(0, 0.45, -0.75));
    setAnchor("ano", tall ? new Vector3(0.98, 0.1, 0.35) : new Vector3(-0.56, 0.12, -0.5));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("ano");
    };
  }, [AT, tall]);

  // The best plan's gold ring appears only once the run is over: the simulator has judged.
  useFrame(() => {
    if (ring.current) ring.current.visible = best !== null && sv.t() >= RUN_SECONDS - 0.05;
  });

  const pct = (v: number | undefined) => `${Math.round(v ?? 0)}%`;
  const ghostEnd = sv.ghost?.readings;
  const realEnd = sv.outcome?.readings;
  const differs = (p: PlanId) => GHOST_PLANS.includes(p) && !!ghostEnd && !!realEnd && (Math.abs(ghostEnd[`${p}.target`] - realEnd[`${p}.target`]) > 5 || Math.abs(ghostEnd[`${p}.healthy`] - realEnd[`${p}.healthy`]) > 5);

  return (
    <group>
      {PLANS.map((p, i) => (
        <PlanSlice key={p} plan={p} beams={plans[i]} at={AT[p]} />
      ))}
      {PLANS.map((p) => (
        <Readout key={p} text={() => `${NAME[p]}\nTumour ${pct(snap.now[`${p}.target`])} · Healthy ${pct(snap.now[`${p}.healthy`])}`} height={0.058} position={[AT[p][0], 0.05, AT[p][1] + LABEL_Z]} />
      ))}
      {PLANS.filter(differs).map((p) => (
        <Readout key={`g-${p}`} style="ghost" text={() => `Your idea\nTumour ${pct(snap.ghost?.[`${p}.target`])} · Healthy ${pct(snap.ghost?.[`${p}.healthy`])}`} height={0.054} position={[AT[p][0], 0.05, AT[p][1] + LABEL_Z + 0.2]} />
      ))}
      <Readout text={() => `Same total strength in every plan\nEach weaker beam: ${Math.round(100 / n)}% of it`} style="screen" height={0.05} position={[0, 0.06, tall ? -0.66 : -0.46]} />
      <group ref={ring} visible={false}>
        {best && (
          <group position={[AT[best][0], 0.03, AT[best][1]]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.78, 1]}>
              <torusGeometry args={[0.28, 0.008, 12, 96]} />
              <meshBasicMaterial color={LAB.robotics.gold} toneMapped={false} />
            </mesh>
            <Readout text={() => "Best plan"} style="screen" height={0.04} position={[0.3, 0.08, -0.2]} />
          </group>
        )}
      </group>
    </group>
  );
}
