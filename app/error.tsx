"use client";

import { IconHome, IconRestart } from "@/components/icons/icons";
import { ShruggingAno } from "@/components/lost/ShruggingAno";
import { Button } from "@/components/ui/Button";
import { Frame } from "@/components/ui/Frame";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { SplitHeadline } from "@/components/ui/SplitHeadline";

/*
 * When a page fails to render (Next's error boundary): "SOMETHING · BROKE."
 * on sage paper with Ano shrugging in the gap, one plain line, and two ways
 * on: try again (re-renders the page) or go home. Nothing technical shows;
 * the error stays in the console for us.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Frame tint="sage">
      <main className="relative flex flex-1 flex-col px-4 pb-24 pt-16 sm:px-8 md:pt-24">
        <SplitHeadline left="Something" right="broke." gap={<ShruggingAno className="h-72 w-64 lg:h-96 lg:w-80" />} />
        <ShruggingAno className="mx-auto -mt-2 h-56 w-48 md:hidden" />
        <div className="mt-8 flex max-w-xl flex-col gap-5 md:mt-12">
          <SpeechBubble text="That wasn't the experiment, that was me. Give it another go, or let's head back to the lab." tail="top" />
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={reset}>
              <IconRestart aria-hidden className="size-4" />
              Try again
            </Button>
            <Button href="/" variant="secondary" size="lg">
              <IconHome aria-hidden className="size-4" />
              Back home
            </Button>
          </div>
        </div>
      </main>
    </Frame>
  );
}
