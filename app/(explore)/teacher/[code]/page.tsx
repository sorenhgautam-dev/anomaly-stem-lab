import { notFound } from "next/navigation";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { TeacherView } from "@/components/live/TeacherView";
import { Frame } from "@/components/ui/Frame";

export const metadata = { title: "Class results · ANOMALY" };

const CODE = /^[A-HJ-NP-Z]{4}$/;

// The teacher view for one "Guess with the room" room (CLAUDE.md §D): real counts, no names.
export default async function TeacherPage({ params }: PageProps<"/teacher/[code]">) {
  const code = (await params).code.toUpperCase();
  if (!CODE.test(code)) notFound();
  return (
    <Frame tint="sage">
      <ExploreBar />
      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8 md:pt-12">
        <TeacherView code={code} />
      </main>
    </Frame>
  );
}
