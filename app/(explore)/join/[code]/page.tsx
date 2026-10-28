import { notFound } from "next/navigation";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { JoinRoom } from "@/components/live/JoinRoom";
import { LiveOff } from "@/components/live/LiveOff";
import { Frame } from "@/components/ui/Frame";
import { liveAvailable } from "@/lib/live";

export const metadata = { title: "Guess with the room · ANOMALY" };

const CODE = /^[A-HJ-NP-Z]{4}$/;

// A phone joining "Guess with the room" (CLAUDE.md §D): one guess, then the reveal.
// Where live mode can't run, any code gets the kind note instead.
export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const code = (await params).code.toUpperCase();
  const live = liveAvailable();
  if (live && !CODE.test(code)) notFound();
  return (
    <Frame tint="sage">
      <ExploreBar />
      <main className="relative mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8 md:pt-12">
        {live ? <JoinRoom code={code} /> : <LiveOff />}
      </main>
    </Frame>
  );
}
