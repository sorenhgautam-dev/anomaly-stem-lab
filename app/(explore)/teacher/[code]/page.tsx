import { notFound } from "next/navigation";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { LiveOff } from "@/components/live/LiveOff";
import { TeacherView } from "@/components/live/TeacherView";
import { Frame } from "@/components/ui/Frame";
import { liveAvailable } from "@/lib/live";

export const metadata = { title: "Class results · ANOMALY" };

const CODE = /^[A-HJ-NP-Z]{4}$/;

// The teacher view for one "Guess with the room" room (CLAUDE.md §D): real counts, no names.
// Where live mode can't run, any code gets the kind note instead.
export default async function TeacherPage({ params }: PageProps<"/teacher/[code]">) {
  const code = (await params).code.toUpperCase();
  const live = liveAvailable();
  if (live && !CODE.test(code)) notFound();
  return (
    <Frame tint="sage">
      <ExploreBar />
      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8 md:pt-12">
        {live ? <TeacherView code={code} /> : <LiveOff />}
      </main>
    </Frame>
  );
}
