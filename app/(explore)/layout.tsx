import { ViewTransition } from "react";
import { NavDirection } from "@/components/explore/NavDirection";
import { ProgressHydrator } from "@/components/explore/ProgressHydrator";

// Shared shell for level → lab → map → experiment (CLAUDE.md §1.1). Each page
// draws its own frame and top bar (components/explore/ExploreBar). It clips
// sideways overflow (clip, not hidden, so sticky and fixed parts still work):
// nothing here may scroll the page sideways (DESIGN.md §10).
export default function ExploreLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-x-clip bg-cream-50">
      <ProgressHydrator />
      <NavDirection />
      {/* Route changes wipe across a solid colour block instead of cutting (DESIGN.md §9; app/globals.css). */}
      <ViewTransition default="colour-wipe">
        <div className="relative flex flex-1 flex-col">{children}</div>
      </ViewTransition>
    </div>
  );
}
