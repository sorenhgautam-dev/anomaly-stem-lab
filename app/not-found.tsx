import { ViewTransition } from "react";
import { IconHome, IconLevels } from "@/components/icons/icons";
import { LostHeadline } from "@/components/lost/LostHeadline";
import { Button } from "@/components/ui/Button";
import { Frame } from "@/components/ui/Frame";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const metadata = { title: "Lost in space · ANOMALY" };

/*
 * 404 (DESIGN.md §7.8): "LOST · IN SPACE." with Ano shrugging in the gap
 * (beside his bubble on phones) and a black pill back home.
 */
export default function NotFound() {
  return (
    <ViewTransition enter="colour-wipe" exit="colour-wipe" default="none">
      <Frame tint="sage">
        <SiteHeader />
        <main className="relative flex flex-1 flex-col px-4 pb-24 pt-10 sm:px-8 md:pt-16">
          <LostHeadline />
          <div className="mt-8 flex max-w-xl flex-col gap-5 md:mt-10">
            <div className="flex flex-wrap gap-3">
              <Button href="/" size="lg">
                <IconHome aria-hidden className="size-4" />
                Back home
              </Button>
              <Button href="/start" variant="secondary" size="lg">
                <IconLevels aria-hidden className="size-4" />
                Pick a level
              </Button>
            </div>
          </div>
        </main>
      </Frame>
    </ViewTransition>
  );
}
