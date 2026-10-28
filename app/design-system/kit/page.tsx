import { notFound } from "next/navigation";
import { KitGallery } from "@/components/design-system/KitGallery";

export const metadata = { title: "3D kit · ANOMALY", robots: { index: false, follow: false } };

/*
 * The 3D apparatus kit and Ano at close range (DESIGN.md §8.2), for judging
 * model quality. Dev only, like /design-system: it 404s in production unless
 * the build sets ANOMALY_DESIGN_SYSTEM=1.
 */
export default function KitPage() {
  if (process.env.NODE_ENV !== "development" && process.env.ANOMALY_DESIGN_SYSTEM !== "1") notFound();
  return (
    <main className="mx-auto w-full max-w-7xl bg-cream-50 px-4 py-14 text-ink-900 sm:px-8">
      <h1 className="type-hero text-[clamp(3rem,8vw,6rem)]">3D kit</h1>
      <p className="mb-10 mt-3 max-w-2xl text-lg text-ink-700">Every model at close range, on its lab&apos;s wall and under its lab&apos;s light.</p>
      <KitGallery />
    </main>
  );
}
