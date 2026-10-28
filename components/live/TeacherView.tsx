"use client";

import { PaperCard } from "@/components/ui/PaperCard";
import { getExperiment } from "@/lib/content";
import { classSummary } from "@/lib/live-class";
import { LiveOff } from "./LiveOff";
import { useRoom } from "./useRoom";
import { VoteBars } from "./VoteBars";

/*
 * The teacher view (CLAUDE.md §D): how many guessed each option, the share
 * who guessed wrong, the most common wrong idea in plain words and two
 * sentences on what the class needs next. Real counts only, nothing
 * personal: the room only ever stores a number per option.
 */

export function TeacherView({ code }: { code: string }) {
  const { room, status } = useRoom(code);
  const def = room ? getExperiment(room.experimentId) : undefined;
  if (status === "missing") return <Plain title="No room with that code">{"Rooms close after three hours. Open a new one from any experiment with Guess together."}</Plain>;
  if (status === "off") return <LiveOff />;
  if (!room || !def || def.prediction.type !== "choice") return <Plain title={`Room ${code}`}>Loading the class results…</Plain>;

  const s = classSummary(def, room.counts);
  const revealed = room.phase === "revealed";
  return (
    <div className="flex flex-col gap-6">
      <PaperCard className="flex flex-col gap-4 p-5 sm:p-7">
        <p className="type-label text-ink-500">Room {code} · {revealed ? "answer shown" : "still guessing"}</p>
        <h1 className="type-heading text-[1.9rem] leading-tight">{def.title}</h1>
        <p className="text-[16px] text-ink-700">{def.prediction.question}</p>
        <VoteBars options={def.prediction.options} counts={room.counts} answer={s.answer} />
      </PaperCard>
      <div className="grid gap-6 md:grid-cols-2">
        <PaperCard className="flex flex-col gap-2 p-5 sm:p-7" data-class-total={s.total}>
          <p className="type-label text-ink-500">The class</p>
          <p className="text-[1.15rem] font-semibold">{s.total === 0 ? "No guesses yet." : `${s.wrong} of ${s.total} guessed something else (${Math.round((s.wrong / s.total) * 100)}%).`}</p>
          {s.commonWrong && (
            <p className="text-[16px] leading-relaxed text-ink-700">
              Most common other guess: &ldquo;{s.commonWrong.option}&rdquo; ({s.commonWrong.count}).
              {s.commonWrong.idea && ` The idea behind it: ${s.commonWrong.idea}`}
            </p>
          )}
        </PaperCard>
        <PaperCard className="flex flex-col gap-2 p-5 sm:p-7">
          <p className="type-label text-ink-500">What the class needs next</p>
          {s.next ? s.next.map((line) => <p key={line} className="text-[16px] leading-relaxed text-ink-700">{line}</p>) : <p className="text-[16px] text-ink-700">Once guesses come in, this suggests where to start.</p>}
        </PaperCard>
      </div>
    </div>
  );
}

function Plain({ title, children }: { title: string; children: string }) {
  return (
    <PaperCard className="flex flex-col gap-2 p-5 sm:p-7">
      <h1 className="type-heading text-[1.6rem] leading-tight">{title}</h1>
      <p className="text-[16px] text-ink-700">{children}</p>
    </PaperCard>
  );
}
