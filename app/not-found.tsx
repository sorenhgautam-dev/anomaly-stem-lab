import { ViewTransition } from "react";
import { Home, Layers } from "lucide-react";
import { ShruggingAno } from "@/components/lost/ShruggingAno";
import { Button } from "@/components/ui/Button";
import { Frame } from "@/components/ui/Frame";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { SplitHeadline } from "@/components/ui/SplitHeadline";

export const metadata = { title: "Lost in space · ANOMALY" };

/*
 * 404 (DESIGN.md §7.8): "LOST · IN SPACE." with Ano shrugging in the gap
 * (below the headline on phones) and a black pill back home.
 */
export default function NotFound() {
  return (
    <ViewTransition default="sunrise-wipe">
      <Frame>
        <SiteHeader />
        <main className="relative flex flex-1 flex-col px-4 pb-24 pt-10 sm:px-8 md:pt-16">
          <SplitHeadline left="Lost" right="in space." gap={<ShruggingAno className="h-72 w-64 lg:h-96 lg:w-80" />} />
          <ShruggingAno className="mx-auto -mt-2 h-56 w-48 md:hidden" />
          <div className="mt-8 flex max-w-xl flex-col gap-5 md:mt-12">
            <SpeechBubble text="Hmm, this page isn't on any of my maps. Maybe it floated off. Let's head back to the lab." tail="top" />
            <div className="flex flex-wrap gap-3">
              <Button href="/" size="lg">
                <Home aria-hidden className="size-4" />
                Back home
              </Button>
              <Button href="/start" variant="secondary" size="lg">
                <Layers aria-hidden className="size-4" />
                Pick a level
              </Button>
            </div>
          </div>
        </main>
      </Frame>
    </ViewTransition>
  );
}
