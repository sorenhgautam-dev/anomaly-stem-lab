"use client";

import { useState } from "react";
import { IconPause, IconPlay, IconRestart } from "@/components/icons/icons";
import { theoryFor } from "@/lib/content";
import { BreadcrumbBar } from "@/components/ui/BreadcrumbBar";
import { Button } from "@/components/ui/Button";
import { CarouselControls } from "@/components/ui/CarouselControls";
import { Chip, ConfidenceChip, StatusDot } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { PredictionChoices } from "@/components/ui/PredictionChoices";
import { Slider } from "@/components/ui/Slider";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { TheorySheet } from "@/components/ui/TheorySheet";
import { toast } from "@/components/ui/Toast";
import { SegmentedToggle, Switch } from "@/components/ui/Toggle";
import { useVoice } from "@/lib/voice";
import { Section } from "./Section";

/* Buttons, chips and every interactive control, working (DESIGN.md §5). */

export function ControlsDemo() {
  const [slide, setSlide] = useState(0);
  const [chem, setChem] = useState<string | null>("Stays the same");
  const [robo, setRobo] = useState<string | null>(null);
  const [soda, setSoda] = useState(5);
  const [bag, setBag] = useState<"open" | "sealed">("open");
  const [theory, setTheory] = useState(false);
  const voice = useVoice((s) => s.enabled);
  const setVoice = useVoice((s) => s.setEnabled);

  return (
    <>
      <Section id="buttons" title="Buttons" note="Hover for the sheen and lift, press to squash, release for the ripple. The hit area never moves.">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xl">Start experimenting</Button>
          <Button size="lg" icon={<IconPlay className="size-4" />}>
            Next experiment
          </Button>
          <Button variant="secondary" size="lg">
            See the theory
          </Button>
          <Button variant="secondary">Back to map</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <IconButton label="Play">
            <IconPlay />
          </IconButton>
          <IconButton label="Pause">
            <IconPause />
          </IconButton>
          <IconButton label="Restart" tone="dark">
            <IconRestart />
          </IconButton>
        </div>
      </Section>

      <Section id="chips" title="Chips">
        <div className="flex flex-wrap items-center gap-2.5">
          <ConfidenceChip level="High" />
          <ConfidenceChip level="Medium" />
          <ConfidenceChip level="Low" />
          <Chip tone="chem">Chemistry</Chip>
          <Chip tone="robo">Robotics</Chip>
          <Chip tone="dark">Grades 9–10</Chip>
          <Chip>3 min</Chip>
          <StatusDot status="verified" />
          <StatusDot status="anomaly" />
        </div>
      </Section>

      <Section id="controls" title="Controls">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Carousel controls · slide {slide + 1}</p>
            <CarouselControls count={3} index={slide} onSelect={setSlide} label="Featured anomaly" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Breadcrumb bar</p>
            <BreadcrumbBar
              items={[
                { label: "Easy", href: "/start" },
                { label: "Chemistry", href: "/start/easy" },
                { label: "Mass in a sealed bag", href: "/labs/chemistry/easy/chemistry-sealed-bag", current: true },
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Prediction choices · Chemistry</p>
            <PredictionChoices lab="chemistry" question="When the fizzing stops, everything on the scale…" options={["Gets heavier", "Stays the same", "Gets lighter"]} value={chem} onChange={setChem} />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Prediction choices · Robotics</p>
            <PredictionChoices lab="robotics" question="When you press Run, the LED will…" options={["Glow", "Stay dark", "Burn out"]} value={robo} onChange={setRobo} />
          </div>
          <Slider label="Baking soda" value={soda} min={2} max={10} step={1} unit="g" onChange={setSoda} tint="chem" />
          <div className="flex flex-wrap items-center gap-4">
            <SegmentedToggle
              label="Bag"
              value={bag}
              onChange={setBag}
              options={[
                { value: "open", label: "Open" },
                { value: "sealed", label: "Sealed" },
              ]}
            />
            <Switch label="Ano's voice" checked={voice} onChange={setVoice} />
          </div>
        </div>
      </Section>

      <Section id="ano-ui" title="Speech bubble, theory sheet, toast">
        <div className="grid gap-8 lg:grid-cols-2">
          <SpeechBubble text="Ooh, a lot of scientists thought that too! What do you think happens to the gas when the bag is sealed?" />
          <div className="flex flex-wrap items-start gap-3">
            <Button variant="secondary" onClick={() => setTheory(true)}>
              Open the theory sheet
            </Button>
            <Button variant="secondary" onClick={() => toast("Progress saved on this device")}>
              Show a toast
            </Button>
          </div>
        </div>
        <TheorySheet
          theory={theoryFor("conservation-of-mass")}
          open={theory}
          onOpenChange={setTheory}
          whatHappened="The bag was open, so the carbon dioxide drifted out and the scale read 2.6 g less."
        />
      </Section>
    </>
  );
}
