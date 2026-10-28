import { PaperCard } from "@/components/ui/PaperCard";

/*
 * What /join and /teacher show when live mode can't run on this site
 * (lib/live.ts liveAvailable: Vercel without Redis), instead of a room that
 * never opens.
 */
export function LiveOff() {
  return (
    <PaperCard className="flex flex-col gap-2 p-5 sm:p-7">
      <h1 className="type-heading text-[1.6rem] leading-tight">Live mode isn&rsquo;t available right now</h1>
      <p className="text-[16px] text-ink-700">You can still try every experiment on your own.</p>
    </PaperCard>
  );
}
