"use client";

import { useEffect } from "react";
import { Vector3 } from "three";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Colony, Dish3D } from "../kit/bio/Dish3D";
import { Readout } from "../kit/chem/instruments";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { Graph3D } from "../kit/Graph3D";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Why chemo causes hair loss, in 3D (stage "chemo", engine/cancer/chemo.ts):
 * three dishes on the Treatment Lab's bench, side by side: cancer cells,
 * hair follicle cells and slow-dividing cells. When treatment runs, a gold
 * "Treatment on" light shows, and each dish's colony follows the simulator:
 * the busy dishes thin out and fade, the slow dish barely changes, and the
 * healthy dishes refill once treatment stops. A live graph tracks the hair
 * follicle cells. After a wrong guess a teal see-through colony in the hair
 * dish shows the student's idea beside what really happened. Calm, never
 * graphic: cells fade and shrink, they never burst.
 */

const DISH_R = 0.27;
const ROOM = 120;
const X = { cancer: -0.68, hair: 0, slow: 0.68 } as const;

export function chemoShots(): StageShots {
  // Pulled back so the three dishes sit in the middle third, clear of the side cards.
  const aim: [number, number, number] = [0, 0.28, -0.1];
  return {
    arrive: orbit(aim, 6.6, 42, 26),
    build: orbit(aim, 3.9, 30),
    predict: orbit(aim, 3.7, 28, 6),
    run: orbit([0, 0.26, -0.1], 3.6, 30, -4),
    reveal: orbit([0, 0.3, -0.1], 4.1, 28),
  };
}

const cellsFor = (pct: number | undefined) => ((pct ?? 100) / 100) * ROOM * 0.85;

export function ChemoStage3D() {
  const sv = useStageValues();
  const snap = useSnapshot(sv);

  useEffect(() => {
    // The hair follicle dish shows the answer; Ano stops short of it, between it and the slow dish.
    setAnchor("focus", new Vector3(X.hair, 0.12, 0.1));
    setAnchor("ghost", new Vector3(0.38, 0.6, -0.35));
    // In front of the dishes and low, so he points the hair dish out without covering a label.
    setAnchor("ano", new Vector3(0.36, 0.2, 0.62));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("ano");
    };
  }, []);

  const lost = (key: "cancer" | "hair" | "slow") => () => Math.max(0, 1 - (snap.now[key] ?? 100) / 100);
  const pct = (key: "cancer" | "hair" | "slow") => () => `${Math.round(snap.now[key] ?? 100)}%`;

  return (
    <group>
      {(["cancer", "hair", "slow"] as const).map((key) => (
        <Dish3D key={key} radius={DISH_R} position={[X[key], 0, 0]} gel={key === "cancer" ? "#E9E4EF" : "#E6EFE4"}>
          <Colony count={() => cellsFor(snap.now[key])} room={ROOM} radius={DISH_R - 0.04} color={key === "cancer" ? LAB.robotics.gold : key === "hair" ? LAB.robotics.teal : LAB.chemistry.sage} faded={lost(key)} />
          {key === "hair" && sv.ghost && <Colony count={() => cellsFor(snap.ghost?.hair)} room={ROOM} radius={DISH_R - 0.04} color={P.white} opacity={0.45} y={0.07} />}
        </Dish3D>
      ))}
      <Readout text={() => `Cancer cells\n${pct("cancer")()}`} height={0.085} position={[X.cancer, 0.34, 0]} />
      <Readout text={() => `Hair cells\n${pct("hair")()}`} height={0.085} position={[X.hair, 0.34, 0]} />
      <Readout text={() => `Slow cells\n${pct("slow")()}`} height={0.085} position={[X.slow, 0.34, 0]} />
      <Readout text={() => ((snap.now.chemo ?? 0) > 0.5 ? "Treatment on" : sv.outcome ? "Treatment off" : "Ready")} style="screen" height={0.06} position={[-0.35, 0.95, -0.75]} />
      <Graph3D value="hair" label="Hair follicle cells" unit="%" digits={0} width={0.58} position={[-0.35, 0.62, -0.75]} />
    </group>
  );
}
