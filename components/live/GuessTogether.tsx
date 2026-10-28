"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import QRCode from "qrcode";
import { IconClose, IconLevels } from "@/components/icons/icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import type { ExperimentDef } from "@/engine/types";
import { roomAnswer } from "@/lib/live-class";
import { useRoom } from "./useRoom";
import { VoteBars } from "./VoteBars";

/*
 * "Guess together" (CLAUDE.md §D): the host opens a room for this
 * experiment and the class joins on phones with the 4-letter code or the QR
 * code. Live bars show the split; "Show the answer on phones" reveals what
 * the simulator says really happens. The teacher view has the class
 * results. The host's key stays in this tab only.
 */

type Open = { code: string; hostKey: string } | { error: string } | null;

const ERRORS: Record<number, string> = {
  503: "Guessing together needs the class server, and it isn't set up on this site yet.",
  429: "This network has opened a lot of rooms. Try again in a little while.",
};

export function GuessTogether({ def }: { def: ExperimentDef }) {
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<Open>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [host, setHost] = useState("");
  const code = room && "code" in room ? room.code : null;
  const live = useRoom(open ? code : null);
  const options = def.prediction.type === "choice" ? def.prediction.options : [];

  async function start() {
    setOpen(true);
    setHost(window.location.host);
    if (code) return;
    try {
      const res = await fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ experimentId: def.id }) });
      setRoom(res.ok ? ((await res.json()) as Open) : { error: ERRORS[res.status] ?? "Something went wrong opening the room. Try again." });
    } catch {
      setRoom({ error: "Something went wrong opening the room. Try again." });
    }
  }

  useEffect(() => {
    if (!code) return;
    QRCode.toString(`${window.location.origin}/join/${code}`, { type: "svg", margin: 1, color: { dark: "#121212", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [code]);

  async function reveal() {
    if (!room || !("hostKey" in room)) return;
    const res = await fetch(`/api/live/${room.code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reveal: room.hostKey }) }).catch(() => null);
    if (res?.ok) setRevealed(true);
  }

  if (options.length === 0) return null;
  const counts = live.room?.counts ?? options.map(() => 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const shown = revealed || live.room?.phase === "revealed";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Button variant="ghost" onClick={start}>
        <IconLevels aria-hidden className="size-4" />
        Guess together
      </Button>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-80 bg-ink-900/25 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-80 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-sheet bg-white text-ink-900 shadow-warm-lg outline-none data-[state=closed]:animate-sheet-out-up data-[state=open]:animate-sheet-in-up md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[34rem] md:rounded-sheet md:data-[state=closed]:animate-sheet-out-right md:data-[state=open]:animate-sheet-in-right">
          <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
            <div>
              <p className="type-label text-apricot-700">Guess together</p>
              <Dialog.Title className="type-heading mt-1.5 text-[1.75rem] leading-[1.05]">{def.title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close guess together">
                <IconClose />
              </IconButton>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Everyone guesses on their phone, then the simulator shows what really happens.</Dialog.Description>
          <div className="flex flex-col gap-6 overflow-y-auto px-6 pb-8">
            {room && "error" in room ? (
              <p className="text-[15px] leading-relaxed text-ink-700">{room.error}</p>
            ) : !code ? (
              <p className="text-[15px] text-ink-500">Opening a room…</p>
            ) : (
              <>
                <div className="flex items-center gap-5">
                  {qr ? <div aria-label={`QR code to join room ${code}`} role="img" className="size-36 shrink-0 overflow-hidden rounded-tile border border-ink-900/10 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} /> : <div className="size-36 shrink-0 rounded-tile bg-ink-900/[0.05]" />}
                  <div className="flex flex-col gap-1">
                    <p className="text-[15px] leading-snug text-ink-700">On a phone, scan the code or go to</p>
                    <p className="type-readout break-all text-[15px] text-ink-900">{host}/join/{code}</p>
                    <p data-room-code className="type-heading mt-2 text-[2.75rem] leading-none tracking-[0.12em]">{code}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="type-label text-ink-500">{def.prediction.question}</p>
                  <VoteBars options={options} counts={counts} answer={shown ? roomAnswer(def) : null} />
                  <p className="text-[14px] text-ink-500">
                    {total} {total === 1 ? "guess" : "guesses"} so far
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {shown ? <p className="text-[15px] text-ink-700">Phones now show what really happens. Run it here to see why.</p> : <Button onClick={reveal} disabled={total === 0}>Show the answer on phones</Button>}
                  <Button variant="secondary" href={`/teacher/${code}`} target="_blank" rel="noopener">
                    Teacher view
                  </Button>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
