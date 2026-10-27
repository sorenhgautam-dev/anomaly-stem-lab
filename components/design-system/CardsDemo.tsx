import { BookOpen, FlaskConical, Sparkles } from "lucide-react";
import { BeliefShiftCard } from "@/components/ui/BeliefShiftCard";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { InfoChipCard } from "@/components/ui/InfoChipCard";
import { ResultCard } from "@/components/ui/ResultCard";
import { Sunrise } from "@/components/ui/Sunrise";
import { Section } from "./Section";

/* Glass, result, belief shift and info chip cards (DESIGN.md §5). */

export function CardsDemo() {
  return (
    <Section id="cards" title="Cards" note="White glass over the Sunrise. Each card floats on its own phase.">
      <div className="relative overflow-hidden rounded-frame p-6 sm:p-10">
        <Sunrise />
        <div className="relative grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ResultCard float phase={0} title="Gravity in vacuum" confidence="High" prediction="Equal speed" reality="Verified" status="verified" action={<Button size="md" className="w-full">Try it</Button>} />
          <ResultCard float phase={2.3} title="Backwards LED" confidence="Medium" prediction="Lights up" reality="Anomaly" status="anomaly" />
          <ResultCard float phase={4.1} title="Sealed bag" confidence="Low" prediction="Gets lighter" reality="Not run yet" status={null} />
          <BeliefShiftCard float phase={1.2} title="Why heavier objects fall together" detail="Ano spotted the air resistance bias" tone="verified" statusLabel="Verified" href="/" />
          <BeliefShiftCard float phase={3.4} title="LEDs only work one way" detail="Current can only flow forward" tone="anomaly" statusLabel="Anomaly" href="/" />
          <BeliefShiftCard float phase={5.2} title="Mass doesn't vanish" detail="Gas can't escape a sealed bag" tone="challenged" statusLabel="Challenged" href="/" />
          <BeliefShiftCard title="Current gets used up" detail="Not tested yet" tone="untested" statusLabel="Not yet tested" />
          <GlassCard className="flex flex-col gap-2">
            <p className="type-heading text-lg">Plain glass card</p>
            <p className="text-sm text-ink-500">bg white/80, blur 24 px, border white/60, radius 20, warm shadow.</p>
          </GlassCard>
          <div className="flex flex-col items-start gap-3">
            <InfoChipCard icon={<Sparkles />} title="How it works" subtitle="Predict, run, see where it broke" href="/" />
            <InfoChipCard icon={<FlaskConical />} title="Chemistry lab" subtitle="Mix, heat and weigh" />
            <InfoChipCard icon={<BookOpen />} tint="robo" title="Robotics lab" subtitle="Circuits, robots and code" />
          </div>
        </div>
      </div>
    </Section>
  );
}
