import { notFound } from "next/navigation";
import { AnoDemo } from "@/components/design-system/AnoDemo";
import { CardsDemo } from "@/components/design-system/CardsDemo";
import { ControlsDemo } from "@/components/design-system/ControlsDemo";
import { PatternsDemo } from "@/components/design-system/PatternsDemo";
import { Swatches } from "@/components/design-system/Swatches";
import { IconsDemo } from "@/components/design-system/IconsDemo";
import { FontComparison, TypeScale } from "@/components/design-system/Typography";

export const metadata = { title: "Design system · ANOMALY", robots: { index: false, follow: false } };

/*
 * Every token and component of the Bright Lab redesign (DESIGN.md) on one
 * page, for the team. Dev only: it 404s in production unless the build sets
 * ANOMALY_DESIGN_SYSTEM=1 (the gauntlet's test build does).
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development" && process.env.ANOMALY_DESIGN_SYSTEM !== "1") notFound();
  return (
    <main className="flex flex-col bg-cream-50 text-ink-900">
      <PatternsDemo />
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8">
        <header className="py-14">
          <h1 className="type-hero mt-3 text-[clamp(3.5rem,9vw,8rem)]">Design system</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-700">Tokens and components from DESIGN.md. Everything here is a Tailwind class or a component in components/ui.</p>
        </header>
        <AnoDemo />
        <FontComparison />
        <TypeScale />
        <Swatches />
        <IconsDemo />
        <ControlsDemo />
        <CardsDemo />
      </div>
    </main>
  );
}
