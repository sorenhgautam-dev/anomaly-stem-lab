import { ViewTransition } from "react";
import { Breadcrumbs } from "@/components/explore/Breadcrumbs";
import { ProgressHydrator } from "@/components/explore/ProgressHydrator";
import { LabRoomMount } from "@/components/labroom/LabRoomMount";

// Shared shell for level → lab → map → experiment (CLAUDE.md §1.1).
export default function ExploreLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-void">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,rgba(61,123,255,0.12),transparent_60%),radial-gradient(ellipse_60%_50%_at_0%_110%,rgba(184,166,255,0.08),transparent_60%)]"
      />
      <ProgressHydrator />
      <Breadcrumbs />
      {/*
        The 3D lab room sits outside (and under) the page transition, so it
        carries on through every route change in a lab while the HUD dissolves.
      */}
      <LabRoomMount />
      {/* Route changes dissolve instead of cutting (CLAUDE.md §3.4, §3.7). */}
      <ViewTransition default="screen-dissolve">
        <div className="relative flex flex-1 flex-col">{children}</div>
      </ViewTransition>
    </div>
  );
}
