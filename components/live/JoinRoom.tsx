"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { LearningNote } from "@/components/ui/LearningNote";
import { PaperCard } from "@/components/ui/PaperCard";
import { getExperiment } from "@/lib/content";
import { roomAnswer } from "@/lib/live-class";
import { LiveOff } from "./LiveOff";
import { useRoom, voterToken } from "./useRoom";

/*
 * A phone in "Guess with the room" (CLAUDE.md §D): the question and its
 * options, one tap to guess, then a wait for the big screen. When the host
 * reveals, the phone shows what the simulator says really happens and
 * whether this guess matched, in kind words. Nothing personal is asked for.
 */

export function JoinRoom({ code }: { code: string }) {
  const { room, status } = useRoom(code, 2000);
  const def = room ? getExperiment(room.experimentId) : undefined;
  const [fresh, setPicked] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // A guess made before a reload, read after hydration (the server has none).
  const saved = useSyncExternalStore(never, () => savedPick(code), () => null);
  const picked = fresh ?? saved;

  async function vote(option: string, index: number) {
    setSending(true);
    const res = await fetch(`/api/live/${code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vote: index, voter: voterToken(code) }) }).catch(() => null);
    setSending(false);
    if (!res?.ok || !((await res.json().catch(() => null)) as { ok?: boolean } | null)?.ok) return;
    setPicked(option);
    try {
      sessionStorage.setItem(`anomaly:live:${code}:pick`, option);
    } catch {
      // Remembering the guess is only a convenience.
    }
  }

  if (status === "missing") return <Note title="We couldn't find that room">{"Check the four letters on the big screen and try again."}</Note>;
  if (status === "off") return <LiveOff />;
  if (!room || !def || def.prediction.type !== "choice") return <Note title={`Room ${code}`}>Joining the room…</Note>;

  const options = def.prediction.options;
  const answer = room.phase === "revealed" ? roomAnswer(def) : null;
  return (
    <PaperCard className="flex flex-col gap-5 p-5 sm:p-7">
      <div>
        <p className="type-label text-ink-500">Room {code} · {def.title}</p>
        <h1 className="type-heading mt-2 text-[1.6rem] leading-tight">{def.prediction.question}</h1>
      </div>
      {answer ? (
        <div className="flex flex-col gap-3" data-live-result={picked === answer ? "right" : "wrong"}>
          <p className="type-label text-ink-500">What really happened</p>
          <p className="text-[1.25rem] font-semibold leading-snug text-verify-700">{answer}</p>
          <p className="text-[16px] leading-relaxed text-ink-700">{!picked ? "You didn't guess this time. Watch the big screen to see why." : picked === answer ? "You guessed it! That's how a scientist thinks." : `You guessed "${picked}". Lots of people think that. Watch the big screen to see why.`}</p>
        </div>
      ) : picked ? (
        <div className="flex flex-col gap-2">
          <p className="text-[1.15rem] font-semibold">Your guess is in.</p>
          <p className="text-[16px] text-ink-700">You picked &ldquo;{picked}&rdquo;. Now watch the big screen.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3" role="group" aria-label="Your guess">
          {options.map((option, i) => (
            <Button key={option} variant="secondary" size="lg" className="h-auto min-h-12 whitespace-normal py-3 text-left" disabled={sending} onClick={() => vote(option, i)}>
              {option}
            </Button>
          ))}
        </div>
      )}
      <LearningNote />
    </PaperCard>
  );
}

const never = () => () => {};

function savedPick(code: string): string | null {
  try {
    return sessionStorage.getItem(`anomaly:live:${code}:pick`);
  } catch {
    return null;
  }
}

function Note({ title, children }: { title: string; children: string }) {
  return (
    <PaperCard className="flex flex-col gap-2 p-5 sm:p-7">
      <h1 className="type-heading text-[1.6rem] leading-tight">{title}</h1>
      <p className="text-[16px] text-ink-700">{children}</p>
    </PaperCard>
  );
}
