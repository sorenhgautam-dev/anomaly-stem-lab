import { notFound } from "next/navigation";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { JoinRoom } from "@/components/live/JoinRoom";
import { Frame } from "@/components/ui/Frame";

export const metadata = { title: "Guess with the room · ANOMALY" };

const CODE = /^[A-HJ-NP-Z]{4}$/;

// A phone joining "Guess with the room" (CLAUDE.md §D): one guess, then the reveal.
export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const code = (await params).code.toUpperCase();
  if (!CODE.test(code)) notFound();
  return (
    <Frame tint="sage">
      <ExploreBar />
      <main className="relative mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8 md:pt-12">
        <JoinRoom code={code} />
      </main>
    </Frame>
  );
}
