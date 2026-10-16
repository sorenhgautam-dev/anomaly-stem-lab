"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import type { LabId, MisconceptionDef } from "@/engine/types";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";

/*
 * The misconception map (CLAUDE.md §8 step 8, §11): every belief the labs can
 * diagnose, grouped around the ideas they're about. It updates from saved
 * progress: beliefs Ano has spotted glow, ones seen twice are "likely", and
 * beliefs the student has broken (a correct run after a diagnosed wrong one)
 * shatter into gold.
 */

export interface MapBelief extends MisconceptionDef {
  /** Experiments that can diagnose this belief: [title, href]. */
  tests: { title: string; href: string }[];
}

type BeliefState = "unseen" | "spotted" | "likely" | "broken";

type BeliefData = { belief: MapBelief; state: BeliefState; selected: boolean };
type ConceptData = { label: string };

const GROUP_W = 380;
const GROUP_H = 330;

function pretty(concept: string): string {
  return concept.replace(/-/g, " ");
}

/** One lab's beliefs, grouped around the concept they're mostly about. */
function layout(beliefs: MapBelief[], states: Record<string, BeliefState>, selected: string | null) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const groups = new Map<string, MapBelief[]>();
  for (const b of beliefs) {
    const key = b.conceptIds[0] ?? "other";
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  [...groups.entries()].forEach(([concept, members], gi) => {
    const cx = (gi % 3) * GROUP_W;
    const cy = Math.floor(gi / 3) * GROUP_H;
    const hub = `concept-${concept}`;
    nodes.push({ id: hub, type: "concept", position: { x: cx, y: cy }, data: { label: pretty(concept) } satisfies ConceptData });
    members.forEach((b, i) => {
      const spread = members.length === 1 ? 0 : (i - (members.length - 1) / 2) * 1.3;
      const angle = Math.PI / 2 + spread;
      nodes.push({
        id: b.id,
        type: "belief",
        position: { x: cx + Math.cos(angle) * 150 - 80, y: cy + Math.sin(angle) * 105 },
        data: { belief: b, state: states[b.id] ?? "unseen", selected: selected === b.id } satisfies BeliefData,
      });
      edges.push({ id: `${hub}->${b.id}`, source: hub, target: b.id, style: { stroke: "rgba(237,235,255,0.2)" } });
    });
  });
  // Secondary concepts link beliefs across groups.
  for (const b of beliefs) {
    for (const concept of b.conceptIds.slice(1)) {
      const hub = `concept-${concept}`;
      if (nodes.some((n) => n.id === hub)) {
        edges.push({ id: `${hub}~>${b.id}`, source: hub, target: b.id, style: { stroke: "rgba(184,166,255,0.22)", strokeDasharray: "4 6" } });
      }
    }
  }
  return { nodes, edges };
}

const STATE_LABEL: Record<BeliefState, string> = {
  unseen: "Not seen yet",
  spotted: "Ano spotted it",
  likely: "Likely yours",
  broken: "Broken",
};

const SHARDS = [
  "polygon(0 0, 50% 0, 30% 45%)",
  "polygon(50% 0, 100% 0, 75% 40%)",
  "polygon(100% 0, 100% 55%, 70% 35%)",
  "polygon(0 0, 30% 45%, 0 60%)",
  "polygon(30% 45%, 75% 40%, 50% 100%)",
  "polygon(0 60%, 30% 45%, 25% 100%, 0 100%)",
  "polygon(75% 40%, 100% 55%, 100% 100%, 50% 100%)",
];

function BeliefNode({ data }: NodeProps<Node<BeliefData>>) {
  const { belief, state, selected } = data;
  return (
    <div
      className={cn(
        "relative w-[170px] rounded-2xl border px-3.5 py-3 text-left transition-colors duration-300",
        state === "unseen" && "border-pearl/12 bg-void/80 text-pearl/50",
        state === "spotted" && "border-lilac/60 bg-lilac/10 text-pearl shadow-[0_0_24px_rgba(184,166,255,0.35)]",
        state === "likely" && "border-anomaly/70 bg-anomaly/10 text-pearl shadow-[0_0_24px_rgba(255,59,92,0.3)]",
        state === "broken" && "border-resolve/70 bg-resolve/10 text-pearl",
        selected && "ring-2 ring-signal",
      )}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <p className="text-[14px] leading-snug">{belief.title}</p>
      <p className={cn("type-label mt-2", state === "broken" ? "text-resolve" : state === "likely" ? "text-anomaly" : state === "spotted" ? "text-lilac" : "text-pearl/35")}>
        {STATE_LABEL[state]}
      </p>
      {state === "broken" && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {SHARDS.map((clip, i) => (
            <span
              key={i}
              className="shard absolute inset-0 rounded-2xl bg-resolve/40"
              style={{ clipPath: clip, ["--dx" as string]: `${(i - 3) * 14}px`, ["--dy" as string]: `${(i % 3) * 10 - 12}px`, ["--rot" as string]: `${(i - 3) * 9}deg` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConceptNode({ data }: NodeProps<Node<ConceptData>>) {
  return (
    <div className="type-label flex items-center gap-2 rounded-full border border-pearl/15 bg-void/90 px-3 py-2 text-pearl/70">
      <span className="size-1.5 rounded-full bg-signal" />
      {data.label}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

const NODE_TYPES = { belief: BeliefNode, concept: ConceptNode };

export function MisconceptionMap({ beliefs }: { beliefs: MapBelief[] }) {
  const hydrated = useProgress((s) => s.hydrated);
  const evidence = useProgress((s) => s.evidence);
  const broken = useProgress((s) => s.broken);
  const [selected, setSelected] = useState<string | null>(null);
  const [chosenLab, setChosenLab] = useState<LabId | null>(null);

  const states = useMemo(() => {
    const out: Record<string, BeliefState> = {};
    for (const b of beliefs) {
      out[b.id] = broken[b.id] ? "broken" : (evidence[b.id] ?? 0) >= 2 ? "likely" : (evidence[b.id] ?? 0) >= 1 ? "spotted" : "unseen";
    }
    return out;
  }, [beliefs, evidence, broken]);

  // Open on the lab with the most going on, unless the student picked one.
  const busiest: LabId =
    beliefs.filter((b) => b.lab === "chemistry" && states[b.id] !== "unseen").length >
    beliefs.filter((b) => b.lab === "robotics" && states[b.id] !== "unseen").length
      ? "chemistry"
      : "robotics";
  const lab = chosenLab ?? busiest;
  const shown = useMemo(() => beliefs.filter((b) => b.lab === lab), [beliefs, lab]);
  const { nodes, edges } = useMemo(() => layout(shown, states, selected), [shown, states, selected]);
  const chosen = beliefs.find((b) => b.id === selected);
  const counts = Object.values(states).reduce(
    (acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }),
    {} as Partial<Record<BeliefState, number>>,
  );

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3" aria-live="polite">
        <div className="flex gap-1 rounded-full bg-pearl/8 p-1" role="tablist" aria-label="Lab">
          {(["robotics", "chemistry"] as LabId[]).map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lab === l}
              onClick={() => {
                setChosenLab(l);
                setSelected(null);
              }}
              className={cn("rounded-full px-4 py-2 text-[14px] transition-colors", lab === l ? "bg-pearl text-void" : "text-pearl/70 hover:text-pearl")}
            >
              {l === "robotics" ? "Robotics" : "Chemistry"}
            </button>
          ))}
        </div>
        {hydrated &&
          (["broken", "likely", "spotted", "unseen"] as BeliefState[]).map((s) => (
            <span key={s} className="type-label text-pearl/55">
              {counts[s] ?? 0} {STATE_LABEL[s].toLowerCase()}
            </span>
          ))}
      </div>
      <div className="relative h-[68vh] min-h-[28rem] overflow-hidden rounded-[26px] border border-pearl/8 bg-pearl/[0.02]">
        <ReactFlow
          key={lab}
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          colorMode="dark"
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.35}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => setSelected(node.type === "belief" ? node.id : null)}
          onPaneClick={() => setSelected(null)}
          style={{ background: "transparent" }}
        >
          <Background color="rgba(237,235,255,0.08)" gap={28} />
          <Controls showInteractive={false} className="!border-pearl/15 !bg-void/80" />
        </ReactFlow>
        {chosen && (
          <aside className="glass absolute bottom-4 left-4 right-4 z-10 rounded-[20px] p-5 sm:left-auto sm:w-96" aria-live="polite">
            <p className="type-label text-lilac">{chosen.title}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-pearl">&ldquo;{chosen.belief}&rdquo;</p>
            {chosen.tests.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {chosen.tests.map((t) => (
                  <Link key={t.href} href={t.href} className="type-label rounded-full bg-pearl px-3.5 py-2.5 text-void">
                    Test it: {t.title}
                  </Link>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
